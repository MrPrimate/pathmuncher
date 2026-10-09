/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import CONSTANTS from "../constants.js";
import { NO_AUTO_CHOICE, IGNORE_MULTISELECT, kineticGatePlan, kineticImpulseSlot } from "../data/features.js";
import logger from "../logger.js";
import utils from "../utils.js";
import { ActorWriter } from "./ActorWriter.js";
import { BuildParser } from "./BuildParser.js";
import { CompendiumMatcher } from "./CompendiumMatcher.js";
import {
  FOLLOWABLE_DEITY_CATEGORIES,
  buildDeityChoices,
  deityConflicts,
  deitySanctifications,
  replaceSpecials,
} from "./DeityChoices.js";
import { EquipmentBuilder } from "./EquipmentBuilder.js";
import { EvaluationActor } from "./EvaluationActor.js";
import { FeatureNames } from "./FeatureNames.js";
import { ImportReport } from "./ImportReport.js";
import { ParsedEntry } from "./ParsedEntry.js";
import { Pf2eRules } from "./Pf2eRules.js";
import { Seasoning } from "./Seasoning.js";
import { SpellBuilder } from "./SpellBuilder.js";

export class Pathmuncher {
  #names = null;

  /** The names the build's features go by (FeatureNames), once the build is loaded. */
  get names() {
    this.#names ??= new FeatureNames({
      className: this.source.class,
      ancestry: this.source.ancestry,
      heritage: this.source.heritage,
      buildRenames: this.#buildRenames(),
    });
    return this.#names;
  }

  /** Renames that depend on the build: a champion's oath, and feats named for the class or its spellcasting. */
  #buildRenames() {
    const castingType = (dual) => utils.capitalize(this.spells.getClassSpellCastingType(dual) ?? "");
    return [
      { pbName: "Shining Oath", foundryName: `Shining Oath (${Seasoning.getChampionType(this.source.alignment)})` },
      { pbName: "Counterspell", foundryName: `Counterspell (${castingType(false)})` },
      { pbName: "Counterspell", foundryName: `Counterspell (${castingType(true)})` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${this.source.class})` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${this.source.dualClass})` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${castingType(false)} Caster)` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${castingType(true)} Caster)` },
    ];
  }

  /** The Foundry name a Pathbuilder name is looked up under: { pbName, foundryName, details, foundryValue }. */
  getFoundryFeatureName(pbName) {
    return this.names.foundryName(pbName);
  }

  static DEFAULTS = {
    addFeats: true,
    addEquipment: true,
    addSpells: true,
    adjustBlendedSlots: true,
    addMoney: true,
    addLores: true,
    addWeapons: true,
    addArmor: true,
    addTreasure: true,
    addDeity: true,
    addName: true,
    addClass: true,
    addBackground: true,
    addHeritage: true,
    addAncestry: true,
    statusCallback: null,
    addFamiliars: true,
    addFormulas: true,
  };

  constructor(actor, options = {}) {
    this.devMode = game.modules.get("pathmuncher").version === "999.0.0";
    this.actor = actor;
    this.options = foundry.utils.mergeObject(CONSTANTS.ACTOR_FLAGS, options, { inplace: false });
    this.source = null;
    // the build's entries (ParsedEntry), each with its status: what was made of it, or why nothing was
    this.parsed = {
      specials: [],
      feats: [],
      equipment: [],
      armor: [],
      weapons: [],
    };
    this.usedLocations = new Set();
    this.autoAddedFeatureIds = new Set();
    this.autoAddedFeatureItems = {};
    this.promptRules = {};
    // choices the build doesn't answer, asked together once processing ends (options.resolveUnansweredChoices)
    this.unansweredChoices = [];
    this.allFeatureRules = {};
    this.autoAddedFeatureRules = {};
    this.failedFeatureItems = {};
    this.subRuleDocuments = {};
    // the Pathbuilder entries each item's choices have taken, so its next choice takes another
    this.choiceClaims = {};
    // a Kineticist's gate thresholds, from the build (kineticGatePlan), once looked at
    this.gatePlan = null;
    this.autoFeats = [];
    this.keyAbility = null;
    this.boosts = {
      custom: false,
      class: {},
      background: {},
      ancestry: {},
    };
    this.size = "med";
    this.result = {
      character: {
        _id: this.actor.id,
        prototypeToken: {},
      },
      class: [],
      deity: [],
      heritage: [],
      ancestry: [],
      background: [],
      casters: [],
      spells: [],
      feats: [],
      weapons: [],
      armor: [],
      equipment: [],
      lores: [],
      money: [],
      treasure: [],
      adventurersPack: {
        item: null,
        contents: [
          { slug: "bedroll", qty: 1 },
          { slug: "chalk", qty: 10 },
          { slug: "flint-and-steel", qty: 1 },
          { slug: "rope", qty: 1 },
          { slug: "rations", qty: 14 },
          { slug: "torch", qty: 5 },
          { slug: "waterskin", qty: 1 },
        ],
      },
      focusPool: 0,
    };
    // what could not be matched that is not a parsed entry (the core items, spells, rituals, formulas,
    // rules): { pbName, type, details }. Parsed entries record their own status (ParsedEntry).
    this.bad = [];
    // core items the user supplied for ones no compendium has, keyed by result target (e.g. class)
    this.coreReplacements = {};
    this.statusCallback = this.options.statusCallback;
    this.compendiumMatchers = {};
    const compendiumMappings = utils.setting("USE_CUSTOM_COMPENDIUM_MAPPINGS")
      ? utils.setting("CUSTOM_COMPENDIUM_MAPPINGS")
      : CONSTANTS.CORE_COMPENDIUM_MAPPINGS;
    for (const type of Object.keys(compendiumMappings)) {
      this.compendiumMatchers[type] = new CompendiumMatcher({ type, indexFields: Pathmuncher.INDEX_FIELDS[type] });
    }

    this.immediateDiveAdd = utils.setting("USE_IMMEDIATE_DEEP_DIVE");


    // the import's stages, each working on this import's state: reading the build, the inventory,
    // spellcasting, writing the result to the actor, and the report of what could not be matched
    this.parser = new BuildParser(this);
    this.equipment = new EquipmentBuilder(this);
    this.spells = new SpellBuilder(this);
    this.writer = new ActorWriter(this);
    this.report = new ImportReport(this);
    // the unsaved actors rules are worked out on
    this.evaluation = new EvaluationActor(this);
  }

  // ---------------------------------------------------------------- the stages' public methods

  /** See BuildParser.getBuildFromJson. */
  static getBuildFromJson(jsonData) {
    return BuildParser.getBuildFromJson(jsonData);
  }

  /** See BuildParser.normaliseSource. */
  static normaliseSource(source) {
    return BuildParser.normaliseSource(source);
  }

  /** See BuildParser.detectVariants. */
  static detectVariants(source) {
    return BuildParser.detectVariants(source);
  }

  /** See ActorWriter.importOptionForItem. */
  static importOptionForItem(item) {
    return ActorWriter.importOptionForItem(item);
  }

  /** See SpellBuilder.getClassSpellCastingType. */
  getClassSpellCastingType(dual = false) {
    return this.spells.getClassSpellCastingType(dual);
  }

  /** See SpellBuilder.getClassMagicTradition. */
  getClassMagicTradition(caster) {
    return this.spells.getClassMagicTradition(caster);
  }

  /** See EquipmentBuilder.applyRunes. */
  async applyRunes(parsedItem, itemData, type) {
    return this.equipment.applyRunes(parsedItem, itemData, type);
  }

  /** See ActorWriter.findHandAddedItems. */
  findHandAddedItems() {
    return this.writer.findHandAddedItems();
  }

  /** See ActorWriter.updateActor. */
  async updateActor(options) {
    return this.writer.updateActor(options);
  }

  /** See ImportReport.getDescribedSpecials. */
  getDescribedSpecials() {
    return this.report.getDescribedSpecials();
  }

  /** See ImportReport.getUnmatchedSpecials. */
  getUnmatchedSpecials() {
    return this.report.getUnmatchedSpecials();
  }

  /** See ImportReport.getImportReport. */
  getImportReport() {
    return this.report.getImportReport();
  }

  /** See ImportReport.postImportCheck. */
  async postImportCheck() {
    return this.report.postImportCheck();
  }

  // ---------------------------------------------------------------- the rules engine and the import

  async #loadCompendiumMatchers() {
    for (const matcher of Object.values(this.compendiumMatchers)) {
      await matcher.loadCompendiums();
    }
  }

  /** Reports progress: step of total for the stage type (a Labels key), e.g. (5, 12, "Heritage"). */
  statusUpdate(step, total, type, prefixLabel) {
    if (this.statusCallback) this.statusCallback(step, total, type, prefixLabel);
  }

  /**
   * Fetches the build for a Pathbuilder JSON export id into this.source.
   * Returns true on success; failures are reported to the user and return false.
   */
  async fetchPathbuilder(pathbuilderId) {
    if (!pathbuilderId) {
      const flags = utils.getFlags(this.actor);
      pathbuilderId = flags?.pathbuilderId;
    }
    if (!pathbuilderId) {
      ui.notifications.error(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.NoId`));
      return false;
    }

    let jsonData;
    try {
      jsonData = await foundry.utils.fetchJsonWithTimeout(
        `https://pathbuilder2e.com/json.php?id=${pathbuilderId}`,
      );
    } catch (error) {
      logger.error("Unable to fetch from Pathbuilder", { pathbuilderId, error });
      ui.notifications.error(
        game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.FetchError`, { pathbuilderId }),
      );
      return false;
    }

    const build = Pathmuncher.getBuildFromJson(jsonData);
    if (!build) {
      ui.notifications.warn(
        game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.FetchFailed`, { pathbuilderId }),
      );
      return false;
    }
    this.source = build;
    return true;
  }

  #generateFoundryFeatLocation(document, feature) {
    const location = Seasoning.getFoundryFeatLocation(feature, {
      className: this.source.class,
      freeArchetype: Pathmuncher.#worldVariant("freeArchetypeVariant"),
    });
    if (location && !this.usedLocations.has(location)) {
      document.system.location = location;
      // as the system records when a feat is dropped into a slot
      foundry.utils.setProperty(document, "system.level.taken", parseInt(location.split("-").pop()));
      this.usedLocations.add(location);
    }
  }

  static #worldVariant(setting) {
    return game.system.id === "pf2e" && game.settings.settings.has(`pf2e.${setting}`)
      ? game.settings.get("pf2e", setting) === true
      : false;
  }

  /** Warns when the build used variant rules the world does not (or the other way round). */
  #warnVariantMismatch() {
    if (game.system.id !== "pf2e") return;
    const build = Pathmuncher.detectVariants(this.source);
    const mismatches = [
      ["freeArchetype", "freeArchetypeVariant", "FreeArchetype"],
      ["gradualBoosts", "gradualBoostsVariant", "GradualBoosts"],
    ].filter(([key, setting]) => build[key] !== Pathmuncher.#worldVariant(setting));
    for (const [key, , label] of mismatches) {
      ui.notifications.warn(game.i18n.localize(
        `${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.VariantMismatch.${label}.${build[key] ? "BuildOnly" : "WorldOnly"}`,
      ), { permanent: true });
    }
  }

  async #prepare() {
    this.parser.nameMap();
    this.parser.fixUps();
  }

  async #processSenses() {
    const senses = [];
    this.source.specials.forEach((special) => {
      if (special === "Low-Light Vision") {
        senses.push({ type: "lowLightVision" });
      } else if (special === "Darkvision") {
        senses.push({ type: "darkvision" });
      } else if (special === "Scent") {
        senses.push({ type: "scent" });
      }
    });
    foundry.utils.setProperty(this.result.character, "system.traits.senses", senses);
  }

  // the pf2e system has no dual class variant, so only the primary class is imported
  #warnDualClass() {
    if (!this.source.dualClass) return;
    logger.warn(`Imported character is dual class. Pathmuncher does not support dual class characters, please check the system macros`, {
      class: this.source.class,
      dualClass: this.source.dualClass,
    });
    ui.notifications.warn(`Imported character is dual class. Pathmuncher does not support dual class characters, please check the system macros`);
  }

  /** The core items a build names. If no compendium has one, the user can supply it (options.resolveMissingCore). */
  static CORE_LOOKUPS = [
    { type: "ancestries", target: "ancestry", itemType: "ancestry", option: "addAncestry" },
    { type: "heritages", target: "heritage", itemType: "heritage", option: "addHeritage" },
    { type: "backgrounds", target: "background", itemType: "background", option: "addBackground" },
    { type: "classes", target: "class", itemType: "class", option: "addClass" },
  ];

  #findCompendiumMatch(type, name) {
    const foundryName = this.getFoundryFeatureName(name).foundryName;
    return this.compendiumMatchers[type].getMatch(name, foundryName);
  }

  /**
   * The core items (ancestry, heritage, background, class) the build names but no compendium has,
   * for the import options that are on. Each comes with the compendiums searched for it.
   */
  #findMissingCore() {
    return Pathmuncher.CORE_LOOKUPS
      .filter(({ option }) => this.options[option] !== false)
      .map((lookup) => ({ ...lookup, name: this.source[lookup.target] }))
      .filter(({ type, name }) => name && name !== "Not set" && !this.#findCompendiumMatch(type, name))
      .map((lookup) => ({ ...lookup, packs: Object.keys(this.compendiumMatchers[lookup.type].packs) }));
  }

  /** Index fields beyond the defaults, for the compendium types that need them. */
  static INDEX_FIELDS = {
    deities: [
      "name", "type", "img", "system.slug", "system.category",
      "system.domains", "system.font", "system.sanctification", "system.weapons",
    ],
  };

  /**
   * The build's deity and the choices it made that the deity does not allow (Pathbuilder allows any),
   * with the deities that would allow them all: null if there is nothing to resolve.
   * { deity, choices, conflicts: [{ kind, special, value }], deities: [index entries with uuid], causes }
   */
  async findDeityConflict() {
    if (this.options.addDeity === false) return null;
    const name = this.source.deity;
    if (!name || name === "Not set") return null;
    const match = this.#findCompendiumMatch("deities", name);
    if (!match) return null;

    const choices = buildDeityChoices(this.source.specials, this.source.feats);
    const deity = { ...match.i, uuid: match.pack.getUuid(match.i._id) };
    const conflicts = deityConflicts(deity, choices);
    if (conflicts.length === 0) return null;

    const matcher = this.compendiumMatchers.deities;
    const seen = new Set();
    const deities = Object.entries(matcher.indexes)
      .flatMap(([packName, index]) => index.map((i) => ({ ...i, uuid: matcher.packs[packName].getUuid(i._id) })))
      .filter((i) => FOLLOWABLE_DEITY_CATEGORIES.includes(i.system?.category ?? "deity"))
      .filter((i) => deityConflicts(i, choices).length === 0)
      // the first compendium searched wins, as for the deity lookup itself
      .filter((i) => !seen.has(i.name) && seen.add(i.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    const causes = conflicts.some((c) => c.kind === "cause") ? await Pathmuncher.#championCauses(deity) : [];
    logger.debug("Deity conflict", { deity, choices, conflicts, deities, causes });
    return { deity, choices, conflicts, deities, causes, packs: Object.keys(matcher.packs) };
  }

  /** The champion causes a follower of the deity can take: [{ name, img, uuid, value }], value being the sanctification needed. */
  static async #championCauses(deity) {
    const pack = game.packs.get(`${game.system.id}.classfeatures`);
    if (!pack) return [];
    const index = await pack.getIndex({ fields: ["system.traits.otherTags", "system.description.value"] });
    const allowed = deitySanctifications(deity);
    return index
      .filter((i) => i.system?.traits?.otherTags?.includes("champion-cause"))
      .map((i) => {
        const tags = i.system.traits.otherTags;
        const value = tags.includes("holy") ? "holy" : tags.includes("unholy") ? "unholy" : null;
        return { name: i.name, img: i.img, uuid: pack.getUuid(i._id), value, description: i.system.description?.value ?? "" };
      })
      .filter((cause) => !cause.value || allowed.includes(cause.value))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Applies the user's answer to a deity conflict: { deity } follows another deity (an Item, from
   * a compendium or the world), { specials: { old: new } } replaces the conflicting choices, and {}
   * imports the build as it is.
   */
  #applyDeityResolution({ deity, specials } = {}) {
    if (deity) {
      this.coreReplacements.deity = deity;
      this.source.deity = deity.name;
    }
    if (specials) this.source.specials = replaceSpecials(this.source.specials, specials);
    logger.debug("Deity conflict resolved", { deity, specials, source: this.source });
  }

  async #processGenericCompendiumLookup(type, name, target, levelCap = 20) {
    logger.debug(`Checking for compendium documents for ${name} (${target}) in compendiums for ${type}`);
    let doc = this.coreReplacements[target];
    if (!doc) {
      const indexMatch = this.#findCompendiumMatch(type, name);
      if (indexMatch) doc = await indexMatch.pack.getDocument(indexMatch.i._id);
    }

    if (doc) {
      const itemData = doc.toObject();
      if (target === "class") {
        itemData.system.keyAbility.selected = this.keyAbility;
        this.#warnDualClass();
      }
      itemData._id = foundry.utils.randomID();
      // the bracketed part of the name (a choice the item makes) is settled with the item
      if (name.includes("(")) {
        const extra = name.split(")")[0].split("(").pop();
        this.parsed.specials.push(new ParsedEntry({
          name: doc.name, originalName: name, extra, rank: 99, status: ParsedEntry.STATUS.CREATED, itemId: itemData._id,
        }));
      }
      // this.#generateGrantItemData(itemData);
      this.result[target].push(itemData);
      await this.addGrantedItems(itemData, { applyFeatLocation: target !== "class", levelCap });
      return true;
    } else {
      this.bad.push({ pbName: name, type: target, details: { name, levelCap } });
      return false;
    }
  }

  async #processGrantedLookupItemsAtLevel(target, level) {
    for (const document of this.result[target]) {
      await this.#processGrantItemsAtLevel(document, level, { applyFeatLocation: target !== "class", levelCap: level });
    }
  }

  // for grants, e.g. ont he champion "Deity and Cause" where there are choices.
  // how do we determine and match these? should we?
  // "pf2e": {
  //   "itemGrants": {
  //     "adanye": {
  //       "id": "4GHcp3iaREfj2ZgN",
  //       "onDelete": "detach"
  //     },
  //     "paladin": {
  //       "id": "HGWkTEatliHgDaEu",
  //       "onDelete": "detach"
  //     }
  //   }
  // }

  // "Paladin" (granted by deity and casue)
  // "pf2e": {
  //   "grantedBy": {
  //     "id": "xnrkrJa2YE1UOAVy",
  //     "onDelete": "cascade"
  //   },
  //   "itemGrants": {
  //     "retributiveStrike": {
  //       "id": "WVHbj9LljCTovdsv",
  //       "onDelete": "detach"
  //     }
  //   }
  // }

  // retributive strike
  //   "pf2e": {
  //     "grantedBy": {
  //       "id": "HGWkTEatliHgDaEu",
  //       "onDelete": "cascade"
  //     }

  #parsedFeatureMatch(type, document, slug, { ignoreAdded, isChoiceMatch = false, featType = null } = {}) {
    if (utils.isObject(slug)) {
      if (slug.size) {
        slug = slug.size;
      } else {
        return undefined;
      }
    }
    if (type === "feats" && document) {
      const hintMatch = this.parsed[type].find((f) =>
        (!ignoreAdded || (ignoreAdded && !f.added))
        && f.isChild
        && f.nameHint
        && Seasoning.slug(document.name) === Seasoning.slug(f.nameHint)
        && this.names.entryMatches(f, slug),
      );
      if (hintMatch) {
        hintMatch.rank = -10;
        return hintMatch;
      }
    } else if (type === "equipment" && document) {
      const extraMatch = this.parsed[type].find((e) =>
        (!ignoreAdded || (ignoreAdded && !e.added))
        && e.extra
        && Seasoning.slug(e.foundryName) === (document.system.slug ?? Seasoning.slug(document.name))
        && Seasoning.slug(e.extra) === slug,
      );
      if (extraMatch) return extraMatch;
    }
    // console.warn(`Trying to find ${slug} in ${type}, ignoreAdded? ${ignoreAdded}`, this.parsed[type]);
    const candidates = this.parsed[type].filter((f) =>
      (!ignoreAdded || (ignoreAdded && !f.added))
        && (
          featType === null
          || f.type === featType
        )
        && !f.isChoice
        && this.names.entryMatches(f, slug),
    );
    // an item granted by another (document) is Pathbuilder's awarded or child entry, not one taken
    // in a slot, when the build has the feat more than once (e.g. Additional Lore from Kholo Lore
    // and as a skill feat)
    const parsedMatch = (document && candidates.length > 1
      ? candidates.find((f) => f.type === "Awarded Feat" || f.isChild)
      : undefined) ?? candidates[0];
    if (parsedMatch || !document) return parsedMatch;

    const extraMatch = this.parsed[type].find((f) =>
      // (!ignoreAdded || (ignoreAdded && !f.added))
      f.extra
      && f.added
      && !f.isChoice
      && Seasoning.slug(f.name) === (document.system.slug ?? Seasoning.slug(document.name))
      && Seasoning.slug(f.extra) === slug,
    );
    if (extraMatch) return extraMatch;

    if (isChoiceMatch) {
      // console.warn("Specials check", {
      //   document,
      //   type,
      //   slug,
      // });
      const choiceMatch = this.parsed[type].find((f) => f.isChoice && !f.added && Seasoning.slug(f.name) === slug);
      return choiceMatch;
    }
    return undefined;
  }

  #generatedResultMatch(type, slug) {
    const featMatch = this.result[type].find((f) => slug === f.system.slug);
    return featMatch;
  }

  #findAllFeatureMatch(document, slug, { ignoreAdded, isChoiceMatch = false, featType = null } = {}) {
    if (["equipment", "consumable"].includes(document.type)) {
      const equipmentMatch = this.#parsedFeatureMatch("equipment", document, slug, { ignoreAdded });
      return equipmentMatch;
    }
    // console.warn("Finding all feature matches", { document, slug, ignoreAdded, isChoiceMatch, featType });
    const featMatch = this.#parsedFeatureMatch("feats", document, slug, { ignoreAdded, featType });
    if (featMatch) return featMatch;
    const specialMatch = this.#parsedFeatureMatch("specials", document, slug, { ignoreAdded, isChoiceMatch });
    if (specialMatch) return specialMatch;
    const deityMatch = this.#generatedResultMatch("deity", slug);
    return deityMatch;
    // const classMatch = this.#generatedResultMatch("class", slug);
    // return classMatch;
  }

  /** The Pathbuilder feat or special a granted item stands for, under any name it may be listed under. */
  #grantedFeatureMatch(document, { originType = null, grantedAs = null } = {}) {
    const matchOptions = { ignoreAdded: true, featType: originType };
    for (const slug of this.names.itemSlugs(document, { grantedAs })) {
      const match = this.#findAllFeatureMatch(document, slug, matchOptions);
      if (match) return match;
    }
    return undefined;
  }

  #createGrantedItem(document, parent,
    { addGrantFlag = false, itemGrantName = null, originType = null, applyFeatLocation = false, grantedAs = null } = {},
  ) {
    logger.debug(`Adding granted item flags to ${document.name} (parent ${parent.name}) with originType "${originType}", and will applyFeatLocation? ${applyFeatLocation}`, {
      document,
      parent,
      itemGrantName,
      originType,
      applyFeatLocation,
    });
    if (addGrantFlag) {
      const camelCase = Seasoning.slugD(itemGrantName ?? document.system.slug ?? document.name);
      foundry.utils.setProperty(parent, `flags.${game.system.id}.itemGrants.${camelCase}`, { id: document._id, onDelete: "detach" });
      foundry.utils.setProperty(document, `flags.${game.system.id}.grantedBy`, { id: parent._id, onDelete: "cascade" });

      logger.debug(`${parent.name} has granted item ${document.name} (${camelCase})`, () => ({
        parent,
        itemGrantName,
        camelCase,
        flag: foundry.utils.getProperty(parent, `flags.${game.system.id}.itemGrants.${camelCase}`),
      }));
    }
    this.autoFeats.push(document);
    let resultType = "feats";
    switch (document.type) {
      case "armor":
        resultType = "armor";
        break;
      case "weapon":
        resultType = "weapons";
        break;
      // no default
    }

    this.result[resultType].push(document);
    const featureMatch = this.#grantedFeatureMatch(document, { originType, grantedAs });

    if (featureMatch) {
      logger.debug(`Found feature match for ${document.name}`, { featureMatch });
      // the match can also be the build's deity, which is not a Pathbuilder entry
      if (featureMatch instanceof ParsedEntry) {
        featureMatch.settle(ParsedEntry.STATUS.GRANTED, { itemId: document._id, reason: `granted by ${parent.name}` });
        if (applyFeatLocation) this.#generateFoundryFeatLocation(document, featureMatch);
      }
      return;
    }
    if (document.type !== "action")
      logger.warn(
        `Unable to find parsed feature match for granted feature ${document.name}. This might not be an issue, but might indicate feature duplication.`,
        { document, parent },
      );
  }


  static #getLowestChoiceRank(choices) {
    return choices.reduce((p, c) => {
      return p.rank > c.rank ? c : p;
    });
  }

  async #featureChoiceMatch(document, choices, ignoreAdded, adjustName, choiceHint = null) {
    const matches = [];
    for (const choice of choices) {
      // console.warn(`Choice eval`, {
      //   choice,
      //   document,
      //   ignoreAdded,
      //   adjustName,
      //   choiceHint,
      //   isUuid: utils.isString(choice.value) ? Pathmuncher.isUuid(choice.value) : "not a string",
      //   isString: utils.isString(choice.value),
      // });
      const doc = adjustName
        ? game.i18n.localize(choice.label)
        : utils.isString(choice.value) && Pathmuncher.isUuid(choice.value)
          ? await fromUuid(choice.value)
          : null;
      if (!doc) continue;
      const slug = adjustName
        ? Seasoning.slug(doc)
        : doc.system.slug === null
          ? Seasoning.slug(doc.name)
          : doc.system.slug;
      const featMatch = this.#findAllFeatureMatch(document, slug, { ignoreAdded, isChoiceMatch: false });
      // if (document.name === "Charm of Resistance") {
      //   console.warn({
      //     doc,
      //     document,
      //     choice,
      //     featMatch,
      //     slug,
      //     ignoreAdded,
      //     choiceHint,
      //   })
      // }
      if (featMatch) {
        matches.push({
          slug,
          rank: featMatch.rank,
          choice,
          featMatch,
        });
      }
    }
    // an item with several choices of one kind (the Commander's five tactics) takes a different
    // Pathbuilder entry for each, rather than the same one five times
    this.choiceClaims[document._id] ??= new Set();
    const claimed = this.choiceClaims[document._id];
    const open = matches.filter((m) => !claimed.has(m.featMatch));
    if (open.length > 0) {
      if (choiceHint) {
        const hintMatch = open.find((m) => m.slug === Seasoning.slug(choiceHint));
        if (hintMatch) {
          claimed.add(hintMatch.featMatch);
          return hintMatch.choice ?? hintMatch;
        }
      }
      if (this.devMode) logger.warn(`MATCHES`, { matches: open, choiceHint });
      const match = Pathmuncher.#getLowestChoiceRank(open);
      claimed.add(match.featMatch);
      const featMatch = this.#findAllFeatureMatch(document, match.slug, { ignoreAdded });
      if (adjustName && featMatch instanceof ParsedEntry) {
        featMatch.settle(ParsedEntry.STATUS.CHOSEN, { itemId: document._id, reason: `a choice on ${document.name}` });
      }
      logger.debug("Choices evaluated", { choices, document, featMatch, match, matches: open, choiceHint });
      return match.choice;
    } else {
      return undefined;
    }
  }

  /** What a choice is called for matching: its value, or its label when the value is data (a dragon's). */
  static #choiceKey(choice) {
    return utils.isString(choice.value) ? choice.value : Seasoning.slug(game.i18n.localize(choice.label ?? ""));
  }

  async #featureChoiceMatchNoUUID(document, choices, cleansedChoiceSet) {
    const matches = [];
    for (const choice of choices) {
      const featMatch = this.#findAllFeatureMatch(document, Pathmuncher.#choiceKey(choice), { ignoreAdded: true, isChoiceMatch: true });
      if (featMatch) {
        matches.push({
          rank: featMatch.rank,
          choice,
        });
      }
    }
    if (matches.length > 0) {
      const match = Pathmuncher.#getLowestChoiceRank(matches);
      const featMatch = this.#findAllFeatureMatch(document, Pathmuncher.#choiceKey(match.choice), { ignoreAdded: true, isChoiceMatch: true });
      if (featMatch instanceof ParsedEntry) {
        featMatch.settle(ParsedEntry.STATUS.CHOSEN, { itemId: document._id, reason: `a choice on ${document.name}` });
      }
      if (featMatch) match.choice.nouuid = true;
      logger.debug("No UUID Choices evaluated", { choices, cleansedChoiceSet, document, featMatch, match, matches });
      return match.choice;
    } else {
      return undefined;
    }
  }

  /**
   * A choice between skills (e.g. the Fighter's Acrobatics or Athletics) that the build answers:
   * exactly one of the offered skills is trained in its proficiencies. Pathbuilder does not export
   * the choice itself, only its effect.
   */
  #skillChoiceFromProficiencies(choices) {
    const skills = Object.keys(CONFIG.PF2E?.skills ?? {});
    // a choice's value is the skill ("athletics") or the path it trains ("system.skills.nature.rank", Mastermind)
    const skillOf = (choice) => (utils.isString(choice.value)
      ? [choice.value, choice.value.match(/^system\.skills\.([a-z]+)\.rank$/)?.[1]].find((s) => skills.includes(s))
      : undefined);
    if (choices.length < 2 || !choices.every((c) => skillOf(c))) return undefined;
    const trained = choices.filter((c) => (this.source.proficiencies?.[skillOf(c)] ?? 0) > 0);
    if (trained.length !== 1) return undefined;
    trained[0].nouuid = true;
    return trained[0];
  }

  /**
   * A choice between items (Surki Weapon Familiarity's axe or hammer) that the build answers by
   * carrying exactly one of them. Pathbuilder does not export the choice itself.
   */
  #choiceFromCarriedItems(choiceSet, choices) {
    if (!Pathmuncher.CARRIED_CHOICE_TYPES.includes(choiceSet.choices?.itemType)) return undefined;
    const carried = new Set([
      ...this.source.weapons.map((w) => w.name),
      ...this.source.armor.map((a) => a.name),
      ...this.source.equipment.map((e) => e[0]),
    ].filter(utils.isString).map((name) => Seasoning.slug(name)));
    const matches = choices.filter((c) => utils.isString(c.value) && carried.has(Seasoning.slug(game.i18n.localize(c.label ?? ""))));
    if (new Set(matches.map((c) => c.value)).size !== 1) return undefined;
    const choice = matches[0];
    if (!Pathmuncher.isUuid(choice.value)) choice.nouuid = true;
    return choice;
  }

  // each kinetic gate threshold's number, by its slug
  static GATE_THRESHOLDS = { "gates-threshold": 1, "second-gates-threshold": 2, "third-gates-threshold": 3, "fourth-gates-threshold": 4 };

  // the level of each gate threshold, by its number
  static THRESHOLD_LEVELS = [5, 9, 13, 17];

  /**
   * Which Pathbuilder impulse slot (kineticImpulseSlot's form) a kinetic gate's or threshold's impulse
   * choice is, or null for any other choice: a threshold's Expand the Portal impulse, an element gate's
   * impulse from a Fork the Path (the threshold that granted the gate), or one of the first gate's.
   */
  #kineticImpulseSlotFor(document, flag) {
    const slug = document.system.slug ?? Seasoning.slug(document.name);
    const threshold = Pathmuncher.GATE_THRESHOLDS[slug];
    if (threshold) return flag === "impulseExpand" ? { threshold: Pathmuncher.THRESHOLD_LEVELS[threshold - 1], path: "expand" } : null;
    const element = slug.match(/^(air|earth|fire|metal|water|wood)-gate$/)?.[1];
    if (!element || !["impulseOne", "impulseTwo"].includes(flag)) return null;
    const granter = this.#resultItem(document.flags?.[game.system.id]?.grantedBy?.id);
    const forkedAt = Pathmuncher.GATE_THRESHOLDS[granter?.system.slug ?? Seasoning.slug(granter?.name)];
    if (forkedAt) return { threshold: Pathmuncher.THRESHOLD_LEVELS[forkedAt - 1], path: "fork" };
    const specials = this.source.specials;
    if (!specials.includes("Dual Gate")) return { gate: "single", index: flag === "impulseOne" ? 0 : 1 };
    // a dual gate's elements are the first two Pathbuilder lists after it, in its order
    const order = specials.slice(specials.indexOf("Dual Gate")).filter((s) => (/ Element$/).test(s)).slice(0, 2)
      .map((s) => s.split(" ")[0].toLowerCase());
    return { gate: "dual", element: order.indexOf(element) + 1 };
  }

  /** An item in the import's result, by id. */
  #resultItem(id) {
    if (!id) return null;
    return Object.values(this.result).filter(Array.isArray).flat().find((item) => item?._id === id) ?? null;
  }

  /**
   * A kinetic gate or threshold impulse choice, from the slot Pathbuilder records each impulse under:
   * { choice } with the build's impulse for this slot if the choice offers it, and the choices left to
   * match otherwise, without any feat the build took in another slot (so the gate cannot take the
   * impulse an Expand the Portal or a class feat slot took). Just { choices } for any other choice.
   */
  #kineticImpulseChoice(document, choiceSet, choices) {
    const slot = this.#kineticImpulseSlotFor(document, Pathmuncher.#ruleFlag(document, choiceSet));
    if (!slot) return { choices };
    const same = (a, b) => Object.keys({ ...a, ...b }).every((k) => a[k] === b[k]);
    const impulses = this.parsed.feats.filter((entry) => entry.type === "Kineticist Feat")
      .map((entry) => ({ entry, slot: kineticImpulseSlot(entry.featChoiceRef) }))
      .filter((impulse) => impulse.slot);
    const own = impulses.find((impulse) => same(impulse.slot, slot));
    const others = new Set(this.parsed.feats.filter((entry) => entry !== own?.entry).map((entry) => Seasoning.slug(entry.name)));
    const nameOf = (c) => Seasoning.slug(game.i18n.localize(c.label ?? ""));
    return {
      choice: own ? choices.find((c) => nameOf(c) === Seasoning.slug(own.entry.name)) : undefined,
      choices: choices.filter((c) => !others.has(nameOf(c))),
    };
  }

  /**
   * A Kineticist's gate choices, from the thresholds the build lists in order (kineticGatePlan): the
   * element a threshold that expands the portal takes, and the junction the Gate Junction it grants
   * takes for that element. Pathbuilder names the junction with its element ("Earth Gate Junction:
   * Critical Blast"), which name matching alone cannot tie to the right Gate Junction.
   */
  #kineticGateChoice(document, choiceSet, choices) {
    const slug = document.system.slug ?? Seasoning.slug(document.name);
    const flag = Pathmuncher.#ruleFlag(document, choiceSet);
    const threshold = Pathmuncher.GATE_THRESHOLDS[slug];
    if (!(threshold && flag === "element") && !(slug === "gate-junction" && flag === "junction")) return undefined;
    this.gatePlan ??= kineticGatePlan(this.source.specials);

    if (threshold) {
      const expansion = this.gatePlan.find((e) => e.threshold === threshold && e.element);
      return choices.find((c) => c.value === expansion?.element);
    }

    // the junction's element is its first choice, preselected from the threshold that granted it
    const element = document.system.rules.find((r) => r.key === "ChoiceSet" && r.flag === "element")?.selection
      ?? document.flags?.[game.system.id]?.rulesSelections?.element;
    const expansion = this.gatePlan.find((e) => e.element === element && e.junction && !e.claimed);
    const choice = expansion && choices.find((c) => Seasoning.slug(game.i18n.localize(c.label ?? "")) === Seasoning.slug(expansion.junction));
    if (!choice) return undefined;
    expansion.claimed = true;
    // the junction's special, and the entries Pathbuilder's name for it added, are answered by this choice
    for (const name of [expansion.special, ...expansion.additions]) {
      this.parsed.specials.find((entry) => entry.originalName === name && !entry.added)
        ?.settle(ParsedEntry.STATUS.CHOSEN, { itemId: document._id, reason: `a choice on ${document.name}` });
    }
    choice.nouuid = true;
    return choice;
  }

  /**
   * A cleric's or champion's sanctification, which Pathbuilder exports as the cleric's "Holy",
   * "Unholy" or "Neither", or as the sanctification a champion's cause needs ("Grandeur Cause (Holy)").
   */
  #sanctificationFromBuild(document, choiceSet, choices) {
    if (Pathmuncher.#ruleFlag(document, choiceSet) !== "sanctification") return undefined;
    const { sanctification, cause } = buildDeityChoices(this.source.specials);
    const value = sanctification?.value ?? cause?.value;
    const choice = choices.find((c) => c.value === value);
    if (choice) choice.nouuid = true;
    return choice;
  }

  /** The flag pf2e stores a rule's selection under: its flag, else its slug, else the item's slug or name. */
  static #ruleFlag(document, ruleEntry) {
    return utils.isString(ruleEntry.flag) && ruleEntry.flag.length > 0
      ? ruleEntry.flag.replace(/[^-a-z0-9]/gi, "")
      : Seasoning.slugD(ruleEntry.slug ?? document.system.slug ?? document.name);
  }

  /** Choices that other choices read during processing (the champion's cause needs the sanctification), so are never held back. */
  static UNDEFERRED_CHOICE_FLAGS = ["deity", "sanctification"];

  static CARRIED_CHOICE_TYPES = ["weapon", "armor", "shield", "equipment", "consumable", "backpack", "treasure"];

  /**
   * Holds back a choice the build doesn't answer, so it can be asked with the others once processing
   * ends instead of prompting now. Only when the importer can ask (options.resolveUnansweredChoices),
   * and only for a choice nothing else in processing reads: one whose selection names the item a
   * later rule of the item grants, or that another item's choice depends on (a cleric's deity), is
   * still asked straight away.
   */
  /** The name of an item in the import's result, by id. */
  #resultItemName(id) {
    return this.#resultItem(id)?.name ?? null;
  }

  /**
   * What other copies of the same feat already chose for this choice: a feat that can be taken more
   * than once (pf2e's maxTakable is null or above 1: Assurance, Additional Lore) takes a different
   * option each time. Class features granted more than once (a Kineticist's Gate Junction) can repeat
   * an option, so are left alone. [{ value, label, source }], label from the choices offered and
   * source the item that granted that copy, if one did.
   */
  #takenElsewhere(document, ruleEntry, choices) {
    const maxTakable = document.system.maxTakable;
    if (document.type !== "feat" || !(maxTakable === null || maxTakable > 1)) return [];
    const slug = document.system.slug ?? Seasoning.slug(document.name);
    const flag = Pathmuncher.#ruleFlag(document, ruleEntry);
    return this.result.feats
      .filter((other) => other._id !== document._id && (other.system.slug ?? Seasoning.slug(other.name)) === slug)
      .map((other) => {
        const rule = (other.system.rules ?? []).find((r) => r.key === "ChoiceSet" && Pathmuncher.#ruleFlag(other, r) === flag);
        const value = other.flags?.[game.system.id]?.rulesSelections?.[flag] ?? rule?.selection;
        const choice = choices.find((c) => c.value === value);
        return {
          value,
          label: choice ? game.i18n.localize(choice.label ?? "") : String(value),
          source: this.#resultItemName(other.flags?.[game.system.id]?.grantedBy?.id),
        };
      })
      .filter((taken) => utils.isString(taken.value));
  }

  #deferChoice(document, ruleEntry, choices, taken = []) {
    if (!this.options.resolveUnansweredChoices) return false;
    if (this.unansweredChoices.some((c) => c.ruleEntry === ruleEntry)) return true;
    if (choices.length < 2 || !choices.every((c) => utils.isString(c.value))) return false;
    const flag = Pathmuncher.#ruleFlag(document, ruleEntry);
    const readLater = Pathmuncher.UNDEFERRED_CHOICE_FLAGS.includes(flag)
      || document.system.rules.some((r) => r !== ruleEntry && ["GrantItem", "ChoiceSet"].includes(r.key)
        && JSON.stringify(r).includes(`rulesSelections.${flag}`));
    if (readLater) return false;
    this.unansweredChoices.push({
      id: foundry.utils.randomID(),
      document,
      ruleEntry,
      flag,
      taken,
      choices: choices.map((c) => {
        const label = game.i18n.localize(c.label ?? "");
        return { value: c.value, label, img: c.img, uuid: this.#choiceUuid(ruleEntry, c.value, label) };
      }),
    });
    logger.debug(`Deferring the choice for ${document.name}`, { ruleEntry, choices });
    return true;
  }

  /** The item a choice names, for its description: its value, or for slugs (a weapon's) the equipment of that name. */
  #choiceUuid(ruleEntry, value, label) {
    if (Pathmuncher.isUuid(value)) return value;
    if (!Pathmuncher.CARRIED_CHOICE_TYPES.includes(ruleEntry.choices?.itemType)) return undefined;
    const match = this.compendiumMatchers.equipment.getMatch(label, label);
    return match ? match.pack.getUuid(match.i._id) : undefined;
  }

  /**
   * The choices held back by #deferChoice, for the user to answer:
   * [{ id, item: { name, img, type }, prompt, choices: [{ value, label, img, uuid }] }]
   */
  get unansweredChoiceList() {
    return this.unansweredChoices.map(({ id, document, ruleEntry, choices, taken }) => ({
      id,
      item: { name: document.name, img: document.img, type: document.type },
      prompt: utils.isString(ruleEntry.prompt) ? game.i18n.localize(ruleEntry.prompt) : "",
      // where the item comes from, and what other copies of it already chose
      origin: this.#resultItemName(document.flags?.[game.system.id]?.grantedBy?.id),
      taken: taken.map(({ label, source }) => ({ label, source })),
      choices,
    }));
  }

  /** Sets the selections the user made ({ id: value }) as pf2e would; anything unanswered is asked by pf2e during the import. */
  #applyChoiceAnswers(answers) {
    // the same option picked for two copies of a feat (two Assurances): the second is left to the system
    const picked = new Set();
    for (const entry of this.unansweredChoices) {
      const choice = entry.choices.find((c) => c.value === answers[entry.id]);
      if (!choice) continue;
      const key = `${entry.document.system.slug ?? entry.document.name}|${entry.flag}|${choice.value}`;
      if (picked.has(key)) continue;
      picked.add(key);
      const { document, ruleEntry, flag } = entry;
      ruleEntry.flag = flag;
      ruleEntry.selection = choice.value;
      foundry.utils.setProperty(document, `flags.${game.system.id}.rulesSelections.${flag}`, choice.value);
      if (ruleEntry.actorFlag) foundry.utils.setProperty(this.result.character, `flags.${game.system.id}.${flag}`, choice.value);
      document.name = Pathmuncher.choiceAdjustedName(document.name, ruleEntry, choice, flag);
      this.promptRules[document._id] = (this.promptRules[document._id] ?? []).filter((r) => r !== ruleEntry);
    }
    logger.debug("Choices answered", { answers, unanswered: this.unansweredChoices });
  }

  static getFlag(document, ruleSet) {
    return typeof ruleSet.flag === "string" && ruleSet.flag.length > 0
      ? ruleSet.flag.replace(/[^-a-z0-9]/gi, "")
      : Seasoning.slugD(document.system.slug ?? document.system.name ?? document.name);
  }

  async #evaluateChoices(document, choiceSet, choiceHint, processedRules) {
    logger.debug(`Evaluating choices for ${document.name}`, () => ({
      document,
      choiceSet: foundry.utils.deepClone(choiceSet),
      choiceHint: foundry.utils.deepClone(choiceHint),
      processedRules: foundry.utils.deepClone(processedRules),
    }));
    const tempActor = this.evaluation.build(document, { rules: processedRules });

    const cleansedChoiceSet = foundry.utils.deepClone(choiceSet);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const choiceSetRules = Pf2eRules.ruleElement(cleansedChoiceSet, item);
      const rollOptions = Pf2eRules.rollOptions(tempActor, item);
      const offered = await Pf2eRules.choices(choiceSetRules, rollOptions);
      // a feat taken more than once takes a different option each time: not one another copy has
      // (unless that leaves nothing, when the system's choices stand)
      const open = (taken) => offered.filter((c) => !taken.some((t) => t.value === c.value));
      const allTaken = this.#takenElsewhere(document, choiceSet, offered);
      const taken = open(allTaken).length > 0 ? allTaken : [];
      // a kinetic impulse choice takes the impulse the build took for its slot, and never another slot's
      const impulse = this.#kineticImpulseChoice(document, choiceSet, open(taken));
      if (impulse.choice) {
        logger.debug(`Kinetic impulse for ${document.name} from the build's slot`, { impulse });
        impulse.choice.choiceQueryResults = foundry.utils.deepClone(offered);
        return impulse.choice;
      }
      const choices = impulse.choices;
      if (taken.some((t) => t.value === choiceSet.selection)) {
        delete choiceSet.selection;
        delete cleansedChoiceSet.selection;
      }

      logger.debug("Starting choice evaluation", {
        document,
        choiceSet,
        item,
        choiceSetRules,
        rollOptions,
        choices,
        this: this,
        tempActor,
        choiceHint,
      });

      logger.debug("Evaluating choiceset", cleansedChoiceSet);
      const gateMatch = this.#kineticGateChoice(document, cleansedChoiceSet, choices);
      if (gateMatch) {
        logger.debug(`Kinetic gate choice for ${document.name} from the build`, { gateMatch, choices });
        return gateMatch;
      }
      const choiceMatch = await this.#featureChoiceMatch(document, choices, true, !!cleansedChoiceSet.adjustName, choiceHint);
      logger.debug("choiceMatch result", choiceMatch);
      if (choiceMatch) {
        choiceMatch.choiceQueryResults = foundry.utils.deepClone(offered);
        return choiceMatch;
      }

      // the options are always a list (Pf2eRules.choices), whatever the rule's choices are
      const featureMatch = await this.#featureChoiceMatchNoUUID(document, choices, cleansedChoiceSet);
      if (featureMatch) {
        return featureMatch;
      }
      const skillMatch = this.#skillChoiceFromProficiencies(choices);
      if (skillMatch) {
        logger.debug(`Skill choice for ${document.name} from the build's proficiencies`, { skillMatch, choices });
        return skillMatch;
      }

      const sanctificationMatch = this.#sanctificationFromBuild(document, cleansedChoiceSet, choices);
      if (sanctificationMatch) {
        logger.debug(`Sanctification for ${document.name} from the build`, { sanctificationMatch, choices });
        return sanctificationMatch;
      }

      const carriedMatch = this.#choiceFromCarriedItems(cleansedChoiceSet, choices);
      if (carriedMatch) {
        logger.debug(`Item choice for ${document.name} from the build's inventory`, { carriedMatch, choices });
        return carriedMatch;
      }

      if (this.#deferChoice(document, choiceSet, choices, taken)) return undefined;

      const tempSet = foundry.utils.deepClone(choiceSet);
      logger.debug(`Starting dynamic selection for ${document.name}`, { document, choiceSet, tempSet, Pathmuncher: this });
      // the system asks with only the options still open
      const selectionRules = taken.length > 0 ? Pf2eRules.ruleElement({ ...cleansedChoiceSet, choices }, item) : choiceSetRules;
      await Pf2eRules.makeSelection(selectionRules, { item, actor: tempActor, ruleSource: tempSet });
      if (this.devMode) logger.warn("chociesetdata", {
        choiceSetRules,
        selection: choiceSetRules.selection,
        choiceSet: foundry.utils.deepClone(choiceSet),
        tempSet: foundry.utils.deepClone(tempSet),
      });
      if (tempSet.selection) {
        const lookedUpChoice = choices.find((c) => c.value === tempSet.selection);
        logger.debug("lookedUpChoice", lookedUpChoice);
        if (lookedUpChoice) lookedUpChoice.choiceQueryResults = foundry.utils.deepClone(offered);
        // set some common lookups here, e.g. deities are often not set!
        if (lookedUpChoice && cleansedChoiceSet.flag === "deity") {
          if (lookedUpChoice.label && lookedUpChoice.label !== "") {
            foundry.utils.setProperty(this.result.character, "system.details.deity.value", lookedUpChoice.label);
            await this.#processGenericCompendiumLookup("deities", lookedUpChoice.label, "deity");
            const camelCase = Seasoning.slugD(this.result.deity[0].system.slug);
            foundry.utils.setProperty(document, `flags.${game.system.id}.itemGrants.${camelCase}`, {
              id: this.result.deity[0]._id,
              onDelete: "detach",
            });
            foundry.utils.setProperty(this.result.deity[0], `flags.${game.system.id}.grantedBy`, { id: document._id, onDelete: "cascade" });
            this.autoAddedFeatureIds.add(`${lookedUpChoice.value.split(".").pop()}deity`);
          }
        }
        return lookedUpChoice;
      }
    } catch (err) {
      logger.error("Whoa! Something went major bad wrong during choice evaluation", {
        err,
        tempActor: tempActor.toObject(),
        document: foundry.utils.duplicate(document),
        choiceSet: foundry.utils.duplicate(cleansedChoiceSet),
      });
      throw err;
    }

    logger.debug("Evaluate Choices failed", { choiceSet: cleansedChoiceSet, tempActor, document });
    return undefined;
  }

  async #resolveInjectedUuid(document, ruleEntry, processedRules = []) {
    const tempActor = this.evaluation.build(document, { rules: processedRules });
    const cleansedRuleEntry = foundry.utils.deepClone(ruleEntry);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const grantItemRule = Pf2eRules.ruleElement(cleansedRuleEntry, item);
      const uuid = Pf2eRules.grantedUuid(grantItemRule);
      const tempItems = await Pf2eRules.grantedItems(grantItemRule, { item, actor: tempActor, ruleSource: cleansedRuleEntry });

      logger.debug("uuid selection", {
        document,
        choiceSet: ruleEntry,
        item,
        grantItemRule,
        uuid,
        tempItems,
      });

      if (uuid || tempItems.length > 0) {
        return { uuid, grantObject: tempItems[0] };
      }
    } catch (err) {
      logger.error("Whoa! Something went major bad wrong during uuid evaluation", {
        err,
        tempActor: tempActor.toObject(),
        document: foundry.utils.duplicate(document),
        ruleEntry: foundry.utils.duplicate(cleansedRuleEntry),
      });
      throw err;
    }

    logger.debug("Evaluate UUID failed", { choiceSet: cleansedRuleEntry, tempActor, document });
    return undefined;
  }

  async #checkRule(document, rule, otherDocuments = []) {
    logger.debug("Checking rule", { document, rule, otherDocuments });
    // the granted item, on an actor that has the granting item with the rules it has kept so far
    const tempActor = this.evaluation.build(document, { alongside: otherDocuments });
    const cleansedRule = foundry.utils.deepClone(rule);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const ruleElement = Pf2eRules.ruleElement(cleansedRule, item);
      const rollOptions = Pf2eRules.rollOptions(tempActor, item);

      if (rule.predicate && !Pf2eRules.predicatePasses(ruleElement, rollOptions)) return false;

      const choices = cleansedRule.key === "ChoiceSet"
        ? await Pf2eRules.choices(ruleElement, rollOptions, [item])
        : [Pf2eRules.resolvedValue(ruleElement)];

      const isGood = cleansedRule.key === "ChoiceSet"
        ? (await this.#featureChoiceMatch(document, choices, false)) !== undefined
        : Pf2eRules.applies(ruleElement, rollOptions);

      logger.debug("Checking rule", {
        tempActor,
        cleansedRule,
        item,
        ruleElement,
        rollOptions,
        choices,
        isGood,
      });
      return isGood;
    } catch (err) {
      logger.error("Something has gone most wrong during rule checking", {
        document,
        rule: cleansedRule,
        tempActor,
      });
      throw err;
    }
  }

  async #checkRulePredicate(document, rule, processedRules) {
    const tempActor = this.evaluation.build(document, { rules: processedRules });
    const cleansedRule = foundry.utils.deepClone(rule);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const ruleElement = Pf2eRules.ruleElement(cleansedRule, item);
      return rule.predicate ? Pf2eRules.predicatePasses(ruleElement, Pf2eRules.rollOptions(tempActor, item)) : true;
    } catch (err) {
      logger.error("Something has gone most wrong during rule predicate checking", {
        document,
        rule: cleansedRule,
        tempActor,
      });
      throw err;
    }
  }

  static adjustDocumentName(featureName, label) {
    const localLabel = game.i18n.localize(label);
    if (featureName.trim().toLowerCase() === localLabel.trim().toLowerCase()) return featureName;
    const name = `${featureName} (${localLabel})`;
    const pattern = (() => {
      const escaped = RegExp.escape(localLabel);
      return new RegExp(`\\(${escaped}\\) \\(${escaped}\\)$`);
    })();
    logger.verbose("adjustDocumentName", { featureName, label, localLabel, name });
    return name.replace(pattern, `(${localLabel})`);
  }

  /**
   * The item name after a ChoiceSet selection, as the system names it: "Name (Choice)" when the rule's
   * adjustName is true, the rule's own pattern when it is a string, otherwise unchanged.
   */
  static choiceAdjustedName(name, ruleEntry, choice, flag) {
    if (ruleEntry.adjustName === true) return Pathmuncher.adjustDocumentName(name, choice.label);
    if (utils.isString(ruleEntry.adjustName)) {
      return game.i18n.format(ruleEntry.adjustName, { [ruleEntry.flag ?? flag]: game.i18n.localize(choice.label) });
    }
    return name;
  }

  static isUuid(uuid) {
    return uuid.match(/Compendium\.(?<origin>[^.]+)\.(?<packName>[^.]+)\.(?<docType>Actor|JournalEntry|Item|Macro|RollTable)\.(?<docName>[^.]+)/g);
  }

  /**
   * Runs one step of working out a rule from the build: { result }, or { failed: true } if the
   * system's rule code throws. A failure is reported, and the rule is left for the system to apply
   * (or ask about) when the item is created, so one rule cannot stop the whole import.
   */
  async #tryRuleStep(document, ruleEntry, step) {
    try {
      return { result: await step() };
    } catch (error) {
      logger.error(`Unable to work out the ${ruleEntry.key} rule on ${document.name}, leaving it to the system`, {
        error, document, ruleEntry,
      });
      this.bad.push({ pbName: document.name, type: "rule", details: { key: ruleEntry.key, error: error?.message ?? String(error) } });
      return { failed: true };
    }
  }

  // eslint-disable-next-line complexity, no-unused-vars
  async #addGrantedRules(document, originType = null, choiceHint = null) {
    if (document.system.rules.length === 0) return;
    logger.debug(`addGrantedRules for ${document.name}`, () => foundry.utils.duplicate(document));

    if (
      !["equipment", "consumable", "armor", "backpack", "kit", "treasure", "weapon", "shield"].includes(document.type)
      && foundry.utils.hasProperty(document, "system.level.value")
      && document.system.level.value > foundry.utils.getProperty(this.result.character, "system.details.level.value")
      // ancient elf can grant a dedication at level 1
      && !(document.system.slug ?? Seasoning.slug(document.name)).endsWith("-dedication")
    ) {
      logger.warn(`Not granting due to level restrictions`, {
        document, originType,
        choiceHint,
        character: foundry.utils.getProperty(this.result.character, "system"),
        characterLevel: foundry.utils.getProperty(this.result.character, "system.details.level.value"),
      });
      return;
    }

    const rulesToKeep = [];
    this.allFeatureRules[document._id] = foundry.utils.deepClone(document.system.rules);
    this.autoAddedFeatureRules[document._id] = [];
    this.promptRules[document._id] = [];


    const addRuleToKeep = (ruleEntry) => {
      if (rulesToKeep.includes(ruleEntry)) return;
      rulesToKeep.push(ruleEntry);
    };

    for (const ruleEntry of document.system.rules) {
      logger.debug(`Ping ${document.name} rule key: ${ruleEntry.key}`, () => foundry.utils.deepClone(ruleEntry));
      if (!["ChoiceSet", "GrantItem"].includes(ruleEntry.key)) {
        // size work around due to Pathbuilder not always adding the right size to json
        if (ruleEntry.key === "CreatureSize") this.size = ruleEntry.value;
        this.autoAddedFeatureRules[document._id].push(ruleEntry);
        logger.debug(`Automatically keeping ${document.name} non-choice/grant rule key: ${ruleEntry.key}`);
        addRuleToKeep(ruleEntry);
        continue;
      }
      if (NO_AUTO_CHOICE().includes(document.name)) {
        logger.debug(`Deliberately skipping ${document.name} auto choice detection`);
        addRuleToKeep(ruleEntry);
        continue;
      }
      logger.debug(`Checking ${document.name} rule key: ${ruleEntry.key}`, () => ({
        ruleEntry: foundry.utils.deepClone(ruleEntry),
        docRules: foundry.utils.deepClone(document.system.rules),
        document: foundry.utils.deepClone(document),
      }));

      if (ruleEntry.key === "ChoiceSet" && ruleEntry.predicate) {
        logger.debug(`Checking for predicates`, () => foundry.utils.deepClone({
          ruleEntry,
          document,
          rulesToKeep,
        }));
        const predicateCheck = await this.#tryRuleStep(
          document,
          ruleEntry,
          () => this.#checkRulePredicate(foundry.utils.duplicate(document), ruleEntry, rulesToKeep),
        );
        if (predicateCheck.failed) {
          addRuleToKeep(ruleEntry);
          continue;
        }
        const testResult = predicateCheck.result;
        if (!testResult) {
          const data = { document, ruleEntry, testResult };
          logger.debug(
            `The test failed for ${document.name} rule key: ${ruleEntry.key} (This is probably not a problem).`,
            () => foundry.utils.deepClone(data),
          );
          addRuleToKeep(ruleEntry);
          continue;
        }
        logger.debug(`The predicate test succeeded`);
      }

      const evaluation = await this.#tryRuleStep(document, ruleEntry, async () => {
        const choice = ruleEntry.key === "ChoiceSet"
          ? await this.#evaluateChoices(document, ruleEntry, choiceHint, rulesToKeep)
          : undefined;
        const { uuid, grantObject } = ruleEntry.key === "GrantItem"
          ? await this.#resolveInjectedUuid(document, ruleEntry, rulesToKeep)
          : { uuid: choice?.value, grantObject: undefined };
        const ruleFeature = ruleEntry.key === "GrantItem" && grantObject
          ? grantObject
          : uuid && typeof uuid === "string" && Pathmuncher.isUuid(uuid) ? await fromUuid(uuid) : undefined;
        return { choice, uuid, grantObject, ruleFeature };
      });
      if (evaluation.failed) {
        addRuleToKeep(ruleEntry);
        continue;
      }
      const { choice, uuid, grantObject, ruleFeature } = evaluation.result;

      if (choice?.choiceQueryResults) {
        // eslint-disable-next-line require-atomic-updates
        ruleEntry.choiceQueryResults = choice.choiceQueryResults;
      }

      const documentFlagName = Pathmuncher.getFlag(document, ruleEntry);
      // if (flagName && choice?.value && !foundry.utils.hasProperty(document, `flags.pf2e.rulesSelections.${flagName}`)) {
      //   foundry.utils.setProperty(document, `flags.pf2e.rulesSelections.${flagName}`, choice.value);
      // }

      logger.debug(`UUID for ${document.name}: "${uuid}"`, { document, ruleEntry, choice, uuid, grantObject });
      if (ruleFeature) {
        const featureDoc = ruleFeature.toObject();
        // const featureDocFlagName = Pathmuncher.getFlag(featureDoc, ruleEntry);
        const featureDocFlagName = Seasoning.slugD(featureDoc.system.slug ?? featureDoc.system.name ?? featureDoc.name);
        featureDoc._id = foundry.utils.randomID();
        if (featureDoc.system.rules) this.allFeatureRules[featureDoc._id] = foundry.utils.deepClone(featureDoc.system.rules);
        foundry.utils.setProperty(featureDoc, "flags.pathmuncher.origin.uuid", uuid);
        logger.debug(`Found rule feature ${featureDoc.name} for ${document.name} for`, ruleEntry);

        if (choice) {
          ruleEntry.selection = choice.value;
          foundry.utils.setProperty(document, `flags.${game.system.id}.rulesSelections.${documentFlagName}`, choice.value);
          if (choice.actorFlag) {
            foundry.utils.setProperty(this.result.character, `flags.${game.system.id}.${documentFlagName}`, choice.value);
          }
        }

        if (utils.isString(ruleEntry.rollOption)) {
          const rollFlag = Seasoning.slug(featureDoc.system.slug ?? featureDoc.system.name ?? featureDoc.name);
          ruleEntry.rollOption = `${ruleEntry.rollOption}:${rollFlag}`;
        }

        const addedFlag = ruleEntry.key === "GrantItem" && !ruleEntry.flag;
        if (addedFlag) ruleEntry.flag = featureDocFlagName;

        if (ruleEntry.predicate && ruleEntry.key === "GrantItem") {
          logger.debug(`Checking for grantitem predicates`, {
            ruleEntry,
            document,
            featureDoc,
          });
          const tempDoc = foundry.utils.deepClone(document);
          tempDoc.system.rules = foundry.utils.deepClone(rulesToKeep);
          const ruleCheck = await this.#tryRuleStep(document, ruleEntry, () => this.#checkRule(featureDoc, ruleEntry, [tempDoc]));
          // without pathmuncher's flag the system grants it, or not, when the item is created
          if (ruleCheck.failed && addedFlag) delete ruleEntry.flag;
          if (ruleCheck.failed) {
            addRuleToKeep(ruleEntry);
            continue;
          }
          const testResult = ruleCheck.result;
          if (!testResult) {
            const data = { document, ruleEntry, featureDoc, testResult };
            logger.debug(
              `The test failed for ${document.name} rule key: ${ruleEntry.key} (This is probably not a problem).`,
              data,
            );
            addRuleToKeep(ruleEntry);
            // this.autoAddedFeatureRules[document._id].push(ruleEntry);
            continue;
          } else {
            logger.debug(`The test passed for ${document.name} rule key: ${ruleEntry.key}`, ruleEntry);
            // this.autoAddedFeatureRules[document._id].push(ruleEntry);
            // eslint-disable-next-line max-depth
            // if (!ruleEntry.flag) ruleEntry.flag = Seasoning.slugD(document.name);
            ruleEntry.pathmuncherImport = true;
            addRuleToKeep(ruleEntry);
          }
        }

        // foundry.utils.setProperty(ruleEntry, `preselectChoices.${ruleEntry.flag}`, ruleEntry.selection ?? ruleEntry.uuid);

        if (this.autoAddedFeatureIds.has(`${ruleFeature.id}${ruleFeature.type}`) && !IGNORE_MULTISELECT.includes(featureDoc.name)) {
          logger.debug(`Feature ${featureDoc.name} found for ${document.name}, but has already been added (${ruleFeature.id})`, ruleFeature);
          // this.autoAddedFeatureRules[document._id].push(ruleEntry);
          // addRuleToKeep(ruleEntry);
          if (ruleEntry.key === "GrantItem" && ruleEntry.flag) {
            this.autoAddedFeatureRules[document._id].push(ruleEntry);
            addRuleToKeep(ruleEntry);
          }
          continue;
        } else if (["GrantItem"].includes(ruleEntry.key)) {
          logger.debug(`Feature ${featureDoc.name} not found for ${document.name}, adding (${ruleFeature.id})`, ruleFeature);
          if (ruleEntry.selection || ruleEntry.flag) {
            addRuleToKeep(ruleEntry);
          }
          this.autoAddedFeatureIds.add(`${ruleFeature.id}${ruleFeature.type}`);
          featureDoc._id = foundry.utils.randomID();
          // this.#createGrantedItem(featureDoc, document, { itemGrantName: featureDocFlagName, applyFeatLocation: false });
          logger.debug(`Adding flags for ${document.name} (${documentFlagName})`, {
            document,
            featureDoc,
            ruleEntry,
            choice,
            documentFlagName,
          });
          const flagName = ruleEntry.flag ?? documentFlagName;
          this.#createGrantedItem(featureDoc, document, {
            addGrantFlag: true, itemGrantName: flagName, applyFeatLocation: false,
          });
          if (foundry.utils.hasProperty(featureDoc, "system.rules")) await this.#addGrantedRules(featureDoc);
        } else {
          if (!ruleEntry.selection) {
            logger.error(`Rule feature ${featureDoc.name} for ${document.name} is not handled`, {
              document,
              featureDoc,
              ruleEntry,
              choice,
              documentFlagName,
            });
            ruleEntry.ignore = true;
          }
          logger.debug(`Rule feature ${featureDoc.name} for ${document.name} fallback grant`);
          addRuleToKeep(ruleEntry);
        }
      } else if (foundry.utils.getProperty(choice, "nouuid")) {
        logger.debug("Parsed no id rule", { choice, uuid, ruleEntry });
        // the flag pf2e itself would use, so rules reading the selection (a champion's sanctification trait) find it
        if (!ruleEntry.flag) ruleEntry.flag = Pathmuncher.#ruleFlag(document, ruleEntry);
        ruleEntry.selection = choice.value;
        addRuleToKeep(ruleEntry);
      } else if (choice && uuid) {
        // a choice that is not an item. It may already have its selection, preselected by the item
        // granting this one (Farmhand's Athletics for the Assurance it grants); a preselection the
        // choice does not offer (Gnome Obsession's "lore" for Assurance) gives way to the choice made
        logger.debug("Parsed odd choice rule", { choice, uuid, ruleEntry });
        const offered = choice.choiceQueryResults?.map((c) => c.value);
        if (ruleEntry.selection === undefined || (offered && !offered.includes(ruleEntry.selection))) {
          ruleEntry.selection = choice.value;
        }
        addRuleToKeep(ruleEntry);
      } else {
        logger.debug(`Final rule fallback for ${document.name}`, ruleEntry);
        const data = {
          uuid: ruleEntry.uuid,
          document,
          ruleEntry,
          choice,
          Pathmuncher: this,
        };
        if (
          ruleEntry.key === "GrantItem"
          && (ruleEntry.flag || ruleEntry.selection || ruleEntry.uuid.startsWith("Compendium"))
        ) {
          addRuleToKeep(ruleEntry);
        } else if (ruleEntry.key === "ChoiceSet" && !foundry.utils.hasProperty(ruleEntry, "flag")) {
          logger.debug("Prompting user for choices", ruleEntry);
          this.promptRules[document._id].push(ruleEntry);
          addRuleToKeep(ruleEntry);
        } else if (ruleEntry.key === "ChoiceSet" && !choice && !uuid) {
          logger.warn("Unable to determine choice asking", data);
          addRuleToKeep(ruleEntry);
          this.promptRules[document._id].push(ruleEntry);
        }
        logger.warn("Unable to determine granted rule feature, needs better parser", data);
      }
      if (ruleEntry.key === "ChoiceSet" && choice?.label) {
        document.name = Pathmuncher.choiceAdjustedName(document.name, ruleEntry, choice, documentFlagName);
      }
      this.autoAddedFeatureRules[document._id].push(ruleEntry);

      logger.debug(`End result for ${document.name} for a ${ruleEntry.key}`, () => ({
        document: foundry.utils.deepClone(document),
        rulesToKeep: foundry.utils.deepClone(rulesToKeep),
        ruleEntry: foundry.utils.deepClone(ruleEntry),
        choice: foundry.utils.deepClone(choice),
        uuid: foundry.utils.deepClone(uuid),
      }));
    }
    // eslint-disable-next-line require-atomic-updates
    document.system.rules = rulesToKeep;

    logger.debug(`Final status for ${document.name}`, () => ({
      document: foundry.utils.deepClone(document),
      rulesToKeep: foundry.utils.deepClone(rulesToKeep),
    }));
  }

  async #delayedSubRuleDocuments(document, { originType, applyFeatLocation, choiceHint, levelCap }) {
    for (const subRuleDocument of this.subRuleDocuments[document._id]) {
      logger.debug(
        `Processing granted rules for granted item document ${subRuleDocument.name}`,
        () => foundry.utils.duplicate(subRuleDocument),
      );
      await this.addGrantedItems(subRuleDocument, { originType, applyFeatLocation, choiceHint, levelCap });
    }
  }

  async #processGrantItemsAtLevel(document, level, { originType = null, applyFeatLocation = false, levelCap = 20 } = {}) {
    const featureItemMap = Object.entries(this.autoAddedFeatureItems[document._id])
      .sort(([, a], [, b]) => a.level - b.level);
    for (const [key, grantedFeature] of featureItemMap) {
      logger.debug(`Checking ${document.name} granted item ${grantedFeature.name}, level(${grantedFeature.level}) with key: ${key}`, grantedFeature);
      if (parseInt(grantedFeature.level) > foundry.utils.getProperty(this.result.character, "system.details.level.value")
        || parseInt(grantedFeature.level) !== level
      ) {
        logger.verbose(`Not processing ${grantedFeature.name} due to level data mismatch`, () => ({
          grantedFeature,
          level,
          levelCap,
          greaterLevelCheck: parseInt(grantedFeature.level) > foundry.utils.getProperty(this.result.character, "system.details.level.value"),
          noLevelMatchCheck: parseInt(grantedFeature.level) !== level,
          characterLevel: foundry.utils.getProperty(this.result.character, "system.details.level.value"),
        }));
        continue;
      }
      const feature = await fromUuid(grantedFeature.uuid);
      if (!feature) {
        const data = { uuid: grantedFeature.uuid, grantedFeature, feature };
        logger.warn("Unable to determine granted item feature, needs better parser", data);
        this.failedFeatureItems[document._id][key] = grantedFeature;
        continue;
      }
      this.autoAddedFeatureIds.add(`${feature.id}${feature.type}`);
      const featureDoc = feature.toObject();
      featureDoc._id = foundry.utils.randomID();
      // const featureDocFlagName = Seasoning.slugD(featureDoc.system.slug ?? featureDoc.system.name ?? featureDoc.name);
      foundry.utils.setProperty(featureDoc.system, "location", document._id);
      // a shared feature (e.g. Weapon Expertise) has its own level; the class decides when it is gained
      if (featureDoc.system.level) featureDoc.system.level.value = parseInt(grantedFeature.level);
      this.#createGrantedItem(featureDoc, document, { originType, applyFeatLocation, grantedAs: grantedFeature.name });
      if (foundry.utils.hasProperty(featureDoc, "system.rules")) {
        logger.debug(`Processing granted rules for granted item document ${featureDoc.name}`, () => foundry.utils.duplicate(featureDoc));
        if (this.immediateDiveAdd) {
          await this.addGrantedItems(featureDoc, { originType, applyFeatLocation, levelCap });
        } else {
          this.subRuleDocuments[document._id].push(featureDoc);
        }
      }
    }
    document.system.items = this.failedFeatureItems[document._id];
  }

  async addGrantedItems(document, { originType = null, applyFeatLocation = false, choiceHint = null, levelCap = 20 } = {}) {
    this.subRuleDocuments[document._id] = [];
    if (foundry.utils.hasProperty(document, "system.items")) {
      logger.debug(`addGrantedItems for ${document.name}`, () => foundry.utils.duplicate(document));
      if (!this.autoAddedFeatureItems[document._id]) {
        this.autoAddedFeatureItems[document._id] = foundry.utils.duplicate(document.system.items);
      }
      this.failedFeatureItems[document._id] = {};

      // const characterLevel = foundry.utils.getProperty(this.result.character, "system.details.level.value");
      const characterLevel = this.characterLevel;

      for (let i = 0; i <= Math.min(characterLevel, levelCap); i++) {
        await this.#processGrantItemsAtLevel(document, i, { originType, applyFeatLocation, levelCap });
      }

      if (!this.immediateDiveAdd) {
        await this.#delayedSubRuleDocuments(document, { originType, applyFeatLocation, choiceHint, levelCap });
      }
    }

    if (foundry.utils.hasProperty(document, "system.rules")) {
      logger.debug(`Processing granted rules for core document ${document.name}`, () => ({ document: foundry.utils.duplicate(document), originType, choiceHint }));
      const docHint = choiceHint ?? document.name;
      await this.#addGrantedRules(document, originType, docHint);
    }
  }

  static KEY_LEVEL = [0, 1, 5, 5, 5, 5, 10, 10, 10, 10, 10, 15, 15, 15, 15, 15, 20, 20, 20, 20, 20];

  #determineAbilityBoosts() {
    const breakdown = foundry.utils.getProperty(this.source, "abilities.breakdown");
    const useCustomStats
      = breakdown
      && breakdown.ancestryFree.length === 0
      && breakdown.ancestryBoosts.length === 0
      && breakdown.ancestryFlaws.length === 0
      && breakdown.backgroundBoosts.length === 0
      && breakdown.classBoosts.length === 0;
    if (breakdown && !useCustomStats) {
      this.boosts.custom = false;
      const classBoostMap = {};
      for (const [key, boosts] of Object.entries(this.source.abilities.breakdown.mapLevelledBoosts)) {
        if (key <= this.source.level) {
          const levelKey = Pathmuncher.KEY_LEVEL[key];
          const existingBoosts = classBoostMap[levelKey] ?? [];
          const newBoosts = boosts.map((ability) => ability.toLowerCase());
          classBoostMap[levelKey] = existingBoosts.concat(newBoosts);
        }
      }
      foundry.utils.setProperty(this.result.character, "system.build.attributes.boosts", classBoostMap);
      this.boosts.class = classBoostMap;

      // ancestry
    } else {
      this.boosts.custom = true;
      ["str", "dex", "con", "int", "wis", "cha"].forEach((key) => {
        const mod = Math.min(Math.max(Math.trunc((this.source.abilities[key] - 10) / 2), -5), 10) || 0;
        foundry.utils.setProperty(this.result.character, `system.abilities.${key}.mod`, mod);
      });
    }

    if (breakdown?.classBoosts.length > 0) {
      this.keyAbility = breakdown.classBoosts[0].toLowerCase();
    } else {
      this.keyAbility = this.source.keyability;
    }
    foundry.utils.setProperty(this.result.character, "system.details.keyability.value", this.keyAbility);
  }

  #generateBackgroundAbilityBoosts() {
    if (!this.result.background[0]) return;
    const breakdown = foundry.utils.getProperty(this.source, "abilities.breakdown");
    for (const boost of breakdown.backgroundBoosts) {
      for (const [key, boostSet] of Object.entries(this.result.background[0].system.boosts)) {
        if (this.result.background[0].system.boosts[key].selected) continue;
        if (boostSet.value.includes(boost.toLowerCase())) {
          this.result.background[0].system.boosts[key].selected = boost.toLowerCase();
          break;
        }
      }
    }
  }

  #generateAncestryAbilityBoosts() {
    if (!this.result.ancestry[0]) return;
    const breakdown = foundry.utils.getProperty(this.source, "abilities.breakdown");
    const boosts = [];
    breakdown.ancestryBoosts.concat(breakdown.ancestryFree).forEach((boost) => {
      for (const [key, boostSet] of Object.entries(this.result.ancestry[0].system.boosts)) {
        if (this.result.ancestry[0].system.boosts[key].selected) continue;
        if (boostSet.value.includes(boost.toLowerCase())) {
          this.result.ancestry[0].system.boosts[key].selected = boost.toLowerCase();
          boosts.push(boost.toLowerCase());
          break;
        }
      }
    });
    if (breakdown.ancestryBoosts.length === 0) {
      const alternativeBoosts = new Set(breakdown.ancestryFree.map((b) => b.toLowerCase()));
      foundry.utils.setProperty(this.result.ancestry[0], "system.alternateAncestryBoosts", Array.from(alternativeBoosts));
    }
  }

  #setAbilityBoosts() {
    if (this.boosts.custom) return;
    this.#generateBackgroundAbilityBoosts();
    this.#generateAncestryAbilityBoosts();

    if (this.result.class[0]) this.result.class[0].system.boosts = this.boosts.class;
  }

  static SKILL_LOOKUP = [
    "acrobatics",
    "arcana",
    "athletics",
    "crafting",
    "deception",
    "diplomacy",
    "intimidation",
    "medicine",
    "nature",
    "occultism",
    "performance",
    "religion",
    "society",
    "stealth",
    "survival",
    "thievery",
  ];

  #setSkills(removeSpecials = false) {
    for (const skill of Pathmuncher.SKILL_LOOKUP) {
      const calculatedValue = removeSpecials
        && (this.source.specials.some((s) => s.toLowerCase() === skill)
         || this.parsed.specials.some((s) => s.name.toLowerCase() === skill))
        ? 0
        : this.source.proficiencies[skill] / 2;
      foundry.utils.setProperty(this.result.character, `system.skills.${skill}.rank`, calculatedValue);
    };
  }

  #setSaves() {
    ["fortitude", "reflex", "will"].forEach((key) => {
      foundry.utils.setProperty(this.result.character, `system.savingThrows.${key}`, this.source.proficiencies[key] / 2);
    });
  }

  #setMartials() {
    ["advanced", "heavy", "light", "medium", "unarmored", "martial", "simple", "unarmed"].forEach((key) => {
      foundry.utils.setProperty(this.result.character, `system.martial.${key}.rank`, this.source.proficiencies[key] / 2);
    });
  }

  #setLanguages() {
    const ancestryLanguages = this.result.ancestry[0]?.system.traits.languages?.value || [];
    const intLanguages = this.source.languages
      .filter((l) => !ancestryLanguages.includes(l.toLowerCase()))
      .map((l) => l.toLowerCase());
    foundry.utils.setProperty(this.result.character, "system.details.languages.value", intLanguages);

  }

  async #processCore() {
    foundry.utils.setProperty(this.result.character, "name", this.source.name);
    foundry.utils.setProperty(this.result.character, "prototypeToken.name", this.source.name);
    this.characterLevel = this.source.level;
    foundry.utils.setProperty(this.result.character, "system.details.level.value", 1);
    if (this.source.age !== "Not set") foundry.utils.setProperty(this.result.character, "system.details.age.value", this.source.age);
    if (this.source.gender !== "Not set") foundry.utils.setProperty(this.result.character, "system.details.gender.value", this.source.gender);
    // foundry.utils.setProperty(this.result.character, "system.details.alignment.value", this.source.alignment);

    if (this.source.deity !== "Not set") foundry.utils.setProperty(this.result.character, "system.details.deity.value", this.source.deity);
    this.size = Seasoning.getSizeValue(this.source.size);
    foundry.utils.setProperty(this.result.character, "system.traits.size.value", this.size);
    this.#processSenses();

    this.#determineAbilityBoosts();
    this.#setSaves();
    this.#setMartials();

    // foundry.utils.setProperty(this.result.character, "system.attributes.perception.rank", this.source.proficiencies.perception / 2);
    // foundry.utils.setProperty(this.result.character, "system.attributes.classDC.rank", this.source.proficiencies.classDC / 2);
  }

  /** The compendium entry of a type for the first of these names that has one, under any of their slug variants. */
  #findInPackIndexes(type, names) {
    return this.compendiumMatchers[type].findCandidates(names.map((name) => this.names.slugVariants(name)));
  }

  #sortParsedFeats() {
    // eslint-disable-next-line complexity
    this.parsed.feats.sort((f1, f2) => {
      const f1RefUndefined = !(typeof f1.type === "string" || f1.type instanceof String);
      const f2RefUndefined = !(typeof f2.type === "string" || f2.type instanceof String);
      if (f1RefUndefined || f2RefUndefined) {
        if (f1RefUndefined && f2RefUndefined) {
          return 0;
        } else if (f1RefUndefined) {
          return 1;
        } else {
          return -1;
        }
      } else if (f1.type === "Awarded Feat" && f2.type === "Awarded Feat") {
        return (f1.level ?? 20) - (f2.level ?? 20);
      } else if (f1.type === "Awarded Feat") {
        return 1;
      } else if (f2.type === "Awarded Feat") {
        return -1;
      } else if ((f1.level ?? 20) === (f2.level ?? 20)) {
        const f1Index = CONSTANTS.FEAT_PRIORITY.indexOf(f1.type);
        const f2Index = CONSTANTS.FEAT_PRIORITY.indexOf(f2.type);
        if (f1Index > f2Index) {
          return 1;
        } else if (f1Index < f2Index) {
          return -1;
        } else {
          return 0;
        }
      } else {
        return (f1.level ?? 20) - (f2.level ?? 20);
      }
    });
  }

  // eslint-disable-next-line complexity
  async #generateFeatItems(type,
    {
      levelCap = 20, typeFilter = null, excludeChild = false, excludeParents = false, excludeStandard = false,
      specialsOnly = false,
    } = {},
  ) {
    logger.debug(`Generate feat items for ${type} with level cap "${levelCap}" and filter "${typeFilter}"`);

    for (const featArray of specialsOnly ? [this.parsed.specials] : [this.parsed.feats, this.parsed.specials]) {
      for (const pBFeat of featArray) {
        logger.verbose(`Checking if ${pBFeat.name} needs processing`, pBFeat);
        if (pBFeat.added) continue;
        // Pathbuilder repeats awarded feats in specials (Beast Trainer's Train Animal): one item for both
        const addedFeat = pBFeat.sourceType === "specials"
          && this.parsed.feats.find((f) => f.added && f.addedId && f.name === pBFeat.name);
        if (addedFeat) {
          pBFeat.settle(addedFeat.status, { itemId: addedFeat.itemId, reason: "repeats an awarded feat" });
          continue;
        }
        if (Number.isInteger(levelCap) && (pBFeat.level ?? 20) > levelCap) continue;
        if (utils.isString(levelCap) && pBFeat.level !== levelCap) continue;
        if (typeFilter && pBFeat.type !== typeFilter) continue;
        if (excludeChild && pBFeat.isChild === true) continue;
        if (excludeParents && pBFeat.isParent === true) continue;
        if (excludeStandard && pBFeat.isStandard === true) continue;
        logger.debug(`Generating feature for ${pBFeat.name}`, pBFeat);
        if (this.devMode) logger.error(`Generating feature for ${pBFeat.name}`, { pBFeatCloned: foundry.utils.deepClone(pBFeat), pBFeat, this: this });

        const indexMatch = this.#findInPackIndexes(type, [pBFeat.name, pBFeat.originalName]);
        if (pBFeat.extra) {
          logger.verbose(`Generate Feat Item Rename for ${pBFeat.name} with ${pBFeat.extra}`, pBFeat);
        }
        const displayName = pBFeat.extra ? Pathmuncher.adjustDocumentName(pBFeat.name, pBFeat.extra) : pBFeat.name;
        if (!indexMatch) {
          logger.debug(`Unable to match feat ${displayName}`, {
            displayName,
            name: pBFeat.name,
            extra: pBFeat.extra,
            pBFeat,
            type,
          });
          pBFeat.unmatched(`no ${type} compendium entry`);
          continue;
        }
        if (this.autoAddedFeatureIds.has(`${indexMatch.i._id}${indexMatch.i.type}`)) {
          logger.debug("Feat included in class features auto add", { displayName, pBFeat, type });
          pBFeat.settle(ParsedEntry.STATUS.INCLUDED, { reason: "already added by a feature" });
          continue;
        }

        const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
        const docData = doc.toObject();
        docData._id = foundry.utils.randomID();
        pBFeat.settle(ParsedEntry.STATUS.CREATED, { itemId: docData._id });

        this.#generateFoundryFeatLocation(docData, pBFeat);
        this.result.feats.push(docData);
        const options = {
          originType: typeFilter,
          applyFeatLocation: false,
          choiceHint: pBFeat.extra && pBFeat.extra !== "" ? pBFeat.extra : null,
          levelCap,
        };
        await this.addGrantedItems(docData, options);
      }
    }
  }

  async #generateLores() {
    for (const lore of this.source.lores) {
      const loreName = lore[0];
      const data = {
        name: loreName.trim() === "" ? "Unknown Lore" : loreName,
        type: "lore",
        system: {
          proficient: {
            value: lore[1] / 2,
          },
          featType: "",
          mod: {
            value: 0,
          },
          item: {
            value: 0,
          },
        },
      };
      this.result.lores.push(data);
    }
  }

  async #processFormulas() {
    const uuids = [];

    for (const formulaSource of this.source.formula) {
      for (const formulaName of formulaSource.known) {
        const mappingData = Seasoning.getFoundryEquipment(formulaName);
        const foundryName = mappingData?.foundryName ?? formulaName;
        const indexMatch = this.compendiumMatchers["formulas"].getMatch(foundryName, formulaName);
        if (!indexMatch) {
          logger.error(`Unable to match formula ${formulaName}`, { formulaSource, mappingData, foundryName, formulaName });
          this.bad.push({ pbName: formulaName, type: "formula", details: { formulaSource, name: formulaName } });
          continue;
        }
        const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
        uuids.push({ uuid: doc.uuid });
      }
    }
    foundry.utils.setProperty(this.result.character, "system.crafting.formulas", uuids);
  }

  async #processFeats() {
    this.#sortParsedFeats();
    await this.#generateFeatItems("classFeatures", { typeFilter: "Mythic Feat", levelCap: "calling" });
    // pre pass for standard items
    for (let i = 1; i <= this.characterLevel; i++) {
      foundry.utils.setProperty(this.result.character, "system.details.level.value", i);
      if (i > 1) await this.#processGrantedLookupItemsAtLevel("class", i);
      await this.#generateFeatItems("feats", { typeFilter: "Ancestry Feat", levelCap: i, excludeChild: true, excludeParents: true });
      await this.#generateFeatItems("feats", { typeFilter: "Skill Feat", levelCap: i, excludeChild: true, excludeParents: true });
      await this.#generateFeatItems("feats", { typeFilter: "Class Feat", levelCap: i, excludeChild: true, excludeParents: true });
      await this.#generateFeatItems("feats", { typeFilter: "Mythic Feat", levelCap: i, excludeChild: true, excludeParents: true });
      await this.#generateFeatItems("feats", { typeFilter: "Destiny Mythic Feat", levelCap: i, excludeChild: true, excludeParents: true });
      await this.#generateFeatItems("feats", { typeFilter: "General Feat", levelCap: i, excludeChild: true, excludeParents: true });
      await this.#generateFeatItems("feats", { typeFilter: "Archetype Feat", levelCap: i, excludeChild: true, excludeParents: true });
    }
    await this.#generateFeatItems("ancestryFeatures", { excludeChild: true, excludeParents: true });
    // prepass for non-child items
    for (let i = 1; i <= this.characterLevel; i++) {
      await this.#generateFeatItems("feats", { typeFilter: "Ancestry Feat", levelCap: i, excludeChild: true });
      await this.#generateFeatItems("feats", { typeFilter: "Skill Feat", levelCap: i, excludeChild: true });
      await this.#generateFeatItems("feats", { typeFilter: "Class Feat", levelCap: i, excludeChild: true });
      await this.#generateFeatItems("feats", { typeFilter: "General Feat", levelCap: i, excludeChild: true });
      await this.#generateFeatItems("feats", { typeFilter: "Archetype Feat", levelCap: i, excludeChild: true });
    }
    await this.#generateFeatItems("ancestryFeatures", { excludeChild: true });

    await this.#generateFeatItems("feats", { typeFilter: "Ancestry Feat" });
    await this.#generateFeatItems("feats", { typeFilter: "Skill Feat" });
    await this.#generateFeatItems("feats", { typeFilter: "Class Feat" });
    await this.#generateFeatItems("feats", { typeFilter: "General Feat" });
    await this.#generateFeatItems("feats", { typeFilter: "Archetype Feat" });

    this.#setSkills();
    // final pass, include all
    this.statusUpdate(1, 5, "Feats");
    await this.#generateFeatItems("feats");
    this.statusUpdate(2, 5, "Feats");
    await this.#generateFeatItems("ancestryFeatures");
    // specials that are actions a feature gives without granting the item (e.g. Manifest Soulforged Armament)
    await this.#generateFeatItems("actions", { specialsOnly: true });
    this.statusUpdate(3, 5, "Feats");
    // await this.#generateSpecialItems("ancestryFeatures");
    // this.statusUpdate(4, 5, "Feats");
    // await this.#generateSpecialItems("classFeatures");
    // this.statusUpdate(5, 5, "Feats");
    // await this.#generateSpecialItems("actions");
  }

  /**
   * Builds the import result from this.source without changing the actor.
   * Returns false if there is no usable source or the user cancels; processing errors are thrown.
   */
  async processCharacter() {
    this.processed = false;
    if (!this.source) return false;
    Pathmuncher.normaliseSource(this.source);
    this.#warnVariantMismatch();
    await this.#loadCompendiumMatchers();
    // before the build is read, so a replacement deity or choice is imported as if Pathbuilder had it
    const deityConflict = await this.findDeityConflict();
    if (deityConflict && this.options.resolveDeityConflict) {
      const resolution = await this.options.resolveDeityConflict(deityConflict);
      if (!resolution) return false;
      this.#applyDeityResolution(resolution);
    }
    await this.#prepare();
    const missingCore = this.#findMissingCore();
    if (missingCore.length > 0 && this.options.resolveMissingCore) {
      const replacements = await this.options.resolveMissingCore(missingCore);
      if (!replacements) return false;
      Object.assign(this.coreReplacements, replacements);
    }
    this.statusUpdate(1, 12, "Character");
    await this.#processCore();
    this.statusUpdate(2, 12, "Formula");
    await this.#processFormulas();
    this.statusUpdate(3, 12, "Deity");
    await this.#processGenericCompendiumLookup("deities", this.source.deity, "deity");

    this.statusUpdate(4, 12, "Ancestry");
    await this.#processGenericCompendiumLookup("ancestries", this.source.ancestry, "ancestry");
    this.statusUpdate(5, 12, "Heritage");
    await this.#processGenericCompendiumLookup("heritages", this.source.heritage, "heritage");
    this.statusUpdate(6, 12, "Background");
    await this.#processGenericCompendiumLookup("backgrounds", this.source.background, "background");

    this.#setSkills(true);
    this.#setLanguages();

    this.statusUpdate(7, 12, "Class");
    await this.#processGenericCompendiumLookup("classes", this.source.class, "class", 1);

    this.#setAbilityBoosts();

    this.statusUpdate(8, 12, "FeatureRec");
    await this.#processFeats();
    this.statusUpdate(10, 12, "Equipment");
    if (!(await this.equipment.processEquipment())) return false;
    this.statusUpdate(11, 12, "Spells");
    await this.spells.processSpells();
    this.statusUpdate(11, 12, "Rituals");
    await this.spells.processRituals();
    this.statusUpdate(12, 12, "Lores");
    await this.#generateLores();
    if (this.unansweredChoices.length > 0) {
      const answers = await this.options.resolveUnansweredChoices(this.unansweredChoiceList);
      if (!answers) return false;
      this.#applyChoiceAnswers(answers);
    }
    this.processed = true;
    return true;
  }

}
