/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import CONSTANTS from "../constants.js";
import { SPECIAL_NAME_ADDITIONS, NO_AUTO_CHOICE, specialOnlyNameLookup, BAD_IGNORE_FEATURES } from "../data/features.js";
import { spellRename } from "../data/spells.js";
import logger from "../logger.js";
import utils from "../utils.js";
import { CompendiumMatcher } from "./CompendiumMatcher.js";
import { Seasoning } from "./Seasoning.js";

export class Pathmuncher {
  FEAT_RENAME_MAP(name) {
    const dynamicItems = [
      { pbName: "Shining Oath", foundryName: `Shining Oath (${Seasoning.getChampionType(this.source.alignment)})` },
      { pbName: "Counterspell", foundryName: `Counterspell (${utils.capitalize(this.getClassSpellCastingType() ?? "")})` },
      { pbName: "Counterspell", foundryName: `Counterspell (${utils.capitalize(this.getClassSpellCastingType(true) ?? "")})` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${this.source.class})` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${this.source.dualClass})` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${utils.capitalize(this.getClassSpellCastingType() ?? "")} Caster)` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${utils.capitalize(this.getClassSpellCastingType(true) ?? "")} Caster)` },
    ];
    return Seasoning.FEAT_RENAME_MAP(name).concat(dynamicItems);
  }

  getFoundryFeatureName(pbName, isSpecial = false) {
    if (isSpecial) {
      const specialMatch = specialOnlyNameLookup(pbName);
      if (specialMatch) return specialMatch;
    }
    const match = this.FEAT_RENAME_MAP(pbName).find((map) => map.pbName == pbName);
    return match ?? { pbName, foundryName: pbName, details: undefined };
  }

  constructor(actor, { addFeats = true, addEquipment = true, addSpells = true, adjustBlendedSlots = true,
    addMoney = true, addLores = true, addWeapons = true, addArmor = true, addTreasure = true, addDeity = true,
    addName = true, addClass = true, addBackground = true, addHeritage = true, addAncestry = true,
    statusCallback = null } = {},
  ) {
    this.devMode = game.modules.get("pathmuncher").version === "999.0.0";
    this.actor = actor;
    // note not all these options do anything yet!
    this.options = {
      addTreasure,
      addMoney,
      addFeats,
      addSpells,
      adjustBlendedSlots,
      addEquipment,
      addLores,
      addWeapons,
      addArmor,
      addDeity,
      addName,
      addClass,
      addBackground,
      addHeritage,
      addAncestry,
    };
    this.source = null;
    this.parsed = {
      specials: [],
      feats: [],
      equipment: [],
      armor: [],
      weapons: [],
    };
    this.usedLocations = new Set();
    this.usedLocationsAlternateRules = new Set();
    this.autoAddedFeatureIds = new Set();
    this.autoAddedFeatureItems = {};
    this.promptRules = {};
    this.allFeatureRules = {};
    this.autoAddedFeatureRules = {};
    this.failedFeatureItems = {};
    this.subRuleDocuments = {};
    this.grantItemLookUp = new Set();
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
    this.check = {};
    this.bad = [];
    this.statusCallback = statusCallback;
    this.compendiumMatchers = {};
    const compendiumMappings = utils.setting("USE_CUSTOM_COMPENDIUM_MAPPINGS")
      ? utils.setting("CUSTOM_COMPENDIUM_MAPPINGS")
      : CONSTANTS.CORE_COMPENDIUM_MAPPINGS;
    for (const type of Object.keys(compendiumMappings)) {
      this.compendiumMatchers[type] = new CompendiumMatcher({ type });
    }

    this.immediateDiveAdd = utils.setting("USE_IMMEDIATE_DEEP_DIVE");
  }

  async #loadCompendiumMatchers() {
    for (const matcher of Object.values(this.compendiumMatchers)) {
      await matcher.loadCompendiums();
    }
  }

  #statusUpdate(total, count, type, prefixLabel) {
    if (this.statusCallback) this.statusCallback(total, count, type, prefixLabel);
  }

  async fetchPathbuilder(pathbuilderId) {
    if (!pathbuilderId) {
      const flags = utils.getFlags(this.actor);
      pathbuilderId = flags?.pathbuilderId;
    }
    if (pathbuilderId) {
      const jsonData = await foundry.utils.fetchJsonWithTimeout(
        `https://www.pathbuilder2e.com/json.php?id=${pathbuilderId}`,
      );
      if (jsonData.success) {
        this.source = jsonData.build;
      } else {
        ui.notifications.warn(
          game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.FetchFailed`, { pathbuilderId }),
        );
      }
    } else {
      ui.notifications.error(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.NoId`));
    }
  }

  #generateFoundryFeatLocation(document, feature) {
    if (feature.type && feature.level) {
      // const freeArchetypeVariant = game.settings.get("pf2e", "freeArchetypeVariant");
      const location = Seasoning.getFoundryFeatLocation(feature.type, feature.level);
      if (location && !this.usedLocations.has(location)) {
        document.system.location = location;
        this.usedLocations.add(location);
      } else if (location && this.usedLocations.has(location)) {
        logger.debug("Variant feat location", { ancestryParagonVariant: utils.allowAncestryParagon(), location, feature });
        // eslint-disable-next-line max-depth
        if (utils.allowAncestryParagon() && feature.type === "Ancestry Feat") {
          document.system.location = "ancestry-bonus";
          this.usedLocationsAlternateRules.add(location);
        } else if (utils.allowDualClasses() && feature.type === "Class Feat") {
          document.system.location = `dualclass-${feature.level}`;
          this.usedLocationsAlternateRules.add(location);
        }
      }
    }
  }

  #processSpecialData(name) {
    if (name.includes("Domain: ")) {
      const domainName = name.split(" ")[1];
      this.parsed.feats.push({ name: "Deity's Domain", extra: domainName });
      return true;
    } else {
      return false;
    }
  }

  #getContainerData(key) {
    return {
      id: key,
      containerName: this.source.equipmentContainers[key].containerName,
      bagOfHolding: this.source.equipmentContainers[key].bagOfHolding,
      backpack: this.source.equipmentContainers[key].backpack,
    };
  }

  #nameMapSourceEquipment(e) {
    const name = Seasoning.getFoundryEquipmentName(e[0]);
    const containerKey = Object.keys(this.source.equipmentContainers)
      .find((key) => this.source.equipmentContainers[key].containerName === name);

    const container = containerKey ? this.#getContainerData(containerKey) : null;
    const foundryId = foundry.utils.randomID();

    if (container) {
      this.source.equipmentContainers[containerKey].foundryId = foundryId;
    }

    const item = {
      foundryName: name,
      pbName: e[0],
      originalName: e[0],
      qty: e[1],
      added: false,
      addedId: null,
      addedAutoId: null,
      inContainer: e[2] !== "Invested" ? e[2] : null,
      container,
      foundryId,
      invested: e[2] === "Invested",
      sourceType: "equipment",
    };
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
    const weapon = foundry.utils.mergeObject({
      foundryName: name,
      pbName: mockE.name,
      originalName: mockE.name,
      added: false,
      addedId: null,
      addedAutoId: null,
      sourceType: "weapons",
    }, mockE);
    this.parsed.weapons.push(weapon);
  }

  #nameMap() {
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
        const item = foundry.utils.mergeObject({
          foundryName: name,
          pbName: e.name,
          originalName: e.name,
          added: false,
          addedId: null,
          addedAutoId: null,
          sourceType: "armor",
        }, e);
        this.parsed.armor.push(item);
        // work around for now
        if (e.name.startsWith("Inventor ")) {
          this.parsed.feats.push({
            name,
            extra: "",
            added: false,
            addedId: null,
            addedAutoId: null,
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
          });
          featRank++;
        }
      });
    this.source.weapons
      .filter((e) => e && e !== "undefined")
      .forEach((e) => {
        const name = Seasoning.getFoundryEquipmentName(e.name);
        const item = foundry.utils.mergeObject({
          foundryName: name,
          pbName: e.name,
          originalName: e.name,
          added: false,
          addedId: null,
          addedAutoId: null,
          sourceType: "weapons",
        }, e);
        // for now assume first weapon is the weapon innovation
        if (e.isInventor) {
          this.parsed.feats.push({
            name,
            extra: "",
            added: false,
            addedId: null,
            addedAutoId: null,
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
          });
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
        const match = this.getFoundryFeatureName(special); // , true);
        if (!this.#processSpecialData(match.foundryName) && !Seasoning.IGNORED_SPECIALS().includes(match.foundryName)) {
          this.parsed.specials.push({
            name: match.foundryName,
            foundryName: match.foundryName,
            foundryValue: match.foundryValue,
            originalName: special,
            added: false,
            addedId: null,
            addedAutoId: null,
            rank: iRank,
            sourceType: "specials",
          });
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
        const name = this.getFoundryFeatureName(feat[0]).foundryName;
        const data = {
          name,
          extra: feat[1],
          added: feat[0] === this.source.heritage,
          addedId: null,
          addedAutoId: null,
          type: feat[2],
          level: feat[3],
          originalName: feat[0],
          rank: featRank,
          sourceType: "feats",
        };
        if (feat.length >= 7) {
          data.featChoiceRef = feat[4];
          data.hasChildren = feat[5] === "parentChoice";
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
          data.nameHint = parentFeatMatch?.[0] ? this.getFoundryFeatureName(parentFeatMatch?.[0]).foundryName : undefined;
        } else {
          // probably an awarded feat
          data.featChoiceRef = null;
          data.hasChildren = null;
          data.isChild = null;
          data.isStandard = null;
          data.parentFeatChoiceRef = null;
        }
        this.parsed.feats.push(data);
        featRank++;
      });
    logger.debug("Finished Feat Rename");

    logger.debug("Checking for Inventions");
    (this.source.inventorMods ?? []).forEach((mod) => {
      const match = this.getFoundryFeatureName(mod.selection);
      if (!Seasoning.IGNORED_SPECIALS().includes(match.foundryName)) {
        this.parsed.specials.push({
          name: match.foundryName,
          foundryName: match.foundryName,
          foundryValue: match.foundryValue,
          originalName: mod.selection,
          isChild: true,
          added: false,
          addedId: null,
          addedAutoId: null,
          rank: iRank,
          sourceType: "inventorMods",
          parentFeatChoiceRef: mod.ref,
          nameHint: this.getFoundryFeatureName(mod.ref).foundryName,
        });
        iRank++;
      }
    });
    logger.debug("Finished Inventions");
    logger.debug("Name remapping results", {
      parsed: this.parsed,
    });
  }

  #fixUps() {
    if (this.source.ancestry === "Dwarf" && !this.parsed.feats.some((f) => f.name === "Clan Pistol")) {
      const clanDagger = {
        name: "Clan Dagger",
        originalName: "Clan Dagger",
        added: false,
        addedId: null,
        addedAutoId: null,
        isChoice: true,
        rank: 0,
        sourceType: "specials",
      };
      this.parsed.specials.push(clanDagger);
    }

    const match = this.source.background.match(/(Magical Experiment) \((.*)\)$/);
    if (match) {
      this.parsed.specials.push({
        name: match[2],
        originalName: `${this.source.background}`,
        added: false,
        addedId: null,
        addedAutoId: null,
        isChoice: true,
        rank: 0,
        sourceType: "specials",
      });
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

  async #prepare() {
    await this.#loadCompendiumMatchers();
    this.#nameMap();
    this.#fixUps();
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

  // eslint-disable-next-line no-unused-vars
  #addDualClass(_klass) {
    if (!utils.allowDualClasses()) {
      if (this.source.dualClass && this.source.dualClass !== "") {
        logger.warn(`Imported character is dual class. Pathmuncher does not support dual class characters, please check the system macros`, {
          class: this.source.class,
          dualClass: this.source.dualClass,
        });
        ui.notifications.warn(`Imported character is dual class. Pathmuncher does not support dual class characters, please check the system macros`);
      }
      return;
    }
    if (!this.source.dualClass || this.source.dualClass === "") {
      logger.warn(`Imported character not dual class but system is configured for dual class`, {
        class: this.source.class,
      });
      ui.notifications.warn(`Imported character not dual class but system is configured for dual class`);
      return;
    }
    logger.info("Not processing dual class");
  }

  // eslint-disable-next-line class-methods-use-this
  async #processGenericCompendiumLookup(type, name, target, levelCap = 20) {
    logger.debug(`Checking for compendium documents for ${name} (${target}) in compendiums for ${type}`);
    const foundryName = this.getFoundryFeatureName(name).foundryName;
    const indexMatch = this.compendiumMatchers[type].getMatch(name, foundryName);

    if (indexMatch) {
      const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
      const itemData = doc.toObject();
      if (name.includes("(")) {
        const extra = name.split(")")[0].split("(").pop();
        this.parsed.specials.push({ name: doc.name, originalName: name, added: true, extra, rank: 99 });
      }
      if (target === "class") {
        itemData.system.keyAbility.selected = this.keyAbility;
        this.#addDualClass(itemData);
      }
      itemData._id = foundry.utils.randomID();
      // this.#generateGrantItemData(itemData);
      this.result[target].push(itemData);
      await this.#addGrantedItems(itemData, { applyFeatLocation: target !== "class", levelCap });
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

  #slugNameMatch(f, slug) {
    return slug === Seasoning.slug(f.name)
    || slug === Seasoning.slug(f.foundryValue)
    || slug === Seasoning.slug(Seasoning.getClassAdjustedSpecialNameLowerCase(f.name, this.source.class))
    || slug === Seasoning.slug(Seasoning.getAncestryAdjustedSpecialNameLowerCase(f.name, this.source.ancestry))
    || slug === Seasoning.slug(Seasoning.getHeritageAdjustedSpecialNameLowerCase(f.name, this.source.heritage))
    || slug === Seasoning.slug(f.originalName)
    || slug === Seasoning.slug(Seasoning.getClassAdjustedSpecialNameLowerCase(f.originalName, this.source.class))
    || slug
      === Seasoning.slug(Seasoning.getAncestryAdjustedSpecialNameLowerCase(f.originalName, this.source.ancestry))
    || slug
      === Seasoning.slug(Seasoning.getHeritageAdjustedSpecialNameLowerCase(f.originalName, this.source.heritage))
    || (utils.allowDualClasses()
      && (slug
        === Seasoning.slug(Seasoning.getDualClassAdjustedSpecialNameLowerCase(f.name, this.source.dualClass))
        || slug
          === Seasoning.slug(
            Seasoning.getDualClassAdjustedSpecialNameLowerCase(f.originalName, this.source.dualClass),
          )));
  }

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
        && this.#slugNameMatch(f, slug),
      );
      if (hintMatch) {
        hintMatch.rank = -10;
        return hintMatch;
      }
    }
    // console.warn(`Trying to find ${slug} in ${type}, ignoreAdded? ${ignoreAdded}`, this.parsed[type]);
    const parsedMatch = this.parsed[type].find((f) =>
      (!ignoreAdded || (ignoreAdded && !f.added))
        && (
          featType === null
          || f.type === featType
        )
        && !f.isChoice
        && this.#slugNameMatch(f, slug),
    );
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
    // console.warn("Finding all feature matches", { document, slug, ignoreAdded, isChoiceMatch, featType });
    const featMatch = this.#parsedFeatureMatch("feats", document, slug, { ignoreAdded, featType });
    if (featMatch) return featMatch;
    const specialMatch = this.#parsedFeatureMatch("specials", document, slug, { ignoreAdded, isChoiceMatch });
    if (specialMatch) return specialMatch;
    const deityMatch = this.#generatedResultMatch("deity", slug);
    return deityMatch;
    // const classMatch = this.#generatedResultMatch("class", slug);
    // return classMatch;
    // const equipmentMatch = this.#generatedResultMatch("equipment", slug);
    // return equipmentMatch;
  }

  #createGrantedItem(document, parent, { addGrantFlag = false, itemGrantName = null, originType = null, applyFeatLocation = false } = {}) {
    logger.debug(`Adding granted item flags to ${document.name} (parent ${parent.name}) with originType "${originType}", and will applyFeatLocation? ${applyFeatLocation}`, {
      document,
      parent,
      itemGrantName,
      originType,
      applyFeatLocation,
    });
    if (addGrantFlag) {
      const uuid = foundry.utils.getProperty(document, "flags.core.sourceId");
      if (uuid) this.grantItemLookUp.add(uuid);
      const camelCase = Seasoning.slugD(itemGrantName ?? document.system.slug ?? document.name);
      foundry.utils.setProperty(parent, `flags.pf2e.itemGrants.${camelCase}`, { id: document._id, onDelete: "detach" });
      foundry.utils.setProperty(document, "flags.pf2e.grantedBy", { id: parent._id, onDelete: "cascade" });

      logger.debug(`${parent.name} has granted item ${document.name} (${camelCase})`, {
        parent,
        itemGrantName,
        camelCase,
        flag: foundry.utils.getProperty(parent, `flags.pf2e.itemGrants.${camelCase}`),
      });
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
    const matchOptions = { ignoreAdded: true, featType: originType };
    const featureMatch
      = this.#findAllFeatureMatch(document, document.system.slug ?? Seasoning.slug(document.name), matchOptions)
      ?? (document.name.includes("(")
        ? this.#findAllFeatureMatch(document, Seasoning.slug(document.name.split("(")[0].trim()), matchOptions)
        : undefined);

    if (featureMatch) {
      logger.debug(`Found feature match for ${document.name}`, { featureMatch });
      const existingMatch = false;
      // featureMatch.sourceType
      //   ? this.parsed[featureMatch.sourceType].some((f) => f.addedId === document._id)
      //   : false;
      if (this.devMode && existingMatch) {
        logger.warn(`create Granted Item Existing match for ${document.name}`, { featureMatch, existingMatch, document });
      }
      // console.warn(`Match for ${document.name} createGrantedItem`, { featureMatch, existingMatch, document });
      if (foundry.utils.hasProperty(featureMatch, "added") && !existingMatch) {
        featureMatch.added = true;
        featureMatch.addedId = document._id;
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
      if (featMatch) {
        matches.push({
          slug,
          rank: featMatch.rank,
          choice,
          featMatch,
        });
      }
    }
    if (matches.length > 0) {
      if (choiceHint) {
        const hintMatch = matches.find((m) => m.slug === Seasoning.slug(choiceHint));
        if (hintMatch) return hintMatch;
      }
      if (this.devMode) logger.warn(`MATCHES`, { matches, choiceHint });
      const match = Pathmuncher.#getLowestChoiceRank(matches);
      const featMatch = this.#findAllFeatureMatch(document, match.slug, { ignoreAdded });
      const existingMatch = false;
      // featMatch.sourceType
      //   ? this.parsed[featMatch.sourceType].some((f) => f.addedId === document._id)
      //   : false;
      if (this.devMode && existingMatch) {
        logger.warn(`Feature Choice Existing match for ${document.name}`, { featMatch, existingMatch, document });
      }
      // console.warn(`Match for ${document.name} featureChoiceMatch`, { match, featMatch, existingMatch, document });
      if (adjustName && foundry.utils.hasProperty(featMatch, "added") && !existingMatch) {
        featMatch.added = true;
        featMatch.addedId = document._id;
      }
      logger.debug("Choices evaluated", { choices, document, featMatch, match, matches, choiceHint });
      return match.choice;
    } else {
      return undefined;
    }
  }

  async #featureChoiceMatchNoUUID(document, choices, cleansedChoiceSet) {
    const matches = [];
    for (const choice of choices) {
      const featMatch = this.#findAllFeatureMatch(document, choice.value, { ignoreAdded: true, isChoiceMatch: true });
      if (featMatch) {
        matches.push({
          rank: featMatch.rank,
          choice,
        });
      }
    }
    if (matches.length > 0) {
      const match = Pathmuncher.#getLowestChoiceRank(matches);
      const featMatch = this.#findAllFeatureMatch(document, match.choice.value, { ignoreAdded: true, isChoiceMatch: true });

      const existingMatch = false;
      // featMatch.sourceType
      //   ? this.parsed[featMatch.sourceType].some((f) => f.addedId === document._id)
      //   : false;

      if (this.devMode && existingMatch) {
        logger.warn(`NoUUID Existing match for ${document.name}`, { featMatch, existingMatch, document });
      }
      // console.warn(`Match for ${document.name} featureChoiceMatchNoUUID`, { match, featMatch, existingMatch, document });
      if (featMatch && !existingMatch) {
        featMatch.added = true;
        featMatch.addedId = document._id;
        match.choice.nouuid = true;
      }
      logger.debug("No UUID Choices evaluated", { choices, cleansedChoiceSet, document, featMatch, match, matches });
      return match.choice;
    } else {
      return undefined;
    }
  }

  static getFlag(document, ruleSet) {
    return typeof ruleSet.flag === "string" && ruleSet.flag.length > 0
      ? ruleSet.flag.replace(/[^-a-z0-9]/gi, "")
      : Seasoning.slugD(document.system.slug ?? document.system.name ?? document.name);
  }

  async #evaluateChoices(document, choiceSet, choiceHint, processedRules) {
    logger.debug(`Evaluating choices for ${document.name}`, { document, choiceSet, choiceHint });
    const tempActor = await this.#generateTempActor({
      documents: [document],
      includePassedDocumentsRules: false,
      // includeGrants: false,
      // includePassedDocumentsRules: true,
      includeGrants: false,
      includeFlagsOnly: true,
      processedRules,
      excludeAddedGrants: true,
    });

    const cleansedChoiceSet = foundry.utils.deepClone(choiceSet);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const choiceSetRules = new game.pf2e.RuleElements.all.ChoiceSet(cleansedChoiceSet, { parent: item });
      const rollOptions = [
        tempActor.getRollOptions(),
        // item.getRollOptions("item"),
        item.getRollOptions("parent"),
      ].flat();
      const choices = await choiceSetRules.inflateChoices(rollOptions, []);

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

      if (cleansedChoiceSet.choices?.query) {
        const nonFilteredChoices = await choiceSetRules.inflateChoices(rollOptions, [item]);
        const queryResults = await choiceSetRules.queryCompendium(cleansedChoiceSet.choices, rollOptions, [item]);
        logger.debug("Query Result", { queryResults, nonFilteredChoices });
      }

      logger.debug("Evaluating choiceset", cleansedChoiceSet);
      const choiceMatch = await this.#featureChoiceMatch(document, choices, true, !!cleansedChoiceSet.adjustName, choiceHint);
      logger.debug("choiceMatch result", choiceMatch);
      if (choiceMatch) {
        choiceMatch.choiceQueryResults = foundry.utils.deepClone(choices);
        return choiceMatch;
      }

      if (typeof cleansedChoiceSet.choices === "string" || Array.isArray(choices)) {
        const featureMatch = await this.#featureChoiceMatchNoUUID(document, choices, cleansedChoiceSet);
        if (featureMatch) {
          return featureMatch;
        }
      }

      let tempSet = foundry.utils.deepClone(choiceSet);
      logger.debug(`Starting dynamic selection for ${document.name}`, { document, choiceSet, tempSet, Pathmuncher: this });
      await choiceSetRules.preCreate({
        itemSource: item,
        ruleSource: tempSet,
        pendingItems: [item],
        tempItems: [],
        operation: {
          keepId: 1,
        },
      });
      // console.warn("chociesetdata", {
      //   choiceSetRules,
      //   selection: choiceSetRules.selection,
      //   choiceSet: foundry.utils.deepClone(choiceSet),
      //   tempSet: foundry.utils.deepClone(tempSet),
      // });
      if (tempSet.selection) {
        const lookedUpChoice = choices.find((c) => c.value === tempSet.selection);
        logger.debug("lookedUpChoice", lookedUpChoice);
        if (lookedUpChoice) lookedUpChoice.choiceQueryResults = foundry.utils.deepClone(choices);
        // set some common lookups here, e.g. deities are often not set!
        if (lookedUpChoice && cleansedChoiceSet.flag === "deity") {
          if (lookedUpChoice.label && lookedUpChoice.label !== "") {
            foundry.utils.setProperty(this.result.character, "system.details.deity.value", lookedUpChoice.label);
            await this.#processGenericCompendiumLookup("deities", lookedUpChoice.label, "deity");
            const camelCase = Seasoning.slugD(this.result.deity[0].system.slug);
            foundry.utils.setProperty(document, `flags.pf2e.itemGrants.${camelCase}`, {
              id: this.result.deity[0]._id,
              onDelete: "detach",
            });
            foundry.utils.setProperty(this.result.deity[0], "flags.pf2e.grantedBy", { id: document._id, onDelete: "cascade" });
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
    } finally {
      await Actor.deleteDocuments([tempActor._id]);
    }

    logger.debug("Evaluate Choices failed", { choiceSet: cleansedChoiceSet, tempActor, document });
    return undefined;
  }

  async #resolveInjectedUuid(document, ruleEntry, processedRules = []) {
    const tempActor = await this.#generateTempActor({
      documents: [document],
      // includePassedDocumentsRules: true,
      // includeGrants: true,
      // includeFlagsOnly: true,
      processedRules,
    });
    const cleansedRuleEntry = foundry.utils.deepClone(ruleEntry);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      // console.warn("creating grant item");
      const grantItemRule = new game.pf2e.RuleElements.all.GrantItem(cleansedRuleEntry, { parent: item });
      // console.warn("Begining uuid resovle");
      const uuid = grantItemRule.resolveInjectedProperties(grantItemRule.uuid, { warn: false });

      const tempItems = [];
      const context = { parent: tempActor, render: false };
      await grantItemRule.preCreate({
        itemSource: item,
        ruleSource: cleansedRuleEntry,
        pendingItems: [item],
        tempItems,
        context,
        reevaluation: true,
        operation: {
          keepId: 0,

        },
      });

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
    } finally {
      await Actor.deleteDocuments([tempActor._id]);
    }

    logger.debug("Evaluate UUID failed", { choiceSet: cleansedRuleEntry, tempActor, document });
    return undefined;
  }

  async #checkRule(document, rule, otherDocuments = []) {
    logger.debug("Checking rule", { document, rule, otherDocuments });
    const tempActor = await this.#generateTempActor({
      documents: [document],
      includePassedDocumentsRules: true,
      includeGrants: false,
      // includeFlagsOnly: true,
      otherDocs: otherDocuments,
      // include otherDOcs and grants?
      excludeAddedGrants: true,
    });
    const cleansedRule = foundry.utils.deepClone(rule);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const ruleElement = cleansedRule.key === "ChoiceSet"
        ? new game.pf2e.RuleElements.all.ChoiceSet(cleansedRule, { parent: item })
        : new game.pf2e.RuleElements.all.GrantItem(cleansedRule, { parent: item });
      const rollOptions = [tempActor.getRollOptions(), item.getRollOptions("parent")].flat();

      if (rule.predicate) {
        const predicate = ruleElement.resolveInjectedProperties(ruleElement.predicate);
        if (!predicate.test(rollOptions)) return false;
      }

      const choices = cleansedRule.key === "ChoiceSet"
        ? await ruleElement.inflateChoices(rollOptions, [item])
        : [ruleElement.resolveValue()];

      const isGood = cleansedRule.key === "ChoiceSet"
        ? (await this.#featureChoiceMatch(document, choices, false)) !== undefined
        : ruleElement.test(rollOptions);

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
    } finally {
      await Actor.deleteDocuments([tempActor._id]);
    }
  }

  async #checkRulePredicate(document, rule, processedRules) {
    const tempActor = await this.#generateTempActor({
      documents: [document],
      includePassedDocumentsRules: true,
      // includeGrants: false,
      // includeFlagsOnly: true,
      processedRules,
    });
    const cleansedRule = foundry.utils.deepClone(rule);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const ruleElement = cleansedRule.key === "ChoiceSet"
        ? new game.pf2e.RuleElements.all.ChoiceSet(cleansedRule, { parent: item })
        : new game.pf2e.RuleElements.all.GrantItem(cleansedRule, { parent: item });
      const rollOptions = [tempActor.getRollOptions(), item.getRollOptions("parent")].flat();

      if (rule.predicate) {
        const predicate = ruleElement.resolveInjectedProperties(ruleElement.predicate);
        return predicate.test(rollOptions);
      } else {
        return true;
      }
    } catch (err) {
      logger.error("Something has gone most wrong during rule predicate checking", {
        document,
        rule: cleansedRule,
        tempActor,
      });
      throw err;
    } finally {
      await Actor.deleteDocuments([tempActor._id]);
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
    return name.replace(pattern, `(${localLabel})`);
  }

  static isUuid(uuid) {
    return uuid.match(/Compendium\.(?<origin>[^.]+)\.(?<packName>[^.]+)\.(?<docType>Actor|JournalEntry|Item|Macro|RollTable)\.(?<docName>[^.]+)/g);
  }

  // eslint-disable-next-line complexity, no-unused-vars
  async #addGrantedRules(document, originType = null, choiceHint = null) {
    if (document.system.rules.length === 0) return;
    logger.debug(`addGrantedRules for ${document.name}`, foundry.utils.duplicate(document));

    if (
      foundry.utils.hasProperty(document, "system.level.value")
      && document.system.level.value > foundry.utils.getProperty(this.result.character, "system.details.level.value")
    ) {
      return;
    }

    const rulesToKeep = [];
    this.allFeatureRules[document._id] = foundry.utils.deepClone(document.system.rules);
    this.autoAddedFeatureRules[document._id] = [];
    this.promptRules[document._id] = [];
    let featureRenamed = false;


    const addRuleToKeep = (ruleEntry) => {
      if (rulesToKeep.includes(ruleEntry)) return;
      rulesToKeep.push(ruleEntry);
    };

    for (const ruleEntry of document.system.rules) {
      logger.debug(`Ping ${document.name} rule key: ${ruleEntry.key}`, ruleEntry);
      if (!["ChoiceSet", "GrantItem"].includes(ruleEntry.key)) {
        // size work around due to Pathbuilder not always adding the right size to json
        if (ruleEntry.key === "CreatureSize") this.size = ruleEntry.value;
        this.autoAddedFeatureRules[document._id].push(ruleEntry);
        addRuleToKeep(ruleEntry);
        continue;
      }
      if (NO_AUTO_CHOICE().includes(document.name)) {
        logger.debug(`Deliberately skipping ${document.name} auto choice detection`);
        addRuleToKeep(ruleEntry);
        continue;
      }
      logger.debug(`Checking ${document.name} rule key: ${ruleEntry.key}`, {
        ruleEntry,
        docRules: foundry.utils.deepClone(document.system.rules),
        document: foundry.utils.deepClone(document),
      });

      if (ruleEntry.key === "ChoiceSet" && ruleEntry.predicate) {
        logger.debug(`Checking for predicates`, {
          ruleEntry,
          document,
          rulesToKeep,
        });
        const testResult = await this.#checkRulePredicate(foundry.utils.duplicate(document), ruleEntry, [rulesToKeep]);
        if (!testResult) {
          const data = { document, ruleEntry, testResult };
          logger.debug(
            `The test failed for ${document.name} rule key: ${ruleEntry.key} (This is probably not a problem).`,
            data,
          );
          addRuleToKeep(ruleEntry);
          continue;
        }
      }

      const choice = ruleEntry.key === "ChoiceSet"
        ? await this.#evaluateChoices(document, ruleEntry, choiceHint, rulesToKeep)
        : undefined;
      const { uuid, grantObject } = ruleEntry.key === "GrantItem"
        ? await this.#resolveInjectedUuid(document, ruleEntry, rulesToKeep)
        : { uuid: choice?.value, grantObject: undefined };

      if (choice?.choiceQueryResults) {
        ruleEntry.choiceQueryResults = choice.choiceQueryResults;
      }

      const documentFlagName = Pathmuncher.getFlag(document, ruleEntry);
      // if (flagName && choice?.value && !foundry.utils.hasProperty(document, `flags.pf2e.rulesSelections.${flagName}`)) {
      //   foundry.utils.setProperty(document, `flags.pf2e.rulesSelections.${flagName}`, choice.value);
      // }

      logger.debug(`UUID for ${document.name}: "${uuid}"`, { document, ruleEntry, choice, uuid, grantObject });
      const ruleFeature = ruleEntry.key === "GrantItem" && grantObject
        ? grantObject
        : uuid && typeof uuid === "string" && Pathmuncher.isUuid(uuid) ? await fromUuid(uuid) : undefined;
      // console.warn("ruleFeature", ruleFeature);
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
          foundry.utils.setProperty(document, `flags.pf2e.rulesSelections.${documentFlagName}`, choice.value);
          if (choice.actorFlag) {
            foundry.utils.setProperty(this.result.character, `flags.pf2e.${documentFlagName}`, choice.value);
          }
        }

        if (utils.isString(ruleEntry.rollOption)) {
          const rollFlag = Seasoning.slug(featureDoc.system.slug ?? featureDoc.system.name ?? featureDoc.name);
          ruleEntry.rollOption = `${ruleEntry.rollOption}:${rollFlag}`;
        }

        if (ruleEntry.key === "GrantItem" && !ruleEntry.flag) {
          ruleEntry.flag = featureDocFlagName;
        }

        if (ruleEntry.predicate && ruleEntry.key === "GrantItem") {
          logger.debug(`Checking for grantitem predicates`, {
            ruleEntry,
            document,
            featureDoc,
          });
          const tempDoc = foundry.utils.deepClone(document);
          tempDoc.system.rules = foundry.utils.deepClone(rulesToKeep);
          const testResult = await this.#checkRule(featureDoc, ruleEntry, [tempDoc]);
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

        if (this.autoAddedFeatureIds.has(`${ruleFeature.id}${ruleFeature.type}`)) {
          logger.debug(`Feature ${featureDoc.name} found for ${document.name}, but has already been added (${ruleFeature.id})`, ruleFeature);
          // this.autoAddedFeatureRules[document._id].push(ruleEntry);
          // addRuleToKeep(ruleEntry);
          if (ruleEntry.key === "GrantItem" && ruleEntry.flag) {
            this.autoAddedFeatureRules[document._id].push(ruleEntry);
            addRuleToKeep(ruleEntry);
          }
          continue;
        } else if (ruleEntry.key === "GrantItem") {
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
          this.#createGrantedItem(featureDoc, document, { addGrantFlag: true, itemGrantName: flagName, applyFeatLocation: false });
          if (foundry.utils.hasProperty(featureDoc, "system.rules")) await this.#addGrantedRules(featureDoc);
        }
      } else if (foundry.utils.getProperty(choice, "nouuid")) {
        logger.debug("Parsed no id rule", { choice, uuid, ruleEntry });
        if (!ruleEntry.flag) ruleEntry.flag = Seasoning.slugD(document.name);
        ruleEntry.selection = choice.value;
        if (choice.label) document.name = `${document.name} (${choice.label})`;
        addRuleToKeep(ruleEntry);
      } else if (choice && uuid && !foundry.utils.hasProperty(ruleEntry, "selection")) {
        logger.debug("Parsed odd choice rule", { choice, uuid, ruleEntry });
        // if (!ruleEntry.flag) ruleEntry.flag = Seasoning.slugD(document.name);
        ruleEntry.selection = choice.value;
        if (
          ((!ruleEntry.adjustName && choice.label && typeof uuid === "object")
          || (!choice.adjustName && choice.label))
          && !featureRenamed
        ) {
          document.name = Pathmuncher.adjustDocumentName(document.name, choice.label);
          featureRenamed = true;
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
      if (ruleEntry.adjustName && choice?.label && !featureRenamed) {
        document.name = Pathmuncher.adjustDocumentName(document.name, choice.label);
      }
      this.autoAddedFeatureRules[document._id].push(ruleEntry);

      logger.debug(`End result for ${document.name} for a ${ruleEntry.key}`, {
        document: foundry.utils.deepClone(document),
        rulesToKeep: foundry.utils.deepClone(rulesToKeep),
        ruleEntry: foundry.utils.deepClone(ruleEntry),
        choice: foundry.utils.deepClone(choice),
        uuid: foundry.utils.deepClone(uuid),
      });
    }
    // eslint-disable-next-line require-atomic-updates
    document.system.rules = rulesToKeep;

    logger.debug(`Final status for ${document.name}`, {
      document: foundry.utils.deepClone(document),
      rulesToKeep: foundry.utils.deepClone(rulesToKeep),
    });
  }

  async #delayedSubRuleDocuments({ originType, applyFeatLocation, choiceHint }) {
    for (const subRuleDocument of this.subRuleDocuments[document._id]) {
      logger.debug(
        `Processing granted rules for granted item document ${subRuleDocument.name}`,
        foundry.utils.duplicate(subRuleDocument),
      );
      await this.#addGrantedItems(subRuleDocument, { originType, applyFeatLocation, choiceHint });
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
        logger.debug(`Not processing ${grantedFeature.name} due to level data mismatch`, {
          grantedFeature,
          level,
          levelCap,
          greaterLevelCheck: parseInt(grantedFeature.level) > foundry.utils.getProperty(this.result.character, "system.details.level.value"),
          noLevelMatchCheck: parseInt(grantedFeature.level) !== level,
          characterLevel: foundry.utils.getProperty(this.result.character, "system.details.level.value"),
        });
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
      this.#createGrantedItem(featureDoc, document, { originType, applyFeatLocation });
      if (foundry.utils.hasProperty(featureDoc, "system.rules")) {
        logger.debug(`Processing granted rules for granted item document ${featureDoc.name}`, foundry.utils.duplicate(featureDoc));
        if (this.immediateDiveAdd) {
          await this.#addGrantedItems(featureDoc, { originType, applyFeatLocation, levelCap });
        } else {
          this.subRuleDocuments[document._id].push(featureDoc);
        }
      }
    }
    document.system.items = this.failedFeatureItems[document._id];
  }

  async #addGrantedItems(document, { originType = null, applyFeatLocation = false, choiceHint = null, levelCap = 20 } = {}) {
    this.subRuleDocuments[document._id] = [];
    if (foundry.utils.hasProperty(document, "system.items")) {
      logger.debug(`addGrantedItems for ${document.name}`, foundry.utils.duplicate(document));
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
        await this.#delayedSubRuleDocuments({ originType, applyFeatLocation, choiceHint });
      }
    }

    if (foundry.utils.hasProperty(document, "system.rules")) {
      logger.debug(`Processing granted rules for core document ${document.name}`, { document: foundry.utils.duplicate(document), originType, choiceHint });
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

    this.result.class[0].system.boosts = this.boosts.class;
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

  #indexFind(index, arrayOfNameMatches) {
    for (const name of arrayOfNameMatches) {
      const indexMatch = index.find((i) => {
        const slug = i.system.slug ?? Seasoning.slug(i.name);
        return (
          slug === Seasoning.slug(name)
          || slug === Seasoning.slug(Seasoning.getClassAdjustedSpecialNameLowerCase(name, this.source.class))
          || slug === Seasoning.slug(Seasoning.getAncestryAdjustedSpecialNameLowerCase(name, this.source.ancestry))
          || slug === Seasoning.slug(Seasoning.getHeritageAdjustedSpecialNameLowerCase(name, this.source.heritage))
          || (utils.allowDualClasses()
            && slug === Seasoning.slug(Seasoning.getDualClassAdjustedSpecialNameLowerCase(name, this.source.dualClass)))
        );
      });
      if (indexMatch) return indexMatch;
    }
    return undefined;
  }

  #findInPackIndexes(type, arrayOfNameMatches) {
    const matcher = this.compendiumMatchers[type];
    for (const [packName, index] of Object.entries(matcher.indexes)) {
      const indexMatch = this.#indexFind(index, arrayOfNameMatches);
      if (indexMatch) return { i: indexMatch, pack: matcher.packs[packName] };
    }
    return undefined;
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
    { levelCap = 20, typeFilter = null, excludeChild = false, excludeParents = false, excludeStandard = false } = {},
  ) {
    logger.debug(`Generate feat items for ${type} with level cap "${levelCap}" and filter "${typeFilter}"`);

    for (const featArray of [this.parsed.feats, this.parsed.specials]) {
      for (const pBFeat of featArray) {
        logger.debug(`Checking if  ${pBFeat.name} needs processing`, pBFeat);
        if (pBFeat.added) continue;
        if (Number.isInteger(levelCap) && (pBFeat.level ?? 20) > levelCap) continue;
        if (utils.isString(levelCap) && pBFeat.level !== levelCap) continue;
        if (typeFilter && pBFeat.type !== typeFilter) continue;
        if (excludeChild && pBFeat.isChild === true) continue;
        if (excludeParents && pBFeat.isParent === true) continue;
        if (excludeStandard && pBFeat.isStandard === true) continue;
        logger.debug(`Generating feature for ${pBFeat.name}`, pBFeat);
        if (this.devMode) logger.error(`Generating feature for ${pBFeat.name}`, { pBFeatCloned: foundry.utils.deepClone(pBFeat), pBFeat, this: this });

        const indexMatch = this.#findInPackIndexes(type, [pBFeat.name, pBFeat.originalName]);
        const displayName = pBFeat.extra ? Pathmuncher.adjustDocumentName(pBFeat.name, pBFeat.extra) : pBFeat.name;
        if (!indexMatch) {
          logger.debug(`Unable to match feat ${displayName}`, {
            displayName,
            name: pBFeat.name,
            extra: pBFeat.extra,
            pBFeat,
            type,
          });
          this.check[pBFeat.originalName] = {
            name: displayName,
            type: "feat",
            details: {
              displayName,
              name: pBFeat.name,
              originalName: pBFeat.originalName,
              extra: pBFeat.extra,
              pBFeat,
              type,
            },
          };
          continue;
        }
        if (this.check[pBFeat.originalName]) delete this.check[pBFeat.originalName];
        pBFeat.added = true;
        if (this.autoAddedFeatureIds.has(`${indexMatch._id}${indexMatch.type}`)) {
          logger.debug("Feat included in class features auto add", { displayName, pBFeat, type });
          pBFeat.addedAutoId = `${indexMatch._id}_${indexMatch.type}`;
          continue;
        }

        const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
        const docData = doc.toObject();
        docData._id = foundry.utils.randomID();
        pBFeat.addedId = docData._id;
        // docData.name = displayName;

        this.#generateFoundryFeatLocation(docData, pBFeat);
        this.result.feats.push(docData);
        const options = {
          originType: typeFilter,
          applyFeatLocation: false,
          choiceHint: pBFeat.extra && pBFeat.extra !== "" ? pBFeat.extra : null,
          levelCap,
        };
        await this.#addGrantedItems(docData, "feat", options);
      }
    }
  }

  // async #generateSpecialItems(type) {
  //   for (const special of this.parsed.specials) {
  //     if (special.added) continue;
  //     logger.debug("Generating special for", special);
  //     const indexMatch = this.#findInPackIndexes(type, [special.name, special.originalName]);
  //     if (!indexMatch) {
  //       logger.debug(`Unable to match special ${special.name}`, { special: special.name, type });
  //       this.check[special.originalName] = {
  //         name: special.name,
  //         type: "special",
  //         details: { displayName: special.name, name: special.name, originalName: special.originalName, special },
  //       };
  //       continue;
  //     }
  //     special.added = true;
  //     if (this.check[special.originalName]) delete this.check[special.originalName];
  //     if (this.autoAddedFeatureIds.has(`${indexMatch._id}${indexMatch.type}`)) {
  //       logger.debug("Special included in class features auto add", { special: special.name, type });
  //       special.addedAutoId = `${indexMatch._id}_${indexMatch.type}`;
  //       continue;
  //     }

  //     const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
  //     const docData = doc.toObject();
  //     docData._id = foundry.utils.randomID();
  //     special.addedId = docData._id;
  //     this.result.feats.push(docData);
  //     await this.#addGrantedItems(docData, { applyFeatLocation: true });
  //   }
  // }

  #resizeItem(item) {
    if (Seasoning.isPhysicalItemType(item.type)) {
      const resizeItem = item.type !== "treasure" && !["med", "sm"].includes(this.size);
      if (resizeItem) item.system.size = this.size;
    }
  }

  async #generateAdventurersPack() {
    const defaultCompendium = game.packs.get("pf2e.equipment-srd");
    const index = await defaultCompendium.getIndex({ fields: ["name", "type", "system.slug"] });


    const adventurersPack = this.parsed.equipment.find((e) => e.pbName === "Adventurer's Pack");
    if (adventurersPack) {
      const compendiumBackpack = await defaultCompendium.getDocument("3lgwjrFEsQVKzhh7");
      const backpackInstance = compendiumBackpack.toObject();
      adventurersPack.added = true;
      backpackInstance._id = foundry.utils.randomID();
      adventurersPack.addedId = backpackInstance._id;
      this.result.adventurersPack.item = adventurersPack;
      this.result.equipment.push(backpackInstance);
      for (const content of this.result.adventurersPack.contents) {
        const indexMatch = index.find((i) => i.system.slug === content.slug);
        if (!indexMatch) {
          logger.error(`Unable to match adventurers kit item ${content.name}`, content);
          continue;
        }

        const doc = await defaultCompendium.getDocument(indexMatch._id);
        const itemData = doc.toObject();
        itemData._id = foundry.utils.randomID();
        itemData.system.quantity = content.qty;
        itemData.system.containerId = backpackInstance?._id;
        this.#resizeItem(itemData);
        this.result.equipment.push(itemData);
      }
    }
  }

  async #generateContainers() {
    for (const [key, data] of Object.entries(this.source.equipmentContainers)) {
      if (data.foundryId) continue;
      const name = Seasoning.getFoundryEquipmentName(data.containerName);
      const indexMatch = this.compendiumMatchers["equipment"].getMatch(data.containerName, name);
      const id = foundry.utils.randomID();
      const doc = indexMatch
        ? await indexMatch.pack.getDocument(indexMatch.i._id)
        : await Item.create({ name: data.containerName, type: "backpack" }, { temporary: true });
      const itemData = doc.toObject();
      itemData._id = id;
      this.#resizeItem(itemData);
      this.result["equipment"].push(itemData);
      this.parsed.equipment.push({
        foundryName: name,
        pbName: data.containerName,
        originalName: data.containerName,
        name,
        qty: 1,
        added: true,
        inContainer: undefined,
        container: this.#getContainerData(key),
        foundryId: id,
      });
    }
  }

  async #generateEquipmentItems() {
    for (const e of this.parsed.equipment) {
      if (e.pbName === "Adventurer's Pack") continue;
      if (e.added) continue;
      if (Seasoning.IGNORED_EQUIPMENT().includes(e.pbName)) {
        e.added = true;
        e.addedAutoId = "ignored";
        continue;
      }
      logger.debug("Generating item for", e);
      const indexMatch = this.compendiumMatchers["equipment"].getMatch(e.pbName, e.foundryName);
      if (!indexMatch) {
        logger.error(`Unable to match ${e.pbName}`, e);
        this.bad.push({ pbName: e.pbName, type: "equipment", details: { e } });
        continue;
      }

      const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
      if (doc.type != "kit") {
        const itemData = doc.toObject();
        itemData._id = e.foundryId || foundry.utils.randomID();
        itemData.system.quantity = e.qty;
        const type = doc.type === "treasure" ? "treasure" : "equipment";
        if (e.inContainer) {
          const containerMatch = this.parsed.equipment.find((con) => con.container?.id === e.inContainer);
          if (containerMatch) {
            itemData.system.containerId = containerMatch.foundryId;
            itemData.system.equipped.carryType = "stowed";
          }
        }
        if (e.invested) {
          itemData.system.equipped.carryType = "worn";
          itemData.system.equipped.invested = true;
          itemData.system.equipped.inSlot = true;
          itemData.system.equipped.handsHeld = 0;
        }
        this.#resizeItem(itemData);
        this.result[type].push(itemData);
        e.addedId = itemData._id;
      }
      // eslint-disable-next-line require-atomic-updates
      e.added = true;
    }
  }

  async #processEquipmentItems() {
    // just in case it's in the equipment, pathbuilder should have translated this to items
    await this.#generateAdventurersPack();
    await this.#generateContainers();
    await this.#generateEquipmentItems();
  }

  static RUNE_SCALE = [
    "",
    "Minor",
    "Lesser",
    "Moderate",
    "Greater",
    "Major",
    "Supreme",
  ];

  static REINFORCING_DATA = {
    "Minor": {
      value: 1,
      hp: 44,
    },
    "Lesser": {
      value: 2,
      hp: 52,
    },
    "Moderate": {
      value: 3,
      hp: 64,
    },
    "Greater": {
      value: 4,
      hp: 80,
    },
    "Major": {
      value: 5,
      hp: 84,
    },
    "Supreme": {
      value: 6,
      hp: 108,
    },
  };

  static POTENCY_SCALE = [
    "",
    "striking",
    "greaterStriking",
    "majorStriking",
  ];

  static RESILIENT_SCALE = [
    "",
    "resilient",
    "greaterResilient",
    "majorResilient",
  ];

  // eslint-disable-next-line complexity
  static applyRunes(parsedItem, itemData, type) {
    if (itemData.type == "shield") {
      parsedItem.runes.forEach((rune) => {
        if (rune.startsWith("Reinforcing")) {
          const runeScale = rune.split("(").pop().split(")").shift().trim();
          const runeMatch = Pathmuncher.REINFORCING_DATA[runeScale];
          if (runeMatch) {
            itemData.system.runes.reinforcing = runeMatch.value;
            itemData.system.hp.value += runeMatch.hp;
          }
        } else {
          const runeScale = rune.split("(").pop().split(")").shift().trim();
          const runeLevel = Pathmuncher.RUNE_SCALE.indexOf(runeScale);
          const runeType = rune.split("(").shift().toLowerCase().trim();
          if (runeLevel !== -1) {
            itemData.system.runes[runeType] = runeLevel;
          }
        }
      });
    } else if (foundry.utils.hasProperty(itemData, "system.runes.potency")) {
      itemData.system.runes.potency = parsedItem.pot;
      if (type === "weapon") {
        const striking = Pathmuncher.POTENCY_SCALE.indexOf(parsedItem.str);
        if (striking !== -1) itemData.system.runes.striking = striking;
      } else if (type === "armor") {
        const resilient = Pathmuncher.RESILIENT_SCALE.indexOf(parsedItem.res);
        if (resilient !== -1) itemData.system.runes.resilient = resilient;
      }
    }

    if (type === "armor" && parsedItem.worn
      && ((Number.isInteger(parsedItem.pot) && parsedItem.pot > 0)
        || (parsedItem.res && parsedItem.res !== "")
      )
    ) {
      itemData.system.equipped.invested = true;
    }

    if (foundry.utils.hasProperty(itemData, "system.runes.property")) {
      parsedItem.runes.forEach((property) => {
        const resistantRegex = /Energy Resistant - (.*)/i;
        const resistantMatch = property.match(resistantRegex);
        const vitalizingRegex = /Vitalizing(.*)/i;
        const vitalizingMatch = property.match(vitalizingRegex);
        const bigRegex = /(.*)\((Greater|Major)\)/i;
        const bigMatch = property.match(bigRegex);

        let rune = property;
        if (resistantMatch) rune = `${resistantMatch[1]} Resistant`;
        else if (vitalizingMatch) rune = `Disrupting${vitalizingMatch[1]}`;
        else if (bigMatch) rune = `${bigMatch[2]}${bigMatch[1]}`;
        else if (property === "Quickstrike") rune = "speed";

        itemData.system.runes.property.push(Seasoning.slugD(rune));
      });
    }

    if (parsedItem.mat) {
      const material = parsedItem.mat.split(" (")[0];
      itemData.system.material.type = Seasoning.slug(material);
      itemData.system.material.grade = Seasoning.getMaterialGrade(parsedItem.mat);
    }
  }

  async #createWeaponItem(data) {
    // { pbName, name, prof, qty, die, display, increasedDice, pot, str, mat, runes, attack, damageBonus, extraDamage, damageType }
    logger.debug("Generating weapon for", data);
    const indexMatch = this.compendiumMatchers["equipment"].getMatch(data.pbName, data.foundryName);
    if (!indexMatch) {
      logger.error(`Unable to match weapon item ${data.name}`, data);
      this.bad.push({ pbName: data.pbName, type: "weapon", details: { w: data } });
      return null;
    }

    const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
    const itemData = doc.toObject();
    itemData._id = foundry.utils.randomID();
    itemData.system.quantity = data.qty;
    // because some shields don't have damage dice, but come in as weapons on pathbuilder
    if (itemData.type === "weapon") {
      if (data.die) itemData.system.damage.die = data.die;
      Pathmuncher.applyRunes(data, itemData, "weapon");
    }

    if (data.display.startsWith("Large ") || data.increasedDice) {
      itemData.system.size = "lg";
    } else if (data.display && !Seasoning.IGNORED_EQUIPMENT_DISPLAY(data.display)) {
      itemData.name = data.display;
    }

    this.#resizeItem(itemData);
    this.result.weapons.push(itemData);
    data.added = true;
    data.addedId = itemData._id;
    return itemData;
  }

  async #generateWeaponItems() {
    for (const w of this.parsed.weapons) {
      if (Seasoning.IGNORED_EQUIPMENT().includes(w.pbName)) {
        w.added = true;
        w.addedAutoId = "ignored";
        continue;
      }
      await this.#createWeaponItem(w);
    }
  }

  #adjustArmorItem(itemData, parsedArmor) {
    itemData._id = foundry.utils.randomID();
    itemData.system.equipped.value = parsedArmor.worn ?? false;
    if (!Seasoning.RESTRICTED_EQUIPMENT().some((i) => itemData.name.startsWith(i))) {
      itemData.system.equipped.inSlot = parsedArmor.worn ?? false;
      itemData.system.quantity = parsedArmor.qty;

      const isShield = parsedArmor.prof === "shield";
      itemData.system.equipped.handsHeld = isShield && parsedArmor.worn ? 1 : 0;
      itemData.system.equipped.carryType = isShield && parsedArmor.worn ? "held" : "worn";

      Pathmuncher.applyRunes(parsedArmor, itemData, "armor");
    }
    if (parsedArmor.display) itemData.name = parsedArmor.display;

    this.#resizeItem(itemData);
    return itemData;
  }

  async #generateArmorItems() {
    for (const a of this.parsed.armor) {
      logger.debug("Generating armor for", a);
      if (Seasoning.GRANTED_ITEMS_LIST().includes(a.pbName)) {
        const existingItem = this.result.armor.find((i) => i.name === a.foundryName);
        if (existingItem) {
          existingItem.system.equipped.inSlot = true;
          existingItem.system.equipped.handsHeld = 0;
          a.added = true;
          a.addedId = existingItem._id;
          logger.debug(`Ignoring armor item ${a.pbName} as it has been granted by a feature`);
          continue;
        }
      }
      if (Seasoning.IGNORED_EQUIPMENT().includes(a.pbName)) {
        a.added = true;
        a.addedAutoId = "ignored";
        continue;
      }

      const indexMatch = this.compendiumMatchers["equipment"].getMatch(a.foundryName, `${a.pbName} Armor`);
      if (!indexMatch) {
        logger.error(`Unable to match armor kit item ${a.name}`, a);
        this.bad.push({ pbName: a.pbName, type: "armor", details: { a } });
        continue;
      }

      const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
      const itemData = this.#adjustArmorItem(doc.toObject(), a);
      this.result.armor.push(itemData);
      a.addedId = itemData._id;
      a.added = true;
    }
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

  async #loadSpell(spell, casterId, debugData) {
    const spellName = spellRename(spell.split("(")[0].trim());
    logger.debug("focus spell details", { spell, spellName, debugData });

    const indexMatch = this.compendiumMatchers["spells"].getMatch(spell, spellName, true);
    if (!indexMatch) {
      if (debugData.psychicAmpSpell) return undefined;
      logger.error(`Unable to match focus spell ${spell}`, { spell, spellName, debugData });
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
    for (const spellSelection of caster.spells) {
      const level = spellSelection.spellLevel;
      const preparedAtLevel = caster.prepared?.length > 0
        ? (caster.prepared.find((p) => p.spellLevel === level)?.list ?? [])
        : [];
      let preparedValue = 0;

      // const preparedMap = preparedAtLevel.reduce((acc, e) => acc.set(e, (acc.get(e) || 0) + 1), new Map());

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
            // eslint-disable-next-line require-atomic-updates
            instance.system.slots[`slot${level}`].prepared[preparedValue] = { id: itemData._id };
            preparedValue++;
          }
        }
      }

      for (const spell of preparedAtLevel) {
        // if (spellNames.includes(spellName)) continue;
        const parsedSpell = foundry.utils.getProperty(spellNames, spell);
        const itemData = parsedSpell
          ? this.result.spells.find((s) => s._id === parsedSpell)
          : await this.#loadSpell(spell, instance._id, {
            spellSelection,
            level,
            instance,
          });
        if (itemData) {
          itemData.system.location.heightenedLevel = level;
          if (itemData && !parsedSpell) {
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

  async #processRituals() {
    if (!this.source.rituals) return;
    const ritualCompendium = new CompendiumMatcher({
      type: "spells",
      indexFields: ["name", "type", "system.slug", "system.ritual"],
    });
    await ritualCompendium.loadCompendiums();

    for (const ritual of this.source.rituals) {
      const ritualName = ritual.split("(")[0].trim();
      logger.debug("focus spell details", { ritual, spellName: ritualName });

      const indexMatch = this.compendiumMatchers["spells"].getNameMatchWithFilter(ritualName, ritualName);
      if (!indexMatch || !foundry.utils.hasProperty(indexMatch, "system.ritual")) {
        logger.error(`Unable to match ritual spell ${ritual}`, { spell: ritual, spellName: ritualName });
        this.bad.push({ pbName: ritual, type: "spell", details: { originalName: ritual, name: ritualName } });
        continue;
      }

      const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
      const itemData = doc.toObject();
      itemData._id = foundry.utils.randomID();

      this.result.spells.push(itemData);
    }
  }

  async #processSpells() {
    for (const caster of this.source.spellCasters) {
      logger.debug("Generating caster for", caster);
      if (Number.isInteger(parseInt(caster.focusPoints))) this.result.focusPool += caster.focusPoints;
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

    foundry.utils.setProperty(this.result.character, "system.resources.focus.max", this.source.focusPoints);
    foundry.utils.setProperty(this.result.character, "system.resources.focus.value", this.source.focusPoints);
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

  async #generateMoney() {
    const compendium = game.packs.get("pf2e.equipment-srd");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });
    const moneyLookup = [
      { slug: "platinum-pieces", type: "pp" },
      { slug: "gold-pieces", type: "gp" },
      { slug: "silver-pieces", type: "sp" },
      { slug: "copper-pieces", type: "cp" },
    ];

    for (const lookup of moneyLookup) {
      const indexMatch = index.find((i) => i.system.slug === lookup.slug);
      if (indexMatch) {
        const doc = await compendium.getDocument(indexMatch._id);
        const itemData = doc.toObject();
        itemData._id = foundry.utils.randomID();
        itemData.system.quantity = this.source.money[lookup.type];
        this.result.money.push(itemData);
      }
    }
  }

  async #processFormulas() {
    const uuids = [];

    for (const formulaSource of this.source.formula) {
      for (const formulaName of formulaSource.known) {
        const indexMatch = this.compendiumMatchers["formulas"].getMatch(formulaName, formulaName);
        if (!indexMatch) {
          logger.error(`Unable to match formula ${formulaName}`, { formulaSource, name: formulaName });
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
    this.#statusUpdate(1, 5, "Feats");
    await this.#generateFeatItems("feats");
    this.#statusUpdate(2, 5, "Feats");
    await this.#generateFeatItems("ancestryFeatures");
    this.#statusUpdate(3, 5, "Feats");
    // await this.#generateSpecialItems("ancestryFeatures");
    // this.#statusUpdate(4, 5, "Feats");
    // await this.#generateSpecialItems("classFeatures");
    // this.#statusUpdate(5, 5, "Feats");
    // await this.#generateSpecialItems("actions");
  }

  async #processEquipment() {
    this.#statusUpdate(1, 4, "Equipment");
    await this.#processEquipmentItems();
    this.#statusUpdate(2, 4, "Weapons");
    await this.#generateWeaponItems();
    this.#statusUpdate(3, 4, "Armor");
    await this.#generateArmorItems();
    this.#statusUpdate(2, 4, "Money");
    await this.#generateMoney();
  }

  async #generateTempActor({ documents = [], includePassedDocumentsRules = false, includeGrants = false,
    includeFlagsOnly = false, processedRules = [], otherDocs = [], excludeAddedGrants = false } = {},
  ) {
    const actorData = foundry.utils.mergeObject({ type: "character", flags: { pathmuncher: { temp: true } } }, this.result.character);
    actorData.name = `Mr Temp (${this.result.character.name})`;
    if (documents.map((d) => d.name.split("(")[0].trim().toLowerCase()).includes("skill training")) {
      delete actorData.system.skills;
    }

    const actor = await Actor.create(actorData, { renderSheet: false });
    const currentState = foundry.utils.duplicate(this.result);

    // console.warn("Initial temp actor", {
    //   initialTempActor: foundry.utils.deepClone(actor),
    //   documents,
    //   includePassedDocumentsRules,
    //   includeGrants,
    //   includeFlagsOnly,
    //   processedRules,
    //   otherDocs,
    //   excludeAddedGrants,
    //   this: this,
    // });

    const currentItems = [
      ...currentState.deity,
      ...currentState.ancestry,
      ...currentState.heritage,
      ...currentState.background,
      ...currentState.class,
      ...currentState.lores,
      ...currentState.feats,
      ...currentState.casters,
      // ...currentState.spells,
      // ...currentState.equipment,
      // ...currentState.weapons,
      // ...currentState.armor,
      // ...currentState.treasure,
      // ...currentState.money,
    ].filter((i) => !otherDocs.some((o) => i._id === o._id));
    currentItems.push(...otherDocs);
    for (const doc of documents) {
      if (!currentItems.some((d) => d._id === doc._id)) {
        currentItems.push(foundry.utils.deepClone(doc));
      }
    }
    try {
      // if the rule selected is an object, id doesn't take on import
      const ruleUpdates = [];
      for (const i of foundry.utils.deepClone(currentItems)) {
        if (!i.system.rules || i.system.rules.length === 0) continue;
        const isPassedDocument = documents.some((d) => d._id === i._id);
        if (isPassedDocument && processedRules.length > 0) {
          i.system.rules = foundry.utils.deepClone(processedRules);
          continue;
        } else if (isPassedDocument && !includePassedDocumentsRules && !includeFlagsOnly) {
          continue;
        }

        const objectSelectionRules = i.system.rules
          .filter((r) => {
            const evaluateRules = ["RollOption", "ChoiceSet"].includes(r.key) && (r.selection || r.domain === "all");
            return !includeFlagsOnly || evaluateRules || ["ActiveEffectLike"].includes(r.key);
          })
          .map((r) => {
            r.ignored = false;
            return r;
          });

        if (objectSelectionRules.length > 0) {
          ruleUpdates.push({
            _id: i._id,
            system: {
              rules: objectSelectionRules,
            },
          });
        }
      }

      // console.warn("Rule updates", foundry.utils.duplicate(ruleUpdates));

      const items = foundry.utils.duplicate(currentItems).map((i) => {
        if (i.system.items) i.system.items = [];
        if (i.system.rules) {
          i.system.rules = i.system.rules
            // eslint-disable-next-line complexity
            .filter((r) => {
              const allowedMiscKeys = ["RollOption", "ActiveEffectLike"].includes(r.key);
              if (allowedMiscKeys) return true;
              const isOtherDocument = otherDocs.some((d) => d._id === i._id);
              const excludeAddedGrant = excludeAddedGrants && ["GrantItem"].includes(r.key) && this.grantItemLookUp.has(r.uuid);
              const otherDocumentGrantRules = isOtherDocument && excludeAddedGrant;
              if (otherDocumentGrantRules) return false;
              if (isOtherDocument) return true;

              const isPassedDocument = documents.some((d) => d._id === i._id);
              const isChoiceSetSelection = ["ChoiceSet"].includes(r.key) && r.selection;
              const grantRuleWithoutFlag = includeGrants && ["GrantItem"].includes(r.key) && !r.flag;
              // if (excludeAddedGrant && grantRuleWithoutFlag) return false;
              const genericDiscardRule = ["ChoiceSet", "GrantItem"].includes(r.key);
              const grantRuleFromItemFlag = includeGrants && ["GrantItem"].includes(r.key) && r.uuid.includes("{item|flags");

              const notPassedDocumentRules
                = !isPassedDocument
                // && !excludeAddedGrant
                && (grantRuleWithoutFlag
                  // || choiceSetSelectionNotObject
                  || !genericDiscardRule
                  || grantRuleFromItemFlag);

              const passedDocumentRules
                = isPassedDocument
                && includePassedDocumentsRules
                // && !excludeAddedGrant
                && (isChoiceSetSelection || grantRuleWithoutFlag || grantRuleFromItemFlag);

              return notPassedDocumentRules || passedDocumentRules;
            })
            .map((r) => {
              // if choices is a string or an object then we replace with the query string results
              if ((utils.isString(r.choices) || utils.isObject(r.choices)) && r.choiceQueryResults) {
                r.choices = r.choiceQueryResults;
              }
              r.ignored = false;
              return r;
            });
          if (documents.some((d) => d._id === i._id) && processedRules.length > 0 && includeFlagsOnly) {
            i.system.rules = foundry.utils.deepClone(processedRules).filter((r) => {
              const excludeAddedGrant = excludeAddedGrants && ["GrantItem"].includes(r.key) && this.grantItemLookUp.has(r.uuid);
              if (excludeAddedGrant) return false;
              const noGrants = !includeGrants && !["GrantItem"].includes(r.key);
              if (noGrants) return false;
              const grantRuleFromItemFlag = ["GrantItem"].includes(r.key) && r.uuid.includes("{item|flags");
              if (!grantRuleFromItemFlag) return true;
              if (grantRuleFromItemFlag && r.alterations) return true;
              return false;
            });
          }
        }
        return i;
      });

      logger.debug("Creating temp actor items", items);
      await actor.createEmbeddedDocuments("Item", items, { keepId: true });
      // for (const item of items) {
      //   console.warn("Item", item);
      //   await actor.createEmbeddedDocuments("Item", [item], { keepId: true });
      // }
      logger.debug("restoring selection rules to temp items", ruleUpdates);
      await actor.updateEmbeddedDocuments("Item", ruleUpdates);

      const itemUpdates = [];
      for (const [key, value] of Object.entries(this.autoAddedFeatureItems)) {
        itemUpdates.push({
          _id: `${key}`,
          system: {
            items: foundry.utils.deepClone(value),
          },
        });
      }

      logger.debug("Restoring temp item items");
      await actor.updateEmbeddedDocuments("Item", itemUpdates);

      logger.debug("Final temp actor", actor);
    } catch (err) {
      logger.error("Temp actor creation failed", {
        actor,
        documents,
        thisData: foundry.utils.deepClone(this.result),
        actorData,
        err,
        currentItems,
        this: this,
      });
    }
    return actor;
  }

  async processCharacter() {
    if (!this.source) return;
    await this.#prepare();
    this.#statusUpdate(1, 12, "Character");
    await this.#processCore();
    this.#statusUpdate(2, 12, "Formula");
    await this.#processFormulas();
    this.#statusUpdate(3, 12, "Deity");
    await this.#processGenericCompendiumLookup("deities", this.source.deity, "deity");

    this.#statusUpdate(4, 12, "Ancestry");
    await this.#processGenericCompendiumLookup("ancestries", this.source.ancestry, "ancestry");
    this.#statusUpdate(5, 12, "Heritage");
    await this.#processGenericCompendiumLookup("heritages", this.source.heritage, "heritage");
    this.#statusUpdate(6, 12, "Background");
    await this.#processGenericCompendiumLookup("backgrounds", this.source.background, "background");

    this.#setSkills(true);
    this.#setLanguages();

    this.#statusUpdate(7, 12, "Class");
    await this.#processGenericCompendiumLookup("classes", this.source.class, "class", 1);

    this.#setAbilityBoosts();

    this.#statusUpdate(8, 12, "FeatureRec");
    await this.#processFeats();
    this.#statusUpdate(10, 12, "Equipment");
    await this.#processEquipment();
    this.#statusUpdate(11, 12, "Spells");
    await this.#processSpells();
    this.#statusUpdate(11, 12, "Rituals");
    await this.#processRituals();
    this.#statusUpdate(12, 12, "Lores");
    await this.#generateLores();
  }

  async #removeDocumentsToBeUpdated() {
    const moneyIds = this.actor.items.filter((i) =>
      i.type === "treasure"
      && ["Platinum Pieces", "Gold Pieces", "Silver Pieces", "Copper Pieces"].includes(i.name),
    );
    const classIds = this.actor.items.filter((i) => i.type === "class").map((i) => i._id);
    const deityIds = this.actor.items.filter((i) => i.type === "deity").map((i) => i._id);
    const backgroundIds = this.actor.items.filter((i) => i.type === "background").map((i) => i._id);
    const heritageIds = this.actor.items.filter((i) => i.type === "heritage").map((i) => i._id);
    const ancestryIds = this.actor.items.filter((i) => i.type === "ancestry").map((i) => i._id);
    const treasureIds = this.actor.items
      .filter((i) => i.type === "treasure" && !moneyIds.includes(i.id))
      .map((i) => i._id);
    const featIds = this.actor.items.filter((i) => i.type === "feat").map((i) => i._id);
    const actionIds = this.actor.items.filter((i) => i.type === "action").map((i) => i._id);
    const equipmentIds = this.actor.items
      .filter((i) => i.type === "equipment" || i.type === "backpack" || i.type === "consumable")
      .map((i) => i._id);
    const weaponIds = this.actor.items.filter((i) => i.type === "weapon").map((i) => i._id);
    const armorIds = this.actor.items.filter((i) => i.type === "armor").map((i) => i._id);
    const loreIds = this.actor.items.filter((i) => i.type === "lore").map((i) => i._id);
    const spellIds = this.actor.items
      .filter((i) => i.type === "spell" || i.type === "spellcastingEntry")
      .map((i) => i._id);
    const formulaIds = this.actor.system.formulas;

    logger.debug("ids", {
      moneyIds,
      deityIds,
      classIds,
      backgroundIds,
      heritageIds,
      ancestryIds,
      treasureIds,
      featIds,
      actionIds,
      equipmentIds,
      weaponIds,
      armorIds,
      loreIds,
      spellIds,
      formulaIds,
    });
    // eslint-disable-next-line complexity
    const keepIds = this.actor.items.filter((i) =>
      (!this.options.addMoney && moneyIds.includes(i._id))
      || (!this.options.addClass && classIds.includes(i._id))
      || (!this.options.addDeity && deityIds.includes(i._id))
      || (!this.options.addBackground && backgroundIds.includes(i._id))
      || (!this.options.addHeritage && heritageIds.includes(i._id))
      || (!this.options.addAncestry && ancestryIds.includes(i._id))
      || (!this.options.addTreasure && treasureIds.includes(i._id))
      || (!this.options.addFeats && (featIds.includes(i._id) || actionIds.includes(i._id)))
      || (!this.options.addEquipment && equipmentIds.includes(i._id))
      || (!this.options.addWeapons && weaponIds.includes(i._id))
      || (!this.options.addArmor && armorIds.includes(i._id))
      || (!this.options.addLores && loreIds.includes(i._id))
      || (!this.options.addSpells && spellIds.includes(i._id)),
    ).map((i) => i._id);

    const deleteIds = this.actor.items.filter((i) => !keepIds.includes(i._id)).map((i) => i._id);
    logger.debug("ids", {
      deleteIds,
      keepIds,
    });
    await this.actor.deleteEmbeddedDocuments("Item", deleteIds);
  }

  async #createAndUpdateItemsWithRuleRestore(items) {
    const ruleUpdates = [];

    const newItems = foundry.utils.deepClone(items);

    for (const item of newItems) {
      if (item.system.rules?.length > 0) {
        ruleUpdates.push({
          _id: item._id,
          system: {
            rules: foundry.utils.deepClone(item.system.rules).map((r) => {
              delete r.choiceQueryResults;
              return r;
            }),
          },
        });
        item.system.rules = item.system.rules
          .filter((r) => {
            const excludedKeys = ["ActiveEffectLike", "AdjustModifier", "Resistance", "Strike"].includes(r.key);
            const grantItemWithFlags = ["GrantItem"].includes(r.key)
              && (foundry.utils.hasProperty(r, "flag") || foundry.utils.getProperty(r, "pathmuncherImport"));
            const objectSelection = ["ChoiceSet"].includes(r.key) && utils.isObject(r.selection);
            return !excludedKeys && !grantItemWithFlags && !objectSelection;
          })
          .map((r) => {
            if (r.key === "ChoiceSet") {
              if ((utils.isString(r.choices) || utils.isObject(r.choices)) && r.choiceQueryResults) {
                r.choices = r.choiceQueryResults;
              }
              if (Array.isArray(r.choices)) {
                r.choices = r.choices.map((c) => {
                  delete c.predicate;
                  return c;
                });
              }
            }
            if (r.pathmuncherImport) r.pathmuncherImport = undefined;
            return r;
          });
      }
    }

    logger.debug("Creating items", newItems);
    await this.actor.createEmbeddedDocuments("Item", newItems, { keepId: true });
    logger.debug("Rule updates", ruleUpdates);
    await this.actor.updateEmbeddedDocuments("Item", ruleUpdates);
  }

  async #updateItems(type) {
    logger.debug(`Updating ${type}`, this.result[type]);
    await this.actor.updateEmbeddedDocuments("Item", this.result[type]);
  }

  async #createActorEmbeddedDocuments() {
    this.#statusUpdate(1, 12, "Character", "Eating");
    if (this.options.addDeity) await this.#createAndUpdateItemsWithRuleRestore(this.result.deity);
    if (this.options.addAncestry) await this.#createAndUpdateItemsWithRuleRestore(this.result.ancestry);
    if (this.options.addHeritage) await this.#createAndUpdateItemsWithRuleRestore(this.result.heritage);
    if (this.options.addBackground) await this.#createAndUpdateItemsWithRuleRestore(this.result.background);
    if (this.options.addClass) await this.#createAndUpdateItemsWithRuleRestore(this.result.class);
    if (this.options.addLores) await this.#createAndUpdateItemsWithRuleRestore(this.result.lores);

    const featNums = this.result.feats.length;
    if (this.options.addFeats) {
      for (const [i, feat] of this.result.feats.entries()) {
        // console.warn(`creating ${feat.name}`, feat);
        this.#statusUpdate(i, featNums, "Feats", "Eating");
        await this.#createAndUpdateItemsWithRuleRestore([feat]);
      }
    }
    // if (this.options.addFeats) await this.#createAndUpdateItemsWithRuleRestore(this.result.feats);
    if (this.options.addSpells) {
      this.#statusUpdate(3, 12, "Spells", "Eating");
      await this.#createAndUpdateItemsWithRuleRestore(this.result.casters);
      await this.#createAndUpdateItemsWithRuleRestore(this.result.spells);
    }
    this.#statusUpdate(4, 12, "Equipment", "Eating");
    if (this.options.addEquipment) {
      await this.#createAndUpdateItemsWithRuleRestore(this.result.equipment);
      await this.#updateItems("equipment");
    }
    if (this.options.addWeapons) await this.#createAndUpdateItemsWithRuleRestore(this.result.weapons);
    if (this.options.addArmor) {
      await this.#createAndUpdateItemsWithRuleRestore(this.result.armor);
      await this.#updateItems("armor");
    }
    if (this.options.addTreasure) await this.#createAndUpdateItemsWithRuleRestore(this.result.treasure);
    if (this.options.addMoney) await this.#createAndUpdateItemsWithRuleRestore(this.result.money);
  }

  async #restoreEmbeddedRuleLogic() {
    const importedItems = this.actor.items.map((i) => i._id);
    // Loop back over items and add rule and item progression data back in.
    logger.debug("Restoring logic", { currentActor: foundry.utils.duplicate(this.actor) });
    const itemUpdates = [];
    for (const [key, value] of Object.entries(this.autoAddedFeatureItems)) {
      if (importedItems.includes(key)) {
        itemUpdates.push({
          _id: `${key}`,
          system: {
            items: foundry.utils.deepClone(value),
          },
        });
      }
    }
    this.#statusUpdate(1, 12, "Feats", "Clearing");
    logger.debug("Restoring granted item logic", itemUpdates);
    await this.actor.updateEmbeddedDocuments("Item", itemUpdates);

    await this.actor.update({
      "system.resources.focus": this.result.character.system.resources.focus,
    });
  }

  static async removeTempActors() {
    for (const actor of game.actors.filter((a) => foundry.utils.getProperty(a, "flags.pathmuncher.temp") === true)) {
      await actor.delete();
    }
  }

  async updateActor() {
    await this.#removeDocumentsToBeUpdated();

    if (!this.options.addName) {
      delete this.result.character.name;
      delete this.result.character.prototypeToken.name;
    }
    if (!this.options.addFormulas) {
      delete this.result.character.system.formulas;
    }

    if (!this.boosts.custom) {
      foundry.utils.setProperty(this.result.character, `system.abilities`, null);
    }

    logger.debug("Generated result", this.result);
    await this.actor.update(this.result.character);
    await this.#createActorEmbeddedDocuments();
    await this.#restoreEmbeddedRuleLogic();
    await Pathmuncher.removeTempActors();
  }

  async postImportCheck() {
    const badClass = this.options.addClass
      ? this.bad.filter((b) => b.type === "class").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Class")}: ${b.pbName}</li>`)
      : [];
    const badHeritage = this.options.addHeritage
      ? this.bad.filter((b) => b.type === "heritage").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Heritage")}: ${b.pbName}</li>`)
      : [];
    const badAncestry = this.options.addAncestry
      ? this.bad.filter((b) => b.type === "ancestry").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Ancestry")}: ${b.pbName}</li>`)
      : [];
    const badBackground = this.options.addBackground
      ? this.bad.filter((b) => b.type === "background").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Background")}: ${b.pbName}</li>`)
      : [];
    const badDeity = this.options.addDeity
      ? this.bad.filter((b) => b.type === "deity" && b.pbName !== "Not set" && b.pbName !== "").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Deity")}: ${b.pbName}</li>`)
      : [];
    const badFeats = this.options.addFeats
      ? this.bad.filter((b) => b.type === "feat").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Feats")}: ${b.pbName}</li>`)
      : [];
    const badFeats2 = this.options.addFeats
      ? Object.values(this.check).filter((b) =>
        b.type === "feat"
        && this.parsed.feats.some((f) => f.name === b.details.name && !f.added)
        && !BAD_IGNORE_FEATURES(b.details.name),
      ).map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Feats")}: ${b.details.name}</li>`)
      : [];
    const badSpecials = this.options.addFeats
      ? Object.values(this.check).filter((b) =>
        (b.type === "special")
        && this.parsed.specials.some((f) => f.name === b.details.name && !f.added)
        && !BAD_IGNORE_FEATURES(b.details.name),
      ).map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Specials")}: ${b.details.originalName}</li>`)
      : [];
    const badEquipment = this.options.addEquipment
      ? this.bad.filter((b) => b.type === "equipment").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Equipment")}: ${b.pbName}</li>`)
      : [];
    const badWeapons = this.options.addWeapons
      ? this.bad.filter((b) => b.type === "weapons").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Weapons")}: ${b.pbName}</li>`)
      : [];
    const badArmor = this.options.addArmor
      ? this.bad.filter((b) => b.type === "armor").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Armor")}: ${b.pbName}</li>`)
      : [];
    const badSpellcasting = this.options.addSpells
      ? this.bad.filter((b) => b.type === "spellcasting").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Spellcasting")}: ${b.pbName}</li>`)
      : [];
    const badSpells = this.options.addSpells
      ? this.bad.filter((b) => b.type === "spells").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Spells")}: ${b.pbName}</li>`)
      : [];
    const badFamiliars = this.options.addFamiliars
      ? this.bad.filter((b) => b.type === "familiars").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Familiars")}: ${b.pbName}</li>`)
      : [];
    const badFormulas = this.options.addFormulas
      ? this.bad.filter((b) => b.type === "formulas").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Formulas")}: ${b.pbName}</li>`)
      : [];
    const totalBad = [
      ...badClass,
      ...badAncestry,
      ...badHeritage,
      ...badBackground,
      ...badDeity,
      ...badFeats,
      ...badFeats2,
      ...badSpecials,
      ...badEquipment,
      ...badWeapons,
      ...badArmor,
      ...badSpellcasting,
      ...badSpells,
      ...badFamiliars,
      ...badFormulas,
    ];

    let warning = "";

    if (totalBad.length > 0) {
      warning += `<p>${game.i18n.localize("pathmuncher.Dialogs.Pathmuncher.MissingItemsOpen")}</p><ul>${totalBad.join("\n")}</ul><br>`;
    }

    logger.debug("Bad thing check", {
      badClass,
      badAncestry,
      badHeritage,
      badBackground,
      badDeity,
      badFeats,
      badFeats2,
      badSpecials,
      badEquipment,
      badWeapons,
      badArmor,
      badSpellcasting,
      badSpells,
      badFamiliars,
      badFormulas,
      totalBad,
      count: totalBad.length,
      focusPool: this.result.focusPool,
      warning,
    });

    if (totalBad.length > 0) {
      ui.notifications.warn(game.i18n.localize("pathmuncher.Dialogs.Pathmuncher.CompletedWithNotes"));
      new Dialog({
        title: game.i18n.localize("pathmuncher.Dialogs.Pathmuncher.ImportNotes"),
        content: warning,
        buttons: {
          yes: {
            icon: "<i class='fas fa-check'></i>",
            label: game.i18n.localize("pathmuncher.Labels.Finished"),
          },
        },
        default: "yes",
      }).render(true);
    } else {
      ui.notifications.info(game.i18n.localize("pathmuncher.Dialogs.Pathmuncher.CompletedSuccess"));
    }
  }
}
