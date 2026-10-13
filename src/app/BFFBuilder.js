/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */

import CONSTANTS from "../constants.js";
import logger from "../logger.js";
import utils from "../utils.js";
import { CompanionChoices } from "./CompanionChoices.js";
import { Seasoning } from "./Seasoning.js";

/**
 * BFFBuilder (Best Friends Forever Builder): a build's animal companions, eidolon and construct
 * companion, each a character of its own built from the PF2e Companion Compendia module
 * (pf2e-animal-companions). An animal companion's ancestry is its animal (Wolf), which grants the
 * module's Animal Companion class, and Mature, Nimble or Savage and Specialized are feats on it. An
 * eidolon's ancestry is its type (Angel Eidolon), which grants the Eidolon class, whose features come as
 * it levels; the summoner's evolution feats have versions for the eidolon. A construct companion's
 * ancestry is the module's Prototype Construct, which grants the Construct Companion class; the
 * module's versions of the inventor's feats advance it, and its innovation's modifications are feats on
 * it. The choices their items make that the build doesn't (an eidolon's size, attacks and boosts) are
 * answered as the system asks for them (CompanionChoices), as is the size some animals and constructs
 * ask for.
 *
 * A companion is linked to its master: flags.pathmuncher.companions on the master holds each
 * companion's actor by its key, and flags.pathmuncher.master on the companion points back. The next
 * import updates the same actor. A companion with no link yet goes to the actor the user picks
 * (options.resolveCompanionActor): a new character, or a character no other player owns.
 */
export class BFFBuilder {

  static MODULE = "pf2e-animal-companions";

  // the classes a character made for a companion has, so it can be offered for another
  static COMPANION_CLASSES = ["animal-companion", "construct-companion", "eidolon"];

  // the eidolon versions of the evolution feats not named "<summoner feat> (CC)"
  static EVOLUTION_FEATS = {
    "Eidolon's Retort": "Eidolon's Opportunity (CC)",
    "Eidolon's Trample": "Trample (CC)",
  };

  // the kinds of Pathbuilder feat that are never evolution feats, though one may share a name (a
  // centaur's Trample)
  static NOT_EVOLUTION_FEATS = ["Ancestry Feat", "Heritage", "Skill Feat", "General Feat"];

  // the inventor feats that advance a construct companion, and the module's feat for each; Megaton
  // Strike is the construct's only when it is the innovation
  static CONSTRUCT_FEATS = {
    "Advanced Construct Companion": "Advanced Construct (CC)",
    "Incredible Construct Companion": "Incredible Construct (CC)",
    "Paragon Companion": "Paragon Construct (CC)",
    "Megaton Strike": "Megaton Strike (CC)",
  };

  // Pathbuilder's names for the construct modifications the module names differently
  static CONSTRUCT_MODIFICATIONS = {
    "Amphibious Construction": "Amphibious Construct",
  };

  /** Whether a build has an eidolon: a summoner's, or one from Summoner Dedication. */
  static hasEidolon(source) {
    return [source.class, source.dualClass].includes("Summoner")
      || (source.feats ?? []).some(([name]) => name === "Summoner Dedication");
  }

  /**
   * Whether a build has a construct companion: a construct innovation's, or Prototype Companion's.
   * Pathbuilder's export has no pet for it, only the innovation, its modifications (inventorMods) and
   * the feats that advance it.
   */
  static hasConstruct(source) {
    return (source.specials ?? []).some((s) => String(s).trim() === "Construct Innovation")
      || (source.feats ?? []).some(([name]) => name === "Prototype Companion");
  }

  /** Whether the companion module is active, without which companions are not imported. */
  static get active() {
    return !!game.modules.get(BFFBuilder.MODULE)?.active;
  }

  /**
   * @param {object} options
   * @param {Pathmuncher} options.pathmuncher        the master's import, its build and compendiums
   * @param {Actor} options.master                   the actor imported into
   * @param {Function} [options.resolveCompanionActor]  asked for a companion with no actor linked:
   *   ({ master, pet, name, candidates }) => { create: true } | { actor } | null to leave it out.
   *   Without it a new character is made.
   * @param {Function} [options.reviewEidolon]  given the eidolon once it is built, to make its choices:
   *   ({ eidolon, guessed }) => whether they were made. Those it makes aren't listed as guessed.
   */
  constructor({ pathmuncher, master, resolveCompanionActor = null, reviewEidolon = null }) {
    this.pathmuncher = pathmuncher;
    this.master = master;
    this.resolveCompanionActor = resolveCompanionActor;
    this.reviewEidolon = reviewEidolon;
    // the pets made into companions, and what of them matched nothing
    this.imported = [];
    this.bad = [];
  }

  /**
   * The build's animal companions, each with its key (its type and place among the build's pets of
   * that type) and its ancestry: { pet, key, kind, ancestry: [pack, name] }.
   */
  get companions() {
    const counts = {};
    return (this.pathmuncher.source.pets ?? [])
      .filter((pet) => pet.type === "Animal Companion")
      .map((pet) => {
        counts[pet.type] = (counts[pet.type] ?? -1) + 1;
        return { pet, key: `${Seasoning.slug(pet.type)}-${counts[pet.type]}`, kind: "animal", ancestry: ["AC-Ancestries-and-Class", pet.animal] };
      });
  }

  /**
   * A summoner's eidolon, or Summoner Dedication's, as a companion: its type is the special the module
   * has an eidolon for.
   */
  async eidolon() {
    const source = this.pathmuncher.source;
    if (!BFFBuilder.hasEidolon(source)) return null;
    const index = await BFFBuilder.pack("AC-Eidolons")?.getIndex() ?? [];
    // an elemental's element is in its name ("Elemental Eidolon (Air)"), where the module has one for all
    const named = (source.specials ?? []).map((s) => String(s).trim())
      .flatMap((s) => [[s, null], [s.replace(/\s*\(([^)]*)\)$/, ""), s.match(/\(([^)]*)\)$/)?.[1]]])
      .find(([s]) => index.some((i) => i.name === s));
    if (!named) return null;
    const [type, element] = named;
    // a pet of the build's own, so the import notes know it was made
    this.eidolonPet ??= { type: "Eidolon", animal: type };
    return {
      pet: this.eidolonPet, key: "eidolon-0", kind: "eidolon", ancestry: ["AC-Eidolons", type],
      element: element ? element.toLowerCase() : null,
      // a multiclass summoner's eidolon, whose attributes the module caps at first
      dedication: ![source.class, source.dualClass].includes("Summoner"),
    };
  }

  /** An inventor's construct companion, as a companion: the module's Prototype Construct. */
  construct() {
    const source = this.pathmuncher.source;
    if (!BFFBuilder.hasConstruct(source)) return null;
    // a pet of the build's own, so the import notes know it was made
    this.constructPet ??= { type: "Construct Companion", animal: "Prototype Construct" };
    return {
      pet: this.constructPet, key: "construct-companion-0", kind: "construct",
      ancestry: ["AC-Construct-Companions", "Prototype Construct"],
      innovation: (source.specials ?? []).some((s) => String(s).trim() === "Construct Innovation"),
    };
  }

  /** The name Pathbuilder gives the companion ("Fang - Savage Wolf" is Fang), or the master's animal's. */
  static companionName(pet, master) {
    const [name] = String(pet.name ?? "").split(" - ");
    return pet.name?.includes(" - ") && name.trim() ? name.trim() : `${master.name}'s ${pet.animal}`;
  }

  /** The companion module's pack of a kind ("AC-Feats"), in its version for this world's system. */
  static pack(name) {
    return game.packs.find((p) => p.metadata.packageName === BFFBuilder.MODULE && p.metadata.name.replace(/^sf-/, "") === name);
  }

  static async #find(packName, name) {
    const pack = BFFBuilder.pack(packName);
    const index = pack ? await pack.getIndex() : [];
    const entry = index.find((i) => i.name === name) ?? index.find((i) => Seasoning.slug(i.name) === Seasoning.slug(name));
    return entry ? { pack, entry } : null;
  }

  static async #document(packName, name) {
    const found = await BFFBuilder.#find(packName, name);
    if (!found) return null;
    const data = (await found.pack.getDocument(found.entry._id)).toObject();
    data._id = foundry.utils.randomID();
    foundry.utils.setProperty(data, `flags.${CONSTANTS.FLAG_NAME}.imported`, true);
    return data;
  }

  /**
   * The characters a companion can go to besides a new one: those the user can change, that no other
   * player owns, that aren't already a companion, and that are blank or made for a companion.
   */
  static candidates(master, taken = []) {
    const others = game.users.filter((u) => !u.isGM && !master.testUserPermission(u, "OWNER"));
    return game.actors.filter((a) => a.type === "character" && a.id !== master.id && a.isOwner
      && !taken.includes(a.id)
      && !others.some((u) => a.testUserPermission(u, "OWNER"))
      && !a.getFlag(CONSTANTS.FLAG_NAME, "master")
      && (!a.class || BFFBuilder.COMPANION_CLASSES.includes(a.class.slug)));
  }

  /** The actor linked to the companion with this key, from the master's link or the companion's. */
  #linkedActor(key) {
    const uuid = this.master.getFlag(CONSTANTS.FLAG_NAME, `companions.${key}`);
    const linked = uuid ? game.actors.find((a) => a.uuid === uuid) : null;
    if (linked?.type === "character") return linked;
    return game.actors.find((a) => a.type === "character"
      && a.getFlag(CONSTANTS.FLAG_NAME, "master")?.uuid === this.master.uuid
      && a.getFlag(CONSTANTS.FLAG_NAME, "master")?.key === key) ?? null;
  }

  async #newActor(name) {
    const folderName = game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Folders.Companions`);
    const folder = await utils.getOrCreateFolder(this.master.folder, "Actor", folderName);
    return Actor.create({
      name,
      type: "character",
      folder: folder.id,
      // whoever plays the master plays the companion
      ownership: foundry.utils.deepClone(this.master._source.ownership),
      prototypeToken: { name, actorLink: true, disposition: this.master.prototypeToken.disposition },
    });
  }

  /** The actor for a companion: the one linked, or the one the user picks. null to leave it out. */
  async #actorFor({ pet, key }, taken) {
    const linked = this.#linkedActor(key);
    if (linked) return linked;
    const name = BFFBuilder.companionName(pet, this.master);
    const candidates = BFFBuilder.candidates(this.master, taken);
    const answer = candidates.length > 0 && this.resolveCompanionActor
      ? await this.resolveCompanionActor({ master: this.master, pet, name, candidates })
      : { create: true };
    if (!answer) return null;
    return answer.actor ?? this.#newActor(name);
  }

  /** The barding Pathbuilder gives ("Barding, Heavy"), as pf2e names it for the companion's size. */
  static bardingName(armor, size) {
    const [, weight] = String(armor ?? "").match(/^Barding, (Light|Heavy)$/) ?? [];
    if (!weight) return armor;
    if (weight === "Light") return "Light Barding";
    return ["lg", "huge", "grg"].includes(size) ? "Heavy Barding (Large)" : "Heavy Barding (Small or Medium)";
  }

  /** An item from the pf2e compendiums for the companion, flagged as imported, or null. */
  async #equipmentItem(name) {
    const matcher = this.pathmuncher.compendiumMatchers.equipment;
    const match = matcher.getMatch(Seasoning.getFoundryEquipmentName(name), name);
    if (!match) return null;
    const data = (await match.pack.getDocument(match.i._id)).toObject();
    data._id = foundry.utils.randomID();
    foundry.utils.setProperty(data, `flags.${CONSTANTS.FLAG_NAME}.imported`, true);
    return data;
  }

  #unmatched(pet, name, details = {}) {
    this.bad.push({ pbName: `${name} (${pet.name ?? pet.animal})`, type: "companion", details: { pet, ...details } });
  }

  /** The feats the companion has taken: Mature, Nimble or Savage, and Specialized with its specializations. */
  async #feats(pet) {
    const names = [];
    if (pet.mature) names.push("Mature Animal Companion");
    if (pet.incredible && pet.incredibleType) names.push(`${pet.incredibleType} Animal Companion`);
    const feats = [];
    for (const name of names) {
      const feat = await BFFBuilder.#document("AC-Feats", name);
      if (feat) feats.push(feat);
      else this.#unmatched(pet, name);
    }

    // Specialized grants the first specialization as its choice; any more are taken as they are
    const [first, ...more] = pet.specializations ?? [];
    if (first) {
      const specialized = await BFFBuilder.#document("AC-Feats", "Specialized Animal Companion");
      const benefit = await BFFBuilder.#find("AC-Feats", first);
      const choice = specialized?.system.rules.find((r) => r.key === "ChoiceSet");
      if (specialized && benefit && choice) {
        choice.selection = benefit.entry.uuid;
        if (choice.flag) foundry.utils.setProperty(specialized, `flags.${game.system.id}.rulesSelections.${choice.flag}`, benefit.entry.uuid);
        feats.push(specialized);
      } else {
        this.#unmatched(pet, first);
      }
    }
    for (const name of more) {
      const feat = await BFFBuilder.#document("AC-Feats", name);
      if (feat) feats.push(feat);
      else this.#unmatched(pet, name);
    }
    return feats;
  }

  /**
   * A construct companion's feats: the advancement its master's feats give it, and its innovation's
   * modifications (a dedication's innovation has none). Its ancestry grants its unarmed attacks.
   */
  async #constructFeats({ pet, innovation }) {
    const source = this.pathmuncher.source;
    const taken = new Set((source.feats ?? []).map(([name]) => name));
    const advancement = Object.entries(BFFBuilder.CONSTRUCT_FEATS)
      .filter(([feat]) => taken.has(feat) && (innovation || feat !== "Megaton Strike"))
      .map(([, name]) => name);
    const wanted = [
      ...advancement.map((name) => ["AC-Construct-Companions", name]),
      ...(innovation ? source.inventorMods ?? [] : [])
        .map(({ selection }) => ["AC-Construct-Breakthroughs", BFFBuilder.CONSTRUCT_MODIFICATIONS[selection] ?? selection]),
    ];
    const feats = [];
    for (const [packName, name] of wanted) {
      const feat = await BFFBuilder.#document(packName, name);
      if (feat) feats.push(feat);
      else this.#unmatched(pet, name);
    }
    return feats;
  }

  /** The barding and other gear Pathbuilder gives the companion, the barding worn. */
  async #gear(pet, actor) {
    const gear = [];
    if (pet.armor && pet.armor !== "Unarmored") {
      const name = BFFBuilder.bardingName(pet.armor, actor.size);
      const barding = await this.#equipmentItem(name);
      if (barding) {
        foundry.utils.setProperty(barding, "system.equipped", { carryType: "worn", inSlot: true });
        gear.push(barding);
      } else {
        this.#unmatched(pet, name);
      }
    }
    for (const entry of pet.equipment ?? []) {
      const [name, quantity] = Array.isArray(entry) ? entry : [entry?.name ?? entry, entry?.qty];
      if (!name) continue;
      const item = await this.#equipmentItem(name);
      if (!item) {
        this.#unmatched(pet, name);
        continue;
      }
      if (Number(quantity) > 1) item.system.quantity = Number(quantity);
      gear.push(item);
    }
    return gear;
  }

  /** What the actor's items chose, by "<item slug>:<flag>", for the next build to choose again. */
  static selections(actor) {
    const selections = {};
    for (const item of actor.items) {
      const chosen = item.flags?.[game.system.id]?.rulesSelections ?? item.flags?.pf2e?.rulesSelections ?? {};
      for (const [flag, value] of Object.entries(chosen)) selections[`${item.slug}:${flag}`] = value;
    }
    return selections;
  }

  /** Clears what an earlier import made on the actor, and an ancestry or class it had, and links it. */
  async #clear(actor, key, level) {
    const replaced = actor.items.filter((i) => i.getFlag(CONSTANTS.FLAG_NAME, "imported") || ["ancestry", "class"].includes(i.type));
    if (replaced.length > 0) await actor.deleteEmbeddedDocuments("Item", replaced.map((i) => i.id));
    await actor.update({
      "system.details.level.value": level,
      [`flags.${CONSTANTS.FLAG_NAME}.master`]: { uuid: this.master.uuid, key },
    });
  }

  /**
   * The ChoiceSet a prompt is for: the item's next unanswered one asking this, as the system asks them
   * in order (it notes each as null until answered).
   */
  static #promptedRule(app) {
    const chosen = app.item.flags?.pf2e?.rulesSelections ?? app.item.flags?.[game.system.id]?.rulesSelections ?? {};
    return (app.item._source?.system?.rules ?? []).find((r) => r.key === "ChoiceSet" && r.flag
      && (chosen[r.flag] ?? null) === null && game.i18n.localize(r.prompt ?? "") === app.prompt);
  }

  /**
   * Answers the system's prompts for the choices of items created on the actor, until the returned
   * function is called. Each is answered by choices.answer and closed before it is used, unless
   * choices.answer leaves it for the user to answer.
   */
  static answerPrompts(actor, choices) {
    const hook = Hooks.on("renderApplicationV2", (app) => {
      if (!Array.isArray(app.choices) || typeof app.resolveSelection !== "function") return;
      if (app.pathmuncherAnswered || app.pathmuncherAsks || app.item?.actor?.id !== actor.id) return;
      const rule = BFFBuilder.#promptedRule(app);
      const { choice, ask } = choices.answer({ itemName: app.item.name, itemSlug: app.item.slug, flag: rule?.flag, choices: app.choices });
      // left for the user, as the system asks it
      if (ask) {
        app.pathmuncherAsks = true;
        return;
      }
      app.pathmuncherAnswered = true;
      app.element?.style.setProperty("visibility", "hidden");
      app.selection = choice ?? app.choices[0] ?? null;
      setTimeout(() => app.close(), 0);
    });
    return () => Hooks.off("renderApplicationV2", hook);
  }

  /**
   * The eidolon versions of the summoner's evolution feats ("Energy Heart" is "Energy Heart (CC)"), and
   * a multiclass summoner's adjustment.
   */
  async #evolutionFeats({ dedication }) {
    const feats = [];
    if (dedication) {
      const adjustment = await BFFBuilder.#document("AC-Evolution-Feats", "Summoner Dedication Adjustment (CC)");
      if (adjustment) feats.push(adjustment);
    }
    for (const [name, , type, level] of this.pathmuncher.source.feats ?? []) {
      if (BFFBuilder.NOT_EVOLUTION_FEATS.includes(type)) continue;
      const feat = await BFFBuilder.#document("AC-Evolution-Feats", BFFBuilder.EVOLUTION_FEATS[name] ?? `${name} (CC)`);
      // the level the summoner took it at, which the eidolon builder shows
      if (feat) feats.push(foundry.utils.mergeObject(feat, { [`flags.${CONSTANTS.FLAG_NAME}.takenAt`]: level ?? null }));
    }
    return feats;
  }

  /**
   * Builds an eidolon on its actor: its type at level 1, then its master's level, so the Eidolon
   * class's features come as they do when it levels, then the evolution feats. The choices these ask
   * for are answered as they come: the last build's, the build's, or a default noted to check.
   */
  async #buildEidolon(actor, { pet, key, element, dedication }, ancestry) {
    // the damage types Pathbuilder lists for Energy Heart, as specials of their own ("cold")
    const energyHeart = (this.pathmuncher.source.specials ?? [])
      .map((s) => String(s).trim().toLowerCase()).filter((s) => this.pathmuncher.constructor.ENERGY_HEART_TYPES.includes(s));
    const choices = new CompanionChoices({ previous: BFFBuilder.selections(actor), energyHeart, element });
    await this.#clear(actor, key, 1);
    const stop = BFFBuilder.answerPrompts(actor, choices);
    try {
      await actor.createEmbeddedDocuments("Item", [ancestry]);
      await actor.update({ "system.details.level.value": this.master.system.details.level.value });
      const feats = await this.#evolutionFeats({ dedication });
      if (feats.length > 0) await actor.createEmbeddedDocuments("Item", feats);
    } finally {
      stop();
    }
    // the user makes the choices, or they are listed to check
    const reviewed = this.reviewEidolon ? await this.reviewEidolon({ eidolon: actor, guessed: choices.guessed }) : false;
    if (!reviewed) this.#noteGuessed(actor, pet, choices);
  }

  /** Lists the choices made for a companion by default, for the import notes. */
  #noteGuessed(actor, pet, choices) {
    for (const { item, choice } of choices.guessed) {
      this.bad.push({ pbName: `${item}: ${choice} (${actor.name})`, type: "companionChoice", details: { pet } });
    }
  }

  /**
   * Builds an animal or construct companion on its actor. What an earlier import made, and an ancestry
   * or class the actor had, are replaced; anything else on it (added by hand, effects) is kept.
   */
  async #build(actor, companion, ancestry) {
    const { pet, key } = companion;
    // a construct's few choices are asked, the first time, rather than guessed
    const choices = new CompanionChoices({ previous: BFFBuilder.selections(actor), guess: companion.kind !== "construct" });
    await this.#clear(actor, key, this.master.system.details.level.value);
    const stop = BFFBuilder.answerPrompts(actor, choices);
    try {
      // the ancestry first: it grants the class the feats build on
      await actor.createEmbeddedDocuments("Item", [ancestry]);
      const feats = companion.kind === "construct" ? await this.#constructFeats(companion) : await this.#feats(pet);
      if (feats.length > 0) await actor.createEmbeddedDocuments("Item", feats);
      // the size the feats grew it to picks the barding
      const gear = await this.#gear(pet, actor);
      if (gear.length > 0) await actor.createEmbeddedDocuments("Item", gear);
    } finally {
      stop();
    }
    this.#noteGuessed(actor, pet, choices);
  }

  /**
   * Makes or updates each of the build's animal companions, its eidolon and its construct companion, and
   * links each to the master.
   */
  async build() {
    const taken = [];
    const others = [await this.eidolon(), this.construct()].filter(Boolean);
    for (const companion of [...this.companions, ...others]) {
      try {
        // the animal, eidolon or construct as the module has it, before any actor is made for it
        const ancestry = await BFFBuilder.#document(...companion.ancestry);
        if (ancestry?.type !== "ancestry") {
          this.#unmatched(companion.pet, companion.pet.animal);
          continue;
        }
        const actor = await this.#actorFor(companion, taken);
        if (!actor) continue;
        taken.push(actor.id);
        if (companion.kind === "eidolon") await this.#buildEidolon(actor, companion, ancestry);
        else await this.#build(actor, companion, ancestry);
        await this.master.setFlag(CONSTANTS.FLAG_NAME, `companions.${companion.key}`, actor.uuid);
        this.imported.push({ pet: companion.pet, actor });
        if (companion.kind === "eidolon") this.pathmuncher.eidolonImported = true;
        if (companion.kind === "construct") this.pathmuncher.constructImported = true;
      } catch (error) {
        logger.error(`Unable to build companion ${companion.pet.name}`, { error, companion });
        this.#unmatched(companion.pet, companion.pet.animal, { error: error.message });
      }
    }
    // the import notes: what was made is not listed as not imported, and what matched nothing is
    this.pathmuncher.importedPets.push(...this.imported.map((c) => c.pet));
    this.pathmuncher.bad.push(...this.bad);
    logger.debug("Companions", { imported: this.imported, bad: this.bad });
  }

}
