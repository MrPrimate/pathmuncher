/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import { spellRename } from "../data/spells.js";
import logger from "../logger.js";
import utils from "../utils.js";
import { CompendiumMatcher } from "./CompendiumMatcher.js";
import { ParsedEntry } from "./ParsedEntry.js";
import { Seasoning } from "./Seasoning.js";

/**
 * The build's spellcasting as Foundry items: its spellcasting entries with their slots and prepared
 * spells, focus spells and the focus pool, and rituals.
 */
export class SpellBuilder {

  /** @param {Pathmuncher} pm  the import this works for, whose state it reads and adds to */
  constructor(pm) {
    this.pm = pm;
  }

  // the import's state, which this reads and adds to

  get bad() {
    return this.pm.bad;
  }

  get compendiumMatchers() {
    return this.pm.compendiumMatchers;
  }

  get options() {
    return this.pm.options;
  }

  get parsed() {
    return this.pm.parsed;
  }

  get result() {
    return this.pm.result;
  }

  get source() {
    return this.pm.source;
  }

  getClassSpellCastingType(dual = false) {
    const classCaster = dual
      ? this.source.spellCasters.find((caster) => caster.name === this.source.dualClass)
      : this.source.spellCasters.find((caster) => caster.name === this.source.class);
    const type = classCaster?.spellcastingType;
    if (type || this.source.spellCasters.length === 0) return type ?? "spontaneous";
    // if no type and multiple spell casters, then return the first spell casting type
    return this.source.spellCasters[0].spellcastingType ?? "spontaneous";
  }

  // aims to determine the class magic tradition for a spellcasting block
  getClassMagicTradition(caster) {
    const classCaster = [this.source.class, this.source.dualClass].includes(caster.name);
    const tradition = classCaster ? caster?.magicTradition : undefined;
    // if a caster tradition or no spellcasters, return divine
    if (tradition || this.source.spellCasters.length === 0) return tradition ?? "divine";

    // not a focus traditions
    if (caster.magicTradition !== "focus" && ["divine", "occult", "primal", "arcane"].includes(caster.magicTradition)) {
      return caster.magicTradition;
    }

    // this spell caster type is not a class, determine class tradition based on ability
    const abilityTradition = this.source.spellCasters.find((c) =>
      [this.source.class, this.source.dualClass].includes(c.name)
      && c.ability === caster.ability,
    );
    if (abilityTradition) return abilityTradition.magicTradition;
    // if no type and multiple spell casters, then return the first spell casting type
    return this.source.spellCasters[0].magicTradition && this.source.spellCasters[0].magicTradition !== "focus"
      ? this.source.spellCasters[0].magicTradition
      : "divine";
  }

  #applySpellBlending(spellcastingEntity, caster) {
    if (caster.blendedSpells.length === 0) return;

    const remove = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const add = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // find adjustments
    caster.blendedSpells.forEach((slot) => {
      remove[slot.levelFrom]++;
      add[slot.LevelTo]++;
    });

    for (let i = 0; i <= 10; i++) {
      const toAdd = this.options.adjustBlendedSlots ? 0 : Math.floor(add[i] / 2);
      const toRemove = this.options.adjustBlendedSlots ? remove[i] : 0;
      const adjustment = 0 - toRemove - toAdd;
      logger.debug("Adjusting spells for spell blending", { i, adjustment, add, remove, toAdd, max: spellcastingEntity.slots[`slot${i}`].max });
      spellcastingEntity.slots[`slot${i}`].max += adjustment;
      spellcastingEntity.slots[`slot${i}`].value += adjustment;
    }
  }

  #generateSpellCaster(caster) {
    const isFocus = caster.magicTradition === "focus";
    const magicTradition = this.getClassMagicTradition(caster);
    const spellcastingType = isFocus ? "focus" : caster.spellcastingType;
    const flexible = false; // placeholder

    const name = isFocus ? `${utils.capitalize(magicTradition)} ${caster.name}` : caster.name;

    const spellcastingEntity = {
      ability: {
        value: caster.ability,
      },
      proficiency: {
        value: caster.proficiency / 2,
      },
      spelldc: {
        item: 0,
      },
      tradition: {
        value: magicTradition,
      },
      prepared: {
        value: spellcastingType,
        flexible,
      },
      slots: {},
      showUnpreparedSpells: { value: true },
      showSlotlessLevels: { value: true },
    };

    // apply slot data
    for (let i = 0; i <= 10; i++) {

      spellcastingEntity.slots[`slot${i}`] = {
        max: caster.perDay[i],
        prepared: {},
        value: caster.perDay[i],
      };
    }
    // adjust slots for spell blended effects
    this.#applySpellBlending(spellcastingEntity, caster);

    const data = {
      _id: foundry.utils.randomID(),
      name,
      type: "spellcastingEntry",
      system: spellcastingEntity,
    };
    this.result.casters.push(data);
    return data;
  }

  #generateFocusSpellCaster(proficiency, ability, tradition) {
    const data = {
      _id: foundry.utils.randomID(),
      name: `${utils.capitalize(tradition)} Focus Tradition`,
      type: "spellcastingEntry",
      system: {
        ability: {
          value: ability,
        },
        proficiency: {
          value: proficiency / 2,
        },
        spelldc: {
          item: 0,
        },
        tradition: {
          value: tradition,
        },
        prepared: {
          value: "focus",
          flexible: false,
        },
        showUnpreparedSpells: { value: true },
      },
    };
    this.result.casters.push(data);
    return data;
  }

  /** A Pathbuilder spell's compendium name and index match, if it has one. */
  #spellMatch(spell) {
    const spellName = spellRename(spell.split("(")[0].trim());
    return { spellName, indexMatch: this.compendiumMatchers["spells"].getMatch(spell, spellName, true) };
  }

  /**
   * Fetches the build's spells in one request per pack, so loading them one by one reads each from the
   * pack's cache rather than asking the server for it.
   */
  async #prefetchSpells() {
    const ids = new Map();
    for (const spell of this.#buildSpellNames()) {
      const { indexMatch } = this.#spellMatch(spell);
      if (!indexMatch || indexMatch.pack.has(indexMatch.i._id)) continue;
      if (!ids.has(indexMatch.pack)) ids.set(indexMatch.pack, new Set());
      ids.get(indexMatch.pack).add(indexMatch.i._id);
    }
    // eslint-disable-next-line camelcase
    await Promise.all([...ids].map(([pack, packIds]) => pack.getDocuments({ _id__in: [...packIds] })));
  }

  /** The names of every spell the build's casters and focus abilities have. */
  #buildSpellNames() {
    const spells = new Set();
    for (const caster of this.source.spellCasters ?? []) {
      for (const block of [...(caster.spells ?? []), ...(caster.prepared ?? [])]) {
        for (const spell of block.list ?? []) spells.add(spell);
      }
    }
    for (const tradition of Object.values(this.source.focus ?? {})) {
      for (const ability of Object.values(tradition ?? {})) {
        for (const spell of [...(ability?.focusCantrips ?? []), ...(ability?.focusSpells ?? [])]) spells.add(spell);
      }
    }
    return spells;
  }

  async #loadSpell(spell, casterId, debugData) {
    const { spellName, indexMatch } = this.#spellMatch(spell);
    logger.debug("spell details", { spell, spellName, debugData });

    if (!indexMatch) {
      if (debugData.psychicAmpSpell) return undefined;
      logger.error(`Unable to match spell ${spell}`, { spell, spellName, debugData });
      this.bad.push({ pbName: spell, type: "spell", details: { originalName: spell, name: spellName, debugData } });
      return undefined;
    }

    const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
    const itemData = doc.toObject();
    itemData._id = foundry.utils.randomID();
    itemData.system.location.value = casterId;

    return itemData;
  }

  // eslint-disable-next-line complexity
  async #processCasterSpells(instance, caster, spellEnhancements, forcePrepare = false) {
    const spellNames = {};
    // every rank with spells known or prepared: a prepared caster's export can prepare spells its
    // spellbook doesn't list, which go into the spellbook as they are prepared
    const levels = [...new Set([...caster.spells, ...(caster.prepared ?? [])].map((s) => s.spellLevel))].sort((a, b) => a - b);
    for (const level of levels) {
      const spellSelection = caster.spells.find((s) => s.spellLevel === level) ?? { spellLevel: level, list: [] };
      const preparedAtLevel = caster.prepared?.length > 0
        ? (caster.prepared.find((p) => p.spellLevel === level)?.list ?? [])
        : [];
      let preparedValue = 0;


      for (const [i, spell] of spellSelection.list.entries()) {
        logger.debug(`Checking spell at ${i} for level ${level}`, { spell });
        const itemData = await this.#loadSpell(spell, instance._id, {
          spellSelection,
          list: spellSelection.list,
          level,
          instance,
        });
        if (itemData) {
          itemData.system.location.heightenedLevel = level;
          spellNames[spell] = itemData._id;
          this.result.spells.push(itemData);

          // if the caster is prepared we don't prepare spells as all known spells come through in JSON
          if (instance.system.prepared.value !== "prepared"
            || spellEnhancements?.preparePBSpells
            || forcePrepare
            || (caster.spellcastingType === "prepared"
              && preparedAtLevel.length === 0 && spellSelection.list.length <= caster.perDay[level])
          ) {
            logger.debug(`Preparing spell ${itemData.name} for level ${level}`, { spell });
            instance.system.slots[`slot${level}`].prepared[preparedValue] = { id: itemData._id };
            preparedValue++;
          }
        }
      }

      for (const spell of preparedAtLevel) {
        const parsedSpell = foundry.utils.getProperty(spellNames, spell);
        const itemData = parsedSpell
          ? this.result.spells.find((s) => s._id === parsedSpell)
          : await this.#loadSpell(spell, instance._id, {
            spellSelection,
            level,
            instance,
          });
        if (itemData) {
          // a spellbook spell prepared in a higher slot keeps its spellbook rank: the slot heightens it
          if (!parsedSpell) {
            itemData.system.location.heightenedLevel = level;
            spellNames[spell] = itemData._id;
            this.result.spells.push(itemData);
          }

          logger.debug(`Preparing spell ${itemData.name} for level ${level}`, { spellName: spell });
          // eslint-disable-next-line require-atomic-updates
          instance.system.slots[`slot${level}`].prepared[preparedValue] = { id: itemData._id };
          preparedValue++;
        } else {
          logger.warn(`Unable to find spell ${spell}`);
        }
      }

      if (spellEnhancements?.knownSpells) {
        for (const spell of spellEnhancements.knownSpells) {
          const itemData = await this.#loadSpell(spell, instance._id, {
            spellEnhancements,
            instance,
          });
          if (itemData && !foundry.utils.hasProperty(spellNames, itemData.name)) {
            itemData.system.location.heightenedLevel = level;
            spellNames[spell] = itemData._id;
            this.result.spells.push(itemData);
          }
        }
      }
    }
  }

  async #processFocusSpells(instance, spells) {
    for (const spell of spells) {
      const itemData = await this.#loadSpell(spell, instance._id, {
        instance,
        spells,
        spell,
      });
      if (itemData) this.result.spells.push(itemData);
      // only pull amps is the module is active
      if (spell.endsWith("(Amped)") && game.modules.get("pf2e-psychic-amps")?.active) {
        const psychicSpell = spell.replace("(Amped)", "(Psychic)");
        const psychicItemData = await this.#loadSpell(psychicSpell, instance._id, {
          instance,
          spells,
          spell: psychicSpell,
          psychicAmpSpell: true,
        });
        if (psychicItemData) {
          this.result.spells.push(psychicItemData);
        }
      }
    }
  }

  async processRituals() {
    if (!this.source.rituals?.length) return;
    const ritualCompendium = new CompendiumMatcher({
      type: "spells",
      indexFields: ["name", "type", "system.slug", "system.ritual"],
    });
    await ritualCompendium.loadCompendiums();

    for (const ritual of this.source.rituals) {
      const ritualName = ritual.split("(")[0].trim();
      logger.debug("ritual spell details", { ritual, spellName: ritualName });

      // a spell can share a ritual's name, so only rituals are looked at
      const indexMatch = ritualCompendium.getNameMatchWithFilter(ritualName, ritualName, { "system.ritual": (value) => !!value });
      if (!indexMatch) {
        logger.error(`Unable to match ritual spell ${ritual}`, { spell: ritual, spellName: ritualName, indexMatch });
        this.bad.push({ pbName: ritual, type: "ritual", details: { originalName: ritual, name: ritualName } });
        continue;
      }

      const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
      const itemData = doc.toObject();
      itemData._id = foundry.utils.randomID();

      this.result.spells.push(itemData);
    }
  }

  /**
   * A magus's studious spells. Pathbuilder lists them as specials ("Studious Spell: Haste") and mostly
   * leaves them out of the spellbook; the rules have them in it. Each goes on the class's prepared
   * spellcasting, where the system's hybrid study marks it as studious, and its special is settled.
   */
  async #addStudiousSpells() {
    const studious = this.parsed.specials.filter((s) => !s.added && (/^Studious Spell: /).test(s.originalName ?? s.name));
    const instance = this.result.casters.find((c) => c.name === this.source.class && c.system.prepared?.value === "prepared");
    if (studious.length === 0 || !instance) return;
    for (const special of studious) {
      const spell = (special.originalName ?? special.name).replace(/^Studious Spell: /, "");
      const { indexMatch } = this.#spellMatch(spell);
      const inBook = indexMatch && this.result.spells.find((s) => s.system.location?.value === instance._id
        && s._stats?.compendiumSource === indexMatch.pack.getUuid(indexMatch.i._id));
      const itemData = inBook ?? await this.#loadSpell(spell, instance._id, { studious: true });
      if (!itemData) continue;
      if (!inBook) this.result.spells.push(itemData);
      special.settle(ParsedEntry.STATUS.CREATED, { itemId: itemData._id, reason: "a studious spell" });
    }
  }

  async processSpells() {
    await this.#prefetchSpells();
    for (const caster of this.source.spellCasters) {
      logger.debug("Generating caster for", caster);
      if (Number.isInteger(parseInt(caster.focusPoints, 10))) this.result.focusPool += caster.focusPoints;
      const instance = this.#generateSpellCaster(caster);
      logger.debug("Generated caster instance", instance);
      const spellEnhancements = Seasoning.getSpellCastingFeatureAdjustment(caster.name);
      let forcePrepare = false;
      if (foundry.utils.hasProperty(spellEnhancements, "showSlotless")) {
        instance.system.showSlotlessLevels.value = foundry.utils.getProperty(spellEnhancements, "showSlotless");
      } else if (
        caster.spellcastingType === "prepared"
        && ![this.source.class, this.source.dualClass].includes(caster.name)
      ) {
        const slotToPreparedMatch = caster.spells.every((spellBlock) => {
          const spellCount = spellBlock.list.length;
          const perDay = caster.perDay[spellBlock.spellLevel];
          return perDay === spellCount;
        });
        logger.debug(`Setting ${caster.name} show all slots to ${!slotToPreparedMatch}`);
        instance.system.showSlotlessLevels.value = !slotToPreparedMatch;
        forcePrepare = slotToPreparedMatch;
      }
      await this.#processCasterSpells(instance, caster, spellEnhancements, forcePrepare);
    }

    await this.#addStudiousSpells();

    if (this.parsed.feats.some((f) => f.name === "Initiate Warden")) {
      const spellData = foundry.utils.getProperty(this.source, "focus.Unassigned.General");
      if (spellData) {
        const existing = foundry.utils.getProperty(this.source, "focus.primal.wis") ?? {};
        const merged = foundry.utils.mergeObject(existing, spellData);
        foundry.utils.setProperty(this.source, "focus.primal.wis", merged);
      }
    }

    for (const tradition of ["occult", "primal", "divine", "arcane"]) {
      const traditionData = foundry.utils.getProperty(this.source, `focus.${tradition}`);
      logger.debug(`Checking for focus tradition ${tradition}`);
      if (!traditionData) continue;
      for (const ability of ["str", "dex", "con", "int", "wis", "cha"]) {
        const abilityData = foundry.utils.getProperty(traditionData, ability);
        logger.debug(`Checking for focus tradition ${tradition} with ability ${ability}`);
        if (!abilityData) continue;
        logger.debug("Generating focus spellcasting ", { tradition, traditionData, ability });
        const instance = this.#generateFocusSpellCaster(abilityData.proficiency, ability, tradition);
        if (abilityData.focusCantrips && abilityData.focusCantrips.length > 0) {
          await this.#processFocusSpells(instance, abilityData.focusCantrips);
        }
        if (abilityData.focusSpells && abilityData.focusSpells.length > 0) {
          await this.#processFocusSpells(instance, abilityData.focusSpells);
        }
      }
    }

    // older exports have no focus pool; leave it to the system rather than write undefined
    if (Number.isInteger(this.source.focusPoints)) {
      foundry.utils.setProperty(this.result.character, "system.resources.focus.max", this.source.focusPoints);
      foundry.utils.setProperty(this.result.character, "system.resources.focus.value", this.source.focusPoints);
    }
  }


}
