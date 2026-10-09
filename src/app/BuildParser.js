import { SPECIAL_NAME_ADDITIONS, kineticGateOwnJunctions } from "../data/features.js";
import logger from "../logger.js";
import utils from "../utils.js";
import { ParsedEntry } from "./ParsedEntry.js";
import { Seasoning } from "./Seasoning.js";

/**
 * Reading a Pathbuilder export: checking it is a build, filling in what older exports leave out,
 * the variant rules it was made with, and turning its feats, specials, equipment, weapons and armor
 * into the import's parsed entries (ParsedEntry), under the names Foundry knows them by.
 */
export class BuildParser {

  /** @param {Pathmuncher} pm  the import this works for, whose state it reads and adds to */
  constructor(pm) {
    this.pm = pm;
  }

  // the import's state, which this reads and adds to

  get parsed() {
    return this.pm.parsed;
  }

  get source() {
    return this.pm.source;
  }

  /**
   * Returns the build from Pathbuilder JSON, either the full export ({ success, build }) or the
   * build object on its own, or null if it doesn't look like a Pathbuilder build.
   */
  static getBuildFromJson(jsonData) {
    if (!utils.isObject(jsonData)) return null;
    if (jsonData.success === false) return null;
    const build = utils.isObject(jsonData.build) ? jsonData.build : jsonData;
    const isBuild = utils.isString(build.name)
      && utils.isString(build.class)
      && Array.isArray(build.feats)
      && utils.isObject(build.abilities);
    return isBuild ? build : null;
  }

  /**
   * Fills in fields that older Pathbuilder exports leave out (equipmentContainers, focus,
   * blendedSpells, prepared, ...), so the rest of the import can rely on them. Updates in place.
   */
  static normaliseSource(source) {
    for (const key of ["feats", "specials", "lores", "equipment", "weapons", "armor", "spellCasters", "formula",
      "pets", "familiars", "rituals", "inventorMods", "resistances", "languages"]) {
      if (!Array.isArray(source[key])) source[key] = [];
    }
    for (const key of ["equipmentContainers", "focus", "money", "mods", "proficiencies", "specificProficiencies"]) {
      if (!utils.isObject(source[key])) source[key] = {};
    }
    for (const coin of ["pp", "gp", "sp", "cp"]) {
      source.money[coin] ??= 0;
    }
    for (const formula of source.formula) {
      if (!Array.isArray(formula.known)) formula.known = [];
    }
    for (const caster of source.spellCasters) {
      for (const key of ["spells", "prepared", "blendedSpells"]) {
        if (!Array.isArray(caster[key])) caster[key] = [];
      }
      if (!Array.isArray(caster.perDay)) caster.perDay = [];
      caster.perDay = Array.from({ length: 11 }, (_, i) => caster.perDay[i] ?? 0);
      caster.innate ??= false;
    }
    return source;
  }

  /**
   * The variant rules a Pathbuilder build was made with. Free Archetype shows in slot labels
   * ("Free Archetype 2"); exports without labels show it as an archetype feat and a class feat taken
   * at the same level. Gradual boosts show as levelled boosts outside 1/5/10/15/20.
   */
  static detectVariants(source) {
    const feats = source.feats ?? [];
    const hasLabels = feats.some((f) => f.length > 4);
    const classFeatType = (type) => type === "Class Feat" || type === `${source.class} Feat`;
    const freeArchetype = hasLabels
      ? feats.some((f) => String(f[4] ?? "").startsWith("Free Archetype"))
      : feats.some((f) => f[2] === "Archetype Feat" && feats.some((c) => classFeatType(c[2]) && c[3] === f[3]));
    const boostLevels = Object.keys(source.abilities?.breakdown?.mapLevelledBoosts ?? {});
    const gradualBoosts = boostLevels.some((l) => !["1", "5", "10", "15", "20"].includes(l));
    return { freeArchetype, gradualBoosts };
  }

  #processSpecialData(name) {
    if (name.includes("Domain: ")) {
      const domainName = name.split(" ")[1];
      this.parsed.feats.push(new ParsedEntry({ name: "Deity's Domain", extra: domainName }));
      return true;
    } else {
      return false;
    }
  }

  getContainerData(key) {
    return {
      id: key,
      containerName: this.source.equipmentContainers[key].containerName,
      bagOfHolding: this.source.equipmentContainers[key].bagOfHolding,
      backpack: this.source.equipmentContainers[key].backpack,
    };
  }

  #nameMapSourceEquipment(e) {
    const mappingData = Seasoning.getFoundryEquipment(e[0]);
    const name = mappingData?.foundryName ?? e[0];
    const containerKey = Object.keys(this.source.equipmentContainers)
      .find((key) => this.source.equipmentContainers[key].containerName === name);

    const container = containerKey ? this.getContainerData(containerKey) : null;
    const foundryId = foundry.utils.randomID();

    if (container) {
      this.source.equipmentContainers[containerKey].foundryId = foundryId;
    }

    const item = new ParsedEntry({
      foundryName: name,
      pbName: e[0],
      originalName: e[0],
      qty: e[1],
      inContainer: e[2] !== "Invested" ? e[2] : null,
      container,
      foundryId,
      invested: e[2] === "Invested",
      sourceType: "equipment",
      extra: mappingData?.details ?? undefined,
    });
    this.parsed.equipment.push(item);
  }

  #nameMapSourceEquipmentAddHandwraps(e) {
    const name = Seasoning.getFoundryEquipmentName(e[0]);
    const potencyMatch = e[0].match(/\(\+(\d)[\s)]/i);
    const potency = potencyMatch ? parseInt(potencyMatch[1]) : 0;
    const strikingMatch = e[0].match(/\d( \w*)? (Striking)/i);
    const striking = strikingMatch
      ? Seasoning.slugD(`${(strikingMatch[1] ?? "").trim()}${(strikingMatch[2] ?? "").trim()}`) // `${(strikingMatch[2] ?? "").toLowerCase().trim()}${(strikingMatch[1] ?? "").trim()}`.trim()
      : "";
    const mockE = {
      name: e[0],
      qty: 1,
      prof: "unarmed",
      pot: Number.isInteger(potency) ? potency : 0,
      str: striking,
      mat: null,
      display: e[0],
      runes: [],
      damageType: "B",
      increasedDice: false,
    };
    const weapon = new ParsedEntry({
      foundryName: name,
      pbName: mockE.name,
      originalName: mockE.name,
      sourceType: "weapons",
      ...mockE,
    });
    this.parsed.weapons.push(weapon);
  }

  nameMap() {
    let iRank = 0;
    let featRank = 0;
    logger.debug("Starting Equipment Rename");
    this.source.equipment
      .filter((e) => e[0] && e[0] !== "undefined")
      .forEach((e) => {
        if (e[0].startsWith("Handwraps of Mighty Blows")) {
          this.#nameMapSourceEquipmentAddHandwraps(e);
        } else {
          this.#nameMapSourceEquipment(e);
        }
      });
    this.source.armor
      .filter((e) => e && e !== "undefined")
      .forEach((e) => {
        const name = Seasoning.getFoundryEquipmentName(e.name);
        const item = new ParsedEntry({
          foundryName: name,
          pbName: e.name,
          originalName: e.name,
          sourceType: "armor",
          ...e,
        });
        this.parsed.armor.push(item);
        // work around for now
        if (e.name.startsWith("Inventor ")) {
          this.parsed.feats.push(new ParsedEntry({
            name,
            extra: "",
            type: "Awarded Feat",
            level: 1,
            originalName: e.name,
            rank: 0,
            sourceType: "armor",
            featChoiceRef: null,
            hasChildren: null,
            isChild: null,
            isStandard: null,
            parentFeatChoiceRef: null,
          }));
          featRank++;
        }
      });
    this.source.weapons
      .filter((e) => e && e !== "undefined")
      .forEach((e) => {
        const name = Seasoning.getFoundryEquipmentName(e.name);
        const item = new ParsedEntry({
          foundryName: name,
          pbName: e.name,
          originalName: e.name,
          sourceType: "weapons",
          ...e,
        });
        // for now assume first weapon is the weapon innovation
        if (e.isInventor) {
          this.parsed.feats.push(new ParsedEntry({
            name,
            extra: "",
            type: "Awarded Feat",
            level: 1,
            originalName: e.name,
            rank: 0,
            sourceType: "weapons",
            featChoiceRef: null,
            hasChildren: null,
            isChild: null,
            isStandard: null,
            parentFeatChoiceRef: null,
          }));
          featRank++;
        } else {
          this.parsed.weapons.push(item);
        }
      });
    logger.debug("Finished Equipment Rename");

    logger.debug("Starting Special Rename");
    [].concat(this.source.specials, SPECIAL_NAME_ADDITIONS(this.source.specials))
      .filter((special) =>
        special
        && special !== "undefined"
        && special !== "Not Selected"
        && special !== this.source.heritage,
      )
      .forEach((special) => {
        const match = this.pm.getFoundryFeatureName(special); // , true);
        if (!this.#processSpecialData(match.foundryName) && !Seasoning.IGNORED_SPECIALS().includes(match.foundryName)) {
          this.parsed.specials.push(new ParsedEntry({
            name: match.foundryName,
            foundryName: match.foundryName,
            foundryValue: match.foundryValue,
            originalName: special,
            rank: iRank,
            sourceType: "specials",
          }));
          iRank++;
        }
      });
    logger.debug("Finished Special Rename");


    logger.debug("Starting Feat Rename");
    this.source.feats
      .filter((feat) =>
        feat[0]
        && feat[0] !== "undefined"
        && feat[0] !== "Not Selected",
        // && feat[0] !== this.source.heritage
      )
      .forEach((feat) => {
        const name = this.pm.getFoundryFeatureName(feat[0]).foundryName;
        const data = new ParsedEntry({
          name,
          extra: feat[1],
          // the heritage is imported as the heritage item
          ...(feat[0] === this.source.heritage && { status: ParsedEntry.STATUS.INCLUDED, reason: "the heritage" }),
          type: feat[2],
          level: feat[3],
          originalName: feat[0],
          rank: featRank,
          sourceType: "feats",
        });
        if (feat.length >= 7) {
          data.featChoiceRef = feat[4];
          data.hasChildren = feat[5] === "parentChoice";
          data.isParent = data.hasChildren;
          data.isChild = feat[5] === "childChoice";
          data.isStandard = feat[5] === "standardChoice";
          data.parentFeatChoiceRef = feat[6];
          const parentFeatMatch = this.source.feats.find((f) =>
            feat[5] === "childChoice"
            && (data.featChoiceRef.toLowerCase().startsWith(f[0].toLowerCase())
            || (data.parentFeatChoiceRef
              && data.featChoiceRef.replace(data.parentFeatChoiceRef, "").trim().toLowerCase().startsWith(f[0].toLowerCase()))
            ),
          );
          data.nameHint = parentFeatMatch?.[0] ? this.pm.getFoundryFeatureName(parentFeatMatch?.[0]).foundryName : undefined;
        } else {
          // probably an awarded feat
          data.featChoiceRef = null;
          data.hasChildren = null;
          data.isChild = null;
          data.isStandard = null;
          data.parentFeatChoiceRef = null;
        }

        if (data.type === "Reincarnation Feat") {
          const original = this.source.feats.find((f) => f[0] === "Reincarnation Feat");
          data.type = "Ancestry Feat";
          data.featChoiceRef = original[4];
          data.hasChildren = original[5] === "parentChoice";
          data.isParent = data.hasChildren;
          data.parentFeatChoiceRef = null;
        }
        this.parsed.feats.push(data);
        featRank++;
      });
    logger.debug("Finished Feat Rename");

    logger.debug("Checking for Inventions");
    (this.source.inventorMods ?? []).forEach((mod) => {
      const match = this.pm.getFoundryFeatureName(mod.selection);
      if (!Seasoning.IGNORED_SPECIALS().includes(match.foundryName)) {
        this.parsed.specials.push(new ParsedEntry({
          name: match.foundryName,
          foundryName: match.foundryName,
          foundryValue: match.foundryValue,
          originalName: mod.selection,
          isChild: true,
          rank: iRank,
          sourceType: "inventorMods",
          parentFeatChoiceRef: mod.ref,
          nameHint: this.pm.getFoundryFeatureName(mod.ref).foundryName,
        }));
        iRank++;
      }
    });
    logger.debug("Finished Inventions");
    logger.debug("Name remapping results", {
      parsed: this.parsed,
    });
  }

  fixUps() {
    // a single gate's own Impulse junction comes with the gate, which grants it
    for (const { special, additions } of kineticGateOwnJunctions(this.source.specials)) {
      for (const name of [special, ...additions]) {
        this.parsed.specials.find((entry) => entry.originalName === name && !entry.added)
          ?.settle(ParsedEntry.STATUS.INCLUDED, { reason: "a single gate's own junction" });
      }
    }

    if (this.source.ancestry === "Dwarf" && !this.parsed.feats.some((f) => f.name === "Clan Pistol")) {
      const clanDagger = new ParsedEntry({
        name: "Clan Dagger",
        originalName: "Clan Dagger",
        isChoice: true,
        rank: 0,
        sourceType: "specials",
      });
      this.parsed.specials.push(clanDagger);
    }

    const match = this.source.background.match(/(Magical Experiment) \((.*)\)$/);
    if (match) {
      this.parsed.specials.push(new ParsedEntry({
        name: match[2],
        originalName: `${this.source.background}`,
        isChoice: true,
        rank: 0,
        sourceType: "specials",
      }));
      this.source.background = match[1];
    }

    this.parsed.specials = this.parsed.specials.map((s) => {
      const mythicMatch = / Calling$/;
      if (mythicMatch.test(s.name)) {
        s.type = "Mythic Feat";
        s.level = "calling";
        s.sourceType = "mythicCalling";
      }
      return s;
    });
  }


}
