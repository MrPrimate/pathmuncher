/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import { clip } from "./ChoiceTiles.js";
import { Seasoning } from "./Seasoning.js";

/**
 * The choices an eidolon's items make (PF2e Companion Compendia), and what the eidolon would be with
 * other answers. Each choice is a ChoiceSet with a list of options on one of its items: its size,
 * attributes, attacks, boosts, Transcendence increase and evolution feats' damage types. A preview is
 * an unsaved copy of the eidolon with the answers made, which the system prepares as it would the
 * eidolon; applying writes the answers to the eidolon. Where a choice picks an item to grant (an
 * attribute boost), the granted item becomes the one picked.
 */
export class EidolonEditor {

  /** The sections choices are shown in, by the kind of item making them. */
  static SECTIONS = ["type", "attributes", "attacks", "boosts", "evolution", "abilities"];

  /** @param {Actor} actor  the eidolon */
  constructor(actor) {
    this.actor = actor;
    this.base = actor.toObject();
    // compendium items picked as grants, by uuid
    this.documents = new Map();
  }

  static #flags(item) {
    return item.flags?.[game.system.id] ?? item.flags?.pf2e ?? {};
  }

  static key(itemId, flag) {
    return `${itemId}:${flag}`;
  }

  /** The section an item's choices go in. */
  static section(item) {
    const slug = item.system?.slug ?? Seasoning.slug(item.name);
    if (item.type === "ancestry" || item.type === "heritage") return "type";
    if (item.type === "class") return "attributes";
    if (item.type === "weapon") return "attacks";
    if ((/^eidolon-(ability-boosts|transcendence)/).test(slug)) return "boosts";
    if ((/\(CC\)$/).test(item.name)) return "evolution";
    return "abilities";
  }

  /**
   * A ChoiceSet's answer in an item's source: on the rule (the system fills rulesSelections from it
   * as it prepares the item), or in the item's flags.
   */
  static #answer(item, rule) {
    return rule.selection ?? EidolonEditor.#flags(item).rulesSelections?.[rule.flag] ?? null;
  }

  /** The answers the eidolon has now, by key. */
  get current() {
    const answers = {};
    for (const item of this.base.items) {
      for (const rule of item.system?.rules ?? []) {
        if (rule.key !== "ChoiceSet" || !rule.flag) continue;
        const value = EidolonEditor.#answer(item, rule);
        if (value !== null) answers[EidolonEditor.key(item._id, rule.flag)] = value;
      }
    }
    return answers;
  }

  /** A choice's options' labels: their own, or the name of the item they grant. */
  async #label(choice) {
    if (choice.label) return game.i18n.localize(choice.label);
    if (typeof choice.value === "string" && choice.value.startsWith("Compendium.")) {
      return (await this.#document(choice.value))?.name ?? choice.value;
    }
    return String(choice.value);
  }

  async #document(uuid) {
    if (!this.documents.has(uuid)) this.documents.set(uuid, (await fromUuid(uuid))?.toObject() ?? null);
    return this.documents.get(uuid);
  }

  /** A choice's question: its prompt, or its flag in words where the prompt says nothing ("Make a selection."). */
  static #prompt(rule) {
    const generic = ["PF2E.UI.RuleElements.ChoiceSet.Prompt", undefined, null, ""];
    if (!generic.includes(rule.prompt)) return game.i18n.localize(rule.prompt);
    const words = rule.flag.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  /**
   * The choices on the eidolon's items with a list of options, in the order the items are on the actor:
   * { key, itemId, itemName, section, flag, prompt, options: [{ value, label }] }. Options are values,
   * which may be objects (the key attribute's array).
   */
  async choices() {
    const choices = [];
    for (const item of this.base.items) {
      for (const rule of item.system?.rules ?? []) {
        if (rule.key !== "ChoiceSet" || !rule.flag || !Array.isArray(rule.choices)) continue;
        const options = [];
        for (const choice of rule.choices) options.push({ value: choice.value, label: await this.#label(choice), predicate: choice.predicate ?? null });
        choices.push({
          key: EidolonEditor.key(item._id, rule.flag),
          itemId: item._id,
          itemName: item.name,
          section: EidolonEditor.section(item),
          flag: rule.flag,
          prompt: EidolonEditor.#prompt(rule),
          predicate: rule.predicate ?? null,
          options,
        });
      }
    }
    return choices;
  }

  /**
   * Makes an answer in the item's source: the rule's selection and flag, and for a picked item the
   * roll option the system notes it by ("boost-one:strength-boost"), which later choices' predicates read.
   */
  async #answerRule(item, rule, value) {
    rule.selection = value;
    foundry.utils.setProperty(item, `flags.${game.system.id}.rulesSelections.${rule.flag}`, value);
    if (typeof rule.rollOption !== "string" || typeof value !== "string" || !value.startsWith("Compendium.")) return;
    const picked = await this.#document(value);
    const [base] = rule.rollOption.split(":");
    if (picked) rule.rollOption = `${base}:${picked.system?.slug ?? Seasoning.slug(picked.name)}`;
  }

  /** The item a choice of item to grant granted (found by the grant's own flag) becomes the one picked. */
  async #regrant(source, item, flag, value) {
    const grant = (item.system.rules ?? []).find((r) => r.key === "GrantItem" && r.uuid === `{item|flags.system.rulesSelections.${flag}}`);
    const grantedId = grant?.flag ? EidolonEditor.#flags(item).itemGrants?.[grant.flag]?.id : null;
    const granted = grantedId ? source.items.find((i) => i._id === grantedId) : null;
    if (!granted || typeof value !== "string" || granted._stats?.compendiumSource === value) return;
    const document = await this.#document(value);
    if (!document) return;
    Object.assign(granted, { name: document.name, img: document.img, system: foundry.utils.deepClone(document.system) });
    granted._stats = { ...granted._stats, compendiumSource: value };
  }

  /** The source of the eidolon with the answers made, items granted by a choice becoming the ones picked. */
  async source(answers) {
    const source = foundry.utils.deepClone(this.base);
    for (const [key, value] of Object.entries(answers)) {
      const [itemId, flag] = key.split(":");
      const item = source.items.find((i) => i._id === itemId);
      const rule = item?.system?.rules?.find((r) => r.key === "ChoiceSet" && r.flag === flag);
      if (!rule) continue;
      await this.#answerRule(item, rule, value);
      await this.#regrant(source, item, flag, value);
    }
    return source;
  }

  /** An unsaved eidolon with the answers made, prepared by the system. */
  async preview(answers) {
    return new Actor.implementation(await this.source(answers));
  }

  /**
   * Whether a choice applies to the eidolon (its rule's predicate), and which of its options are
   * offered. Options are tested against the eidolon's roll options with only the choice's own item's
   * answers among those choices note: the module's boost features at each level use the same roll
   * options ("boost-one:..."), which the system only ever sees one level of at a time, as it asks.
   */
  static offered(choice, actor) {
    const own = (rule) => (typeof rule.rollOption === "string" ? rule.rollOption : null);
    const others = new Set();
    const mine = new Set();
    for (const item of actor.items) {
      for (const rule of item._source?.system?.rules ?? []) {
        if (rule.key !== "ChoiceSet" || !own(rule)) continue;
        (item.id === choice.itemId ? mine : others).add(own(rule));
      }
    }
    const options = new Set([...actor.getRollOptions().filter((o) => !others.has(o)), ...mine]);
    const passes = (predicate) => !predicate || new game.pf2e.Predicate(predicate).test(options);
    return {
      applies: passes(choice.predicate),
      options: choice.options.map((o) => ({ ...o, allowed: passes(o.predicate) })),
    };
  }

  /**
   * Writes the answers to the eidolon: each choice's rule and flag, and the items granted for them,
   * which become the items picked. Only what changed is written; flags and links between items stay.
   */
  async apply(answers) {
    const source = await this.source(answers);
    const updates = [];
    const replaced = [];
    for (const item of source.items) {
      const before = this.base.items.find((i) => i._id === item._id);
      if (!before) continue;
      if (before._stats?.compendiumSource !== item._stats?.compendiumSource) {
        // a granted item that is now another: replaced whole, but keeping its id and flags
        replaced.push({ _id: item._id, name: item.name, img: item.img, system: item.system });
        updates.push({ _id: item._id, "_stats.compendiumSource": item._stats.compendiumSource });
        continue;
      }
      if (JSON.stringify(before.system?.rules ?? []) === JSON.stringify(item.system?.rules ?? [])) continue;
      const update = { _id: item._id, "system.rules": item.system.rules };
      for (const rule of item.system.rules.filter((r) => r.key === "ChoiceSet" && r.flag)) {
        update[`flags.${game.system.id}.rulesSelections.${rule.flag}`] = rule.selection ?? null;
      }
      updates.push(update);
    }
    if (replaced.length > 0) await this.actor.updateEmbeddedDocuments("Item", replaced, { recursive: false, diff: false });
    if (updates.length > 0) await this.actor.updateEmbeddedDocuments("Item", updates);
    this.base = this.actor.toObject();
    return [...new Set([...replaced, ...updates].map((u) => u._id))];
  }

  static #signed(n) {
    return n >= 0 ? `+${n}` : `${n}`;
  }

  /** A strike as the stat block shows it: { label, modifier, damage }. */
  static async #strike(strike) {
    let damage;
    try {
      damage = String(await strike.damage?.({ getFormula: true }) ?? "");
    } catch {
      damage = "";
    }
    // a damage type a choice sets is applied when damage is rolled, so it is named here
    const alteration = strike.item?.rules?.find((r) => r.key === "DamageAlteration" && r.property === "damage-type");
    const type = alteration?.resolveValue?.(alteration.value);
    if (typeof type === "string" && type) damage = damage.replace(/\b(bludgeoning|piercing|slashing)\b/, type);
    return { label: strike.label, modifier: EidolonEditor.#signed(strike.totalModifier ?? 0), damage };
  }

  // the sizes a CreatureSize rule names, as the actor's sizes
  static #SIZES = { tiny: "tiny", small: "sm", medium: "med", large: "lg", huge: "huge", gargantuan: "grg" };

  /** The item that sets the eidolon's size outright (Hulking Size makes it Large), or null. */
  static sizeSetBy(actor) {
    const size = actor.system.traits.size.value;
    const sets = (rule) => rule.key === "CreatureSize" && typeof rule.value === "string" && (EidolonEditor.#SIZES[rule.value] ?? rule.value) === size;
    return actor.items.filter((i) => (i.system.rules ?? []).some(sets)).at(-1) ?? null;
  }

  /**
   * The eidolon's evolution feats, the summoner's feats that change it: { name, level, taken, description },
   * by the level the summoner took them at (from the summoner's own copy), else the feat's level.
   */
  static evolutionFeats(actor) {
    // the level the summoner took it at: noted on it as it was added (an evolution feat has no slot on the
    // summoner to say), or from the summoner's own copy
    const masterUuid = actor.flags?.pathmuncher?.master?.uuid;
    const master = masterUuid ? game.actors.find((a) => a.uuid === masterUuid) : null;
    const taken = (item, name) => item.flags?.pathmuncher?.takenAt
      ?? master?.items.find((i) => i.type === "feat" && i.slug === Seasoning.slug(name))?.system.level?.taken ?? null;
    return actor.items
      .filter((i) => (i._stats?.compendiumSource ?? "").includes("AC-Evolution-Feats") || i.name.includes("(CC)"))
      .map((i) => {
        const name = i.name.replace(/\s*\(CC\)/, "");
        return { name, level: i.system.level?.value ?? null, taken: taken(i, name), description: clip(i.system.description?.value, 600) };
      })
      .sort((a, b) => (a.taken ?? a.level ?? 0) - (b.taken ?? b.level ?? 0) || a.name.localeCompare(b.name));
  }

  /** The stat block's AC, saves, Hit Points and Speed. */
  static #defences(actor) {
    return {
      ac: actor.system.attributes.ac.value,
      saves: Object.entries(actor.saves ?? {}).map(([key, save]) => ({ key, label: save.label, value: EidolonEditor.#signed(save.mod) })),
      hp: actor.system.attributes.hp.max,
      speed: actor.system.movement?.speeds?.land?.value ?? actor.system.attributes.speed?.value ?? null,
    };
  }

  /** What the stat block shows of an eidolon (saved or a preview). */
  static async statBlock(actor) {
    const signed = EidolonEditor.#signed;
    const strikes = [];
    for (const strike of actor.system.actions ?? []) strikes.push(await EidolonEditor.#strike(strike));
    const size = actor.system.traits.size.value;
    const attributes = Object.entries(actor.system.abilities ?? {}).map(([key, value]) => ({
      key, label: game.i18n.localize(CONFIG.PF2E?.abilities?.[key] ?? key), value: signed(value.mod),
    }));
    const skills = Object.values(actor.skills ?? {}).filter((s) => s.rank > 0 && !s.lore)
      .map((s) => ({ label: s.label, value: signed(s.mod) }));
    return {
      name: actor.name,
      level: actor.level,
      size: game.i18n.localize(CONFIG.PF2E?.actorSizes?.[size] ?? size),
      sizeSetBy: EidolonEditor.sizeSetBy(actor)?.name ?? null,
      traits: (actor.system.traits.value ?? []).map((t) => game.i18n.localize(CONFIG.PF2E?.creatureTraits?.[t] ?? t)),
      perception: signed(actor.perception?.mod ?? 0),
      senses: (actor.system.perception?.senses ?? []).map((s) => s.label ?? s.type),
      skills,
      attributes,
      ...EidolonEditor.#defences(actor),
      strikes,
      feats: EidolonEditor.evolutionFeats(actor),
    };
  }

}
