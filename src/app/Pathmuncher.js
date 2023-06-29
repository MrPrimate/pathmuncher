/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import CONSTANTS from "../constants.js";
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

  getFoundryFeatureName(pbName) {
    const match = this.FEAT_RENAME_MAP(pbName).find((map) => map.pbName == pbName);
    return match ?? { pbName, foundryName: pbName, details: undefined };
  }

  constructor(actor, { addFeats = true, addEquipment = true, addSpells = true, addMoney = true, addLores = true,
    addWeapons = true, addArmor = true, addTreasure = true, addDeity = true, addName = true, addClass = true,
    addBackground = true, addHeritage = true, addAncestry = true, askForChoices = false, statusCallback = null } = {}
  ) {
    this.actor = actor;
    // note not all these options do anything yet!
    this.options = {
      addTreasure,
      addMoney,
      addFeats,
      addSpells,
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
      askForChoices,
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
    this.grantItemLookUp = {};
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
        `https://www.pathbuilder2e.com/json.php?id=${pathbuilderId}`
      );
      if (jsonData.success) {
        this.source = jsonData.build;
      } else {
        ui.notifications.warn(
          game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.FetchFailed`, { pathbuilderId })
        );
      }
    } else {
      ui.notifications.error(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.NoId`));
    }
  }

  #generateFoundryFeatLocation(document, feature) {
    if (feature.type && feature.level) {
      const ancestryParagonVariant = game.settings.get("pf2e", "ancestryParagonVariant");
      const dualClassVariant = game.settings.get("pf2e", "dualClassVariant");
      // const freeArchetypeVariant = game.settings.get("pf2e", "freeArchetypeVariant");
      const location = Seasoning.getFoundryFeatLocation(feature.type, feature.level);
      if (location && !this.usedLocations.has(location)) {
        document.system.location = location;
        this.usedLocations.add(location);
      } else if (location && this.usedLocations.has(location)) {
        logger.debug("Variant feat location", { ancestryParagonVariant, location, feature });
        // eslint-disable-next-line max-depth
        if (ancestryParagonVariant && feature.type === "Ancestry Feat") {
          document.system.location = "ancestry-bonus";
          this.usedLocationsAlternateRules.add(location);
        } else if (dualClassVariant && feature.type === "Class Feat") {
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

  #nameMap() {
    logger.debug("Starting Equipment Rename");
    this.source.equipment
      .filter((e) => e[0] && e[0] !== "undefined")
      .forEach((e) => {
        const name = Seasoning.getFoundryEquipmentName(e[0]);
        const containerKey = Object.keys(this.source.equipmentContainers)
          .find((key) => this.source.equipmentContainers[key].containerName === name);

        const container = containerKey ? this.#getContainerData(containerKey) : null;
        const foundryId = foundry.utils.randomID();

        if (container) {
          this.source.equipmentContainers[containerKey].foundryId = foundryId;
        }

        const item = {
          pbName: name,
          qty: e[1],
          added: false,
          addedId: null,
          addedAutoId: null,
          inContainer: e[2] !== "Invested" ? e[2] : null,
          container,
          foundryId,
          invested: e[2] === "Invested",
        };
        this.parsed.equipment.push(item);
      });
    this.source.armor
      .filter((e) => e && e !== "undefined")
      .forEach((e) => {
        const name = Seasoning.getFoundryEquipmentName(e.name);
        const item = mergeObject({
          pbName: name,
          originalName: e.name,
          added: false,
          addedId: null,
          addedAutoId: null,
        }, e);
        this.parsed.armor.push(item);
      });
    this.source.weapons
      .filter((e) => e && e !== "undefined")
      .forEach((e) => {
        const name = Seasoning.getFoundryEquipmentName(e.name);
        const item = mergeObject({
          pbName: name,
          originalName:
          e.name,
          added: false,
          addedId: null,
          addedAutoId: null,
        }, e);
        this.parsed.weapons.push(item);
      });
    logger.debug("Finished Equipment Rename");

    logger.debug("Starting Special Rename");
    this.source.specials
      .filter((special) =>
        special
        && special !== "undefined"
        && special !== "Not Selected"
        && special !== this.source.heritage
      )
      .forEach((special) => {
        const name = this.getFoundryFeatureName(special).foundryName;
        if (!this.#processSpecialData(name) && !Seasoning.IGNORED_SPECIALS().includes(name)) {
          this.parsed.specials.push({ name, originalName: special, added: false, addedId: null, addedAutoId: null });
        }
      });
    logger.debug("Finished Special Rename");

    logger.debug("Starting Feat Rename");
    this.source.feats
      .filter((feat) =>
        feat[0]
        && feat[0] !== "undefined"
        && feat[0] !== "Not Selected"
        // && feat[0] !== this.source.heritage
      )
      .forEach((feat) => {
        const name = this.getFoundryFeatureName(feat[0]).foundryName;
        const data = {
          name,
          extra: feat[1],
          added: feat[0] === this.source.heritage,
          addedId: null,
          addedAutoId: "heritage",
          type: feat[2],
          level: feat[3],
          originalName: feat[0],
        };
        this.parsed.feats.push(data);
      });
    logger.debug("Finished Feat Rename");
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
      });
      this.source.background = match[1];
    }
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
    setProperty(this.result.character, "system.traits.senses", senses);
  }

  async #addDualClass(klass) {
    if (!game.settings.get("pf2e", "dualClassVariant")) {
      if (this.source.dualClass && this.source.dualClass !== "") {
        logger.warn(`Imported character is dual class but system is not configured for dual class`, {
          class: this.source.class,
          dualClass: this.source.dualClass,
        });
        ui.notifications.warn(`Imported character is dual class but system is not configured for dual class`);
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

    // find the dual class
    const foundryName = this.getFoundryFeatureName(this.source.dualClass).foundryName;
    const indexMatch = this.compendiumMatchers["classes"].getNameMatch(this.source.dualClass, foundryName);

    if (!indexMatch) return;
    const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
    const dualClass = doc.toObject();

    logger.debug(`Dual Class ${dualClass.name} found, squashing things together.`);

    klass.name = `${klass.name} - ${dualClass.name}`;
    const ruleEntry = {
      domain: "all",
      key: "RollOption",
      option: `class:${dualClass.system.slug}`,
    };

    // Attacks
    ["advanced", "martial", "simple", "unarmed"].forEach((key) => {
      if (dualClass.system.attacks[key] > klass.system.attacks[key]) {
        klass.system.attacks[key] = dualClass.system.attacks[key];
      }
    });
    if (klass.system.attacks.martial <= dualClass.system.attacks.other.rank) {
      if (dualClass.system.attacks.other.rank === klass.system.attacks.other.rank) {
        let mashed = `${klass.system.attacks.other.name}, ${dualClass.system.attacks.other.name}`;
        mashed = mashed.replace("and ", "");
        klass.system.attacks.other.name = [...new Set(mashed.split(","))].join(",");
      }
      if (dualClass.system.attacks.other.rank > klass.system.attacks.other.rank) {
        klass.system.attacks.other.name = dualClass.system.attacks.other.name;
        klass.system.attacks.other.rank = dualClass.system.attacks.other.rank;
      }
    }
    if (
      klass.system.attacks.martial >= dualClass.system.attacks.other.rank
      && klass.system.attacks.martial >= klass.system.attacks.other.rank
    ) {
      klass.system.attacks.other.rank = 0;
      klass.system.attacks.other.name = "";
    }

    // Class DC
    if (dualClass.system.classDC > klass.system.classDC) {
      klass.system.classDC = dualClass.system.classDC;
    }

    // Defenses
    ["heavy", "light", "medium", "unarmored"].forEach((key) => {
      if (dualClass.system.defenses[key] > klass.system.defenses[key]) {
        klass.system.defenses[key] = dualClass.system.defenses[key];
      }
    });

    // Description
    klass.system.description.value = `${klass.system.description.value} ${dualClass.system.description.value}`;

    // HP
    if (dualClass.system.hp > klass.system.hp) {
      klass.system.hp = dualClass.system.hp;
    }

    // Items
    Object.entries(dualClass.system.items).forEach((i) => {
      if (Object.values(klass.system.items).some((x) => x.uuid === i[1].uuid && x.level > i[1].level)) {
        Object.values(klass.system.items).find((x) => x.uuid === i[1].uuid).level = i[1].level;
      } else if (!Object.values(klass.system.items).some((x) => x.uuid === i[1].uuid && x.level <= i[1].level)) {
        klass.system.items[i[0]] = i[1];
      }
    });

    // Key Ability
    dualClass.system.keyAbility.value.forEach((v) => {
      if (!klass.system.keyAbility.value.includes(v)) {
        klass.system.keyAbility.value.push(v);
      }
    });

    // Perception
    if (dualClass.system.perception > klass.system.perception) klass.system.perception = dualClass.system.perception;

    // Rules
    klass.system.rules.push(ruleEntry);
    dualClass.system.rules.forEach((r) => {
      if (!klass.system.rules.includes(r)) {
        klass.system.rules.push(r);
      }
    });
    klass.system.rules.forEach((r, i) => {
      if (r.path !== undefined) {
        const check = r.path.split(".");
        if (
          check.includes("data")
          && check.includes("martial")
          && check.includes("rank")
          && klass.system.attacks.martial >= r.value
        ) {
          klass.system.rules.splice(i, 1);
        }
      }
    });

    // Saving Throws
    ["fortitude", "reflex", "will"].forEach((key) => {
      if (dualClass.system.savingThrows[key] > klass.system.savingThrows[key]) {
        klass.system.savingThrows[key] = dualClass.system.savingThrows[key];
      }
    });

    // Skill Feat Levels
    dualClass.system.skillFeatLevels.value.forEach((v) => {
      klass.system.skillFeatLevels.value.push(v);
    });
    klass.system.skillFeatLevels.value = [...new Set(klass.system.skillFeatLevels.value)].sort((a, b) => {
      return a - b;
    });

    // Skill Increase Levels
    dualClass.system.skillIncreaseLevels.value.forEach((v) => {
      klass.system.skillIncreaseLevels.value.push(v);
    });
    klass.system.skillIncreaseLevels.value = [...new Set(klass.system.skillIncreaseLevels.value)].sort((a, b) => {
      return a - b;
    });

    // Trained Skills
    if (dualClass.system.trainedSkills.additional > klass.system.trainedSkills.additional) {
      klass.system.trainedSkills.additional = dualClass.system.trainedSkills.additional;
    }
    dualClass.system.trainedSkills.value.forEach((v) => {
      if (!klass.system.trainedSkills.value.includes(v)) {
        klass.system.trainedSkills.value.push(v);
      }
    });

    this.result.dualClass = dualClass;
  }

  // eslint-disable-next-line class-methods-use-this
  async #processGenericCompendiumLookup(type, name, target) {
    logger.debug(`Checking for compendium documents for ${name} (${target}) in compendiums for ${type}`);
    const foundryName = this.getFoundryFeatureName(name).foundryName;
    const indexMatch = this.compendiumMatchers[type].getNameMatch(name, foundryName);

    if (indexMatch) {
      const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
      const itemData = doc.toObject();
      if (name.includes("(")) {
        const extra = name.split(")")[0].split("(").pop();
        this.parsed.specials.push({ name: doc.name, originalName: name, added: true, extra });
      }
      if (target === "class") {
        itemData.system.keyAbility.selected = this.keyAbility;
        await this.#addDualClass(itemData);
      }
      itemData._id = foundry.utils.randomID();
      // this.#generateGrantItemData(itemData);
      this.result[target].push(itemData);
      await this.#addGrantedItems(itemData);
      return true;
    } else {
      this.bad.push({ pbName: name, type: target, details: { name } });
      return false;
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

  #parsedFeatureMatch(type, document, slug, ignoreAdded, isChoiceMatch = false) {
    // console.warn(`Trying to find ${slug} in ${type}, ignoreAdded? ${ignoreAdded}`, this.parsed[type]);
    const parsedMatch = this.parsed[type].find((f) =>
      (!ignoreAdded || (ignoreAdded && !f.added))
        && !f.isChoice
        && (slug === Seasoning.slug(f.name)
          || slug === Seasoning.slug(Seasoning.getClassAdjustedSpecialNameLowerCase(f.name, this.source.class))
          || slug === Seasoning.slug(Seasoning.getAncestryAdjustedSpecialNameLowerCase(f.name, this.source.ancestry))
          || slug === Seasoning.slug(Seasoning.getHeritageAdjustedSpecialNameLowerCase(f.name, this.source.heritage))
          || slug === Seasoning.slug(f.originalName)
          || slug === Seasoning.slug(Seasoning.getClassAdjustedSpecialNameLowerCase(f.originalName, this.source.class))
          || slug
            === Seasoning.slug(Seasoning.getAncestryAdjustedSpecialNameLowerCase(f.originalName, this.source.ancestry))
          || slug
            === Seasoning.slug(Seasoning.getHeritageAdjustedSpecialNameLowerCase(f.originalName, this.source.heritage))
          || (game.settings.get("pf2e", "dualClassVariant")
            && (slug
              === Seasoning.slug(Seasoning.getDualClassAdjustedSpecialNameLowerCase(f.name, this.source.dualClass))
              || slug
                === Seasoning.slug(
                  Seasoning.getDualClassAdjustedSpecialNameLowerCase(f.originalName, this.source.dualClass)
                ))))
    );
    if (parsedMatch || !document) return parsedMatch;

    const extraMatch = this.parsed[type].find((f) =>
      // (!ignoreAdded || (ignoreAdded && !f.added))
      f.extra
      && f.added
      && !f.isChoice
      && Seasoning.slug(f.name) === (document.system.slug ?? Seasoning.slug(document.name))
      && Seasoning.slug(f.extra) === slug
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

  #findAllFeatureMatch(document, slug, ignoreAdded, isChoiceMatch = false) {
    const featMatch = this.#parsedFeatureMatch("feats", document, slug, ignoreAdded);
    if (featMatch) return featMatch;
    const specialMatch = this.#parsedFeatureMatch("specials", document, slug, ignoreAdded, isChoiceMatch);
    if (specialMatch) return specialMatch;
    const deityMatch = this.#generatedResultMatch("deity", slug);
    return deityMatch;
    // const classMatch = this.#generatedResultMatch("class", slug);
    // return classMatch;
    // const equipmentMatch = this.#generatedResultMatch("equipment", slug);
    // return equipmentMatch;
  }

  #createGrantedItem(document, parent) {
    logger.debug(`Adding granted item flags to ${document.name} (parent ${parent.name})`);
    const camelCase = Seasoning.slugD(document.system.slug ?? document.name);
    setProperty(parent, `flags.pf2e.itemGrants.${camelCase}`, { id: document._id, onDelete: "detach" });
    setProperty(document, "flags.pf2e.grantedBy", { id: parent._id, onDelete: "cascade" });
    this.autoFeats.push(document);
    if (!this.options.askForChoices) {
      this.result.feats.push(document);
    }
    const featureMatch
      = this.#findAllFeatureMatch(document, document.system.slug ?? Seasoning.slug(document.name), true)
      ?? (document.name.includes("(")
        ? this.#findAllFeatureMatch(document, Seasoning.slug(document.name.split("(")[0].trim()), true)
        : undefined);

    if (featureMatch) {
      if (hasProperty(featureMatch, "added")) {
        featureMatch.added = true;
        featureMatch.addedId = document._id;
        this.#generateFoundryFeatLocation(document, featureMatch);
      }

      return;
    }
    if (document.type !== "action")
      logger.warn(
        `Unable to find parsed feature match for granted feature ${document.name}. This might not be an issue, but might indicate feature duplication.`,
        { document, parent }
      );
  }

  async #featureChoiceMatch(document, choices, ignoreAdded, adjustName) {
    for (const choice of choices) {
      const doc = adjustName ? game.i18n.localize(choice.label) : await fromUuid(choice.value);
      if (!doc) continue;
      const slug = adjustName
        ? Seasoning.slug(doc)
        : doc.system.slug === null
          ? Seasoning.slug(doc.name)
          : doc.system.slug;
      const featMatch = this.#findAllFeatureMatch(document, slug, ignoreAdded);
      if (featMatch) {
        if (adjustName && hasProperty(featMatch, "added")) {
          featMatch.added = true;
          featMatch.addedId = document._id;
        }
        logger.debug("Choices evaluated", { choices, document, featMatch, choice });
        return choice;
      }
    }
    return undefined;
  }

  static getFlag(document, ruleSet) {
    return typeof ruleSet.flag === "string" && ruleSet.flag.length > 0
      ? ruleSet.flag.replace(/[^-a-z0-9]/gi, "")
      : Seasoning.slugD(document.system.slug ?? document.system.name);
  }

  async #evaluateChoices(document, choiceSet) {
    logger.debug(`Evaluating choices for ${document.name}`, { document, choiceSet });
    const tempActor = await this.#generateTempActor([document], false, false);
    const cleansedChoiceSet = deepClone(choiceSet);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const choiceSetRules = isNewerVersion(game.version, 11)
        ? new game.pf2e.RuleElements.all.ChoiceSet(cleansedChoiceSet, { parent: item })
        : new game.pf2e.RuleElements.all.ChoiceSet(cleansedChoiceSet, item);
      const rollOptions = [tempActor.getRollOptions(), item.getRollOptions("item")].flat();
      const choices = isNewerVersion(game.version, 11)
        ? await choiceSetRules.inflateChoices(rollOptions)
        : (await choiceSetRules.inflateChoices()).filter((c) => c.predicate?.test(rollOptions) ?? true);

      logger.debug("Starting choice evaluation", {
        document,
        choiceSet,
        item,
        choiceSetRules,
        rollOptions,
        choices,
      });

      if (cleansedChoiceSet.choices?.query) {
        const nonFilteredChoices = isNewerVersion(game.version, 11)
          ? await choiceSetRules.inflateChoices(rollOptions)
          : await choiceSetRules.inflateChoices();
        const queryResults = await choiceSetRules.queryCompendium(cleansedChoiceSet.choices);
        logger.debug("Query Result", { queryResults, nonFilteredChoices });
      }

      logger.debug("Evaluating choiceset", cleansedChoiceSet);
      const choiceMatch = await this.#featureChoiceMatch(document, choices, true, cleansedChoiceSet.adjustName);
      logger.debug("choiceMatch result", choiceMatch);
      if (choiceMatch) {
        choiceMatch.choiceQueryResults = deepClone(choices);
        return choiceMatch;
      }

      if (typeof cleansedChoiceSet.choices === "string" || Array.isArray(choices)) {
        for (const choice of choices) {
          // console.warn(`Checking ${document.name} for choice ${choice.value}`, {
          //   choice,
          //   parsed: duplicate(this.parsed),
          // });
          const featMatch = this.#findAllFeatureMatch(document, choice.value, true, true);
          if (featMatch) {
            logger.debug("Choices evaluated", { cleansedChoiceSet, choices, document, featMatch, choice });
            featMatch.added = true;
            featMatch.addedId = document._id;
            choice.nouuid = true;
            return choice;
          }
        }
      }

      let tempSet = deepClone(choiceSet);
      logger.debug(`Starting dynamic selection for ${document.name}`, { document, choiceSet, tempSet, Pathmuncher: this });
      await choiceSetRules.preCreate({ itemSource: item, ruleSource: tempSet });
      // console.warn("chociesetdata", {
      //   choiceSetRules,
      //   selection: choiceSetRules.selection,
      //   choiceSet: deepClone(choiceSet),
      //   tempSet: deepClone(tempSet),
      // });
      if (tempSet.selection) {
        const lookedUpChoice = choices.find((c) => c.value === tempSet.selection);
        logger.debug("lookedUpChoice", lookedUpChoice);
        if (lookedUpChoice) lookedUpChoice.choiceQueryResults = deepClone(choices);
        // set some common lookups here, e.g. deities are often not set!
        if (lookedUpChoice && cleansedChoiceSet.flag === "deity") {
          if (lookedUpChoice.label && lookedUpChoice.label !== "") {
            setProperty(this.result.character, "system.details.deity.value", lookedUpChoice.label);
            await this.#processGenericCompendiumLookup("deities", lookedUpChoice.label, "deity");
            const camelCase = Seasoning.slugD(this.result.deity[0].system.slug);
            setProperty(document, `flags.pf2e.itemGrants.${camelCase}`, {
              id: this.result.deity[0]._id,
              onDelete: "detach",
            });
            setProperty(this.result.deity[0], "flags.pf2e.grantedBy", { id: document._id, onDelete: "cascade" });
            this.autoAddedFeatureIds.add(`${lookedUpChoice.value.split(".").pop()}deity`);
          }
        }
        return lookedUpChoice;
      }
    } catch (err) {
      logger.error("Whoa! Something went major bad wrong during choice evaluation", {
        err,
        tempActor: tempActor.toObject(),
        document: duplicate(document),
        choiceSet: duplicate(cleansedChoiceSet),
      });
      throw err;
    } finally {
      await Actor.deleteDocuments([tempActor._id]);
    }

    logger.debug("Evaluate Choices failed", { choiceSet: cleansedChoiceSet, tempActor, document });
    return undefined;
  }

  async #resolveInjectedUuid(document, ruleEntry) {
    const tempActor = await this.#generateTempActor([document], false, false);
    const cleansedRuleEntry = deepClone(ruleEntry);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      // console.warn("creating grant item");
      const grantItemRule = isNewerVersion(game.version, 11)
        ? new game.pf2e.RuleElements.all.GrantItem(cleansedRuleEntry, { parent: item })
        : new game.pf2e.RuleElements.all.GrantItem(cleansedRuleEntry, item);
      // console.warn("Begining uuid resovle");
      const uuid = grantItemRule.resolveInjectedProperties(grantItemRule.uuid, { warn: false });

      logger.debug("uuid selection", {
        document,
        choiceSet: ruleEntry,
        item,
        grantItemRule,
        uuid,
      });
      if (uuid) return uuid;
    } catch (err) {
      logger.error("Whoa! Something went major bad wrong during uuid evaluation", {
        err,
        tempActor: tempActor.toObject(),
        document: duplicate(document),
        ruleEntry: duplicate(cleansedRuleEntry),
      });
      throw err;
    } finally {
      await Actor.deleteDocuments([tempActor._id]);
    }

    logger.debug("Evaluate UUID failed", { choiceSet: cleansedRuleEntry, tempActor, document });
    return undefined;
  }

  async #checkRule(document, rule) {
    const tempActor = await this.#generateTempActor([document], true);
    const cleansedRule = deepClone(rule);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const ruleElement = cleansedRule.key === "ChoiceSet"
        ? isNewerVersion(game.version, 11)
          ? new game.pf2e.RuleElements.all.ChoiceSet(cleansedRule, item)
          : new game.pf2e.RuleElements.all.ChoiceSet(cleansedRule, { parent: item })
        : isNewerVersion(game.version, 11)
          ? new game.pf2e.RuleElements.all.GrantItem(cleansedRule, { parent: item })
          : new game.pf2e.RuleElements.all.GrantItem(cleansedRule, item);
      const rollOptions = [tempActor.getRollOptions(), item.getRollOptions("item")].flat();
      const choices = cleansedRule.key === "ChoiceSet"
        ? isNewerVersion(game.version, 11)
          ? await ruleElement.inflateChoices(rollOptions)
          : (await ruleElement.inflateChoices()).filter((c) => !c.predicate || c.predicate.test(rollOptions))
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

  // eslint-disable-next-line complexity
  async #addGrantedRules(document) {
    if (document.system.rules.length === 0) return;
    logger.debug(`addGrantedRules for ${document.name}`, duplicate(document));

    if (
      hasProperty(document, "system.level.value")
      && document.system.level.value > this.result.character.system.details.level.value
    ) {
      return;
    }

    const rulesToKeep = [];
    this.allFeatureRules[document._id] = deepClone(document.system.rules);
    this.autoAddedFeatureRules[document._id] = [];
    this.promptRules[document._id] = [];

    for (const ruleEntry of document.system.rules) {
      logger.debug(`Ping ${document.name} rule key: ${ruleEntry.key}`, ruleEntry);
      if (!["ChoiceSet", "GrantItem"].includes(ruleEntry.key)) {
        // size work around due to Pathbuilder not always adding the right size to json
        if (ruleEntry.key === "CreatureSize") this.size = ruleEntry.value;
        this.autoAddedFeatureRules[document._id].push(ruleEntry);
        rulesToKeep.push(ruleEntry);
        continue;
      }
      logger.debug(`Checking ${document.name} rule key: ${ruleEntry.key}`, {
        ruleEntry,
        docRules: deepClone(document.system.rules),
        document: deepClone(document),
      });

      // if (ruleEntry.key === "GrantItem") {
      //   const checkDoc = deepClone(document);
      //   checkDoc.system.rules = [];
      //   const testResult = await this.#checkRule(checkDoc, ruleEntry);
      //   if (!testResult) {
      //     const data = { document, ruleEntry, testResult };
      //     logger.debug(`The early test failed for ${document.name} rule key: ${ruleEntry.key} (This is probably not a problem).`, data);
      //     rulesToKeep.push(ruleEntry);
      //     continue;
      //   }
      // }

      const choice = ruleEntry.key === "ChoiceSet" ? await this.#evaluateChoices(document, ruleEntry) : undefined;
      const uuid = ruleEntry.key === "GrantItem" ? await this.#resolveInjectedUuid(document, ruleEntry) : choice?.value;

      if (choice?.choiceQueryResults) {
        ruleEntry.choiceQueryResults = choice.choiceQueryResults;
      }

      const flagName = Pathmuncher.getFlag(document, ruleEntry);
      if (flagName && choice?.value) {
        setProperty(document, `flags.pf2e.rulesSelections.${flagName}`, choice.value);
      }

      logger.debug(`UUID for ${document.name}: "${uuid}"`, { document, ruleEntry, choice, uuid });
      const ruleFeature = uuid && typeof uuid === "string" ? await fromUuid(uuid) : undefined;
      // console.warn("ruleFeature", ruleFeature);
      if (ruleFeature) {
        const featureDoc = ruleFeature.toObject();
        featureDoc._id = foundry.utils.randomID();
        if (featureDoc.system.rules) this.allFeatureRules[featureDoc._id] = deepClone(featureDoc.system.rules);
        setProperty(featureDoc, "flags.pathmuncher.origin.uuid", uuid);
        logger.debug(`Found rule feature ${featureDoc.name} for ${document.name} for`, ruleEntry);

        if (choice) {
          ruleEntry.selection = choice.value;
        }
        // if (!ruleEntry.flag) {
        //   ruleEntry.flag = Seasoning.slugD(featureDoc.name);
        // }

        if (ruleEntry.predicate) {
          logger.debug(`Checking for predicates`, {
            ruleEntry,
            document,
            featureDoc,
          });
          const testResult = await this.#checkRule(featureDoc, ruleEntry);
          if (!testResult) {
            const data = { document, ruleEntry, featureDoc, testResult };
            logger.debug(
              `The test failed for ${document.name} rule key: ${ruleEntry.key} (This is probably not a problem).`,
              data
            );
            rulesToKeep.push(ruleEntry);
            // this.autoAddedFeatureRules[document._id].push(ruleEntry);
            continue;
          }
        }

        // setProperty(ruleEntry, `preselectChoices.${ruleEntry.flag}`, ruleEntry.selection ?? ruleEntry.uuid);

        if (this.autoAddedFeatureIds.has(`${ruleFeature.id}${ruleFeature.type}`)) {
          logger.debug(
            `Feature ${featureDoc.name} found for ${document.name}, but has already been added (${ruleFeature.id})`,
            ruleFeature
          );
          // this.autoAddedFeatureRules[document._id].push(ruleEntry);
          // rulesToKeep.push(ruleEntry);
          continue;
        } else {
          if (ruleEntry.selection || ruleEntry.flag) {
            rulesToKeep.push(ruleEntry);
          }
          this.autoAddedFeatureIds.add(`${ruleFeature.id}${ruleFeature.type}`);
          featureDoc._id = foundry.utils.randomID();
          this.#createGrantedItem(featureDoc, document);
          if (hasProperty(ruleFeature, "system.rules")) await this.#addGrantedRules(featureDoc);
        }
      } else if (choice?.nouuid) {
        logger.debug("Parsed no id rule", { choice, uuid, ruleEntry });
        // if (!ruleEntry.flag) ruleEntry.flag = Seasoning.slugD(document.name);
        ruleEntry.selection = choice.value;
        if (choice.label) document.name = `${document.name} (${choice.label})`;
        rulesToKeep.push(ruleEntry);
      } else if (choice && uuid && !hasProperty(ruleEntry, "selection")) {
        logger.debug("Parsed odd choice rule", { choice, uuid, ruleEntry });
        // if (!ruleEntry.flag) ruleEntry.flag = Seasoning.slugD(document.name);
        ruleEntry.selection = choice.value;
        if (
          (!ruleEntry.adjustName && choice.label && typeof uuid === "object")
          || (!choice.adjustName && choice.label)
        ) {
          document.name = Pathmuncher.adjustDocumentName(document.name, choice.label);
        }
        rulesToKeep.push(ruleEntry);
      } else {
        const data = {
          uuid: ruleEntry.uuid,
          document,
          ruleEntry,
          choice,
        };
        if (
          ruleEntry.key === "GrantItem"
          && (ruleEntry.flag || ruleEntry.selection || ruleEntry.uuid.startsWith("Compendium"))
        ) {
          rulesToKeep.push(ruleEntry);
        } else if (ruleEntry.key === "ChoiceSet" && !hasProperty(ruleEntry, "flag")) {
          logger.debug("Prompting user for choices", ruleEntry);
          this.promptRules[document._id].push(ruleEntry);
          rulesToKeep.push(ruleEntry);
        } else if (ruleEntry.key === "ChoiceSet" && !choice && !uuid) {
          logger.warn("Unable to determine choice asking", data);
          rulesToKeep.push(ruleEntry);
          this.promptRules[document._id].push(ruleEntry);
        }
        logger.warn("Unable to determine granted rule feature, needs better parser", data);
      }
      if (ruleEntry.adjustName && choice?.label) {
        document.name = Pathmuncher.adjustDocumentName(document.name, choice.label);
      }
      this.autoAddedFeatureRules[document._id].push(ruleEntry);

      logger.debug(`End result for ${document.name} for a ${ruleEntry.key}`, {
        document: deepClone(document),
        rulesToKeep: deepClone(rulesToKeep),
        ruleEntry: deepClone(ruleEntry),
        choice: deepClone(choice),
        uuid: deepClone(uuid),
      });
    }
    if (!this.options.askForChoices) {
      // eslint-disable-next-line require-atomic-updates
      document.system.rules = rulesToKeep;
    }

    logger.debug(`Final status for ${document.name}`, {
      document: deepClone(document),
      rulesToKeep: deepClone(rulesToKeep),
    });
  }

  async #addGrantedItems(document) {
    const subRuleDocuments = [];
    if (hasProperty(document, "system.items")) {
      logger.debug(`addGrantedItems for ${document.name}`, duplicate(document));
      if (!this.autoAddedFeatureItems[document._id]) {
        this.autoAddedFeatureItems[document._id] = duplicate(document.system.items);
      }
      const failedFeatureItems = {};
      for (const [key, grantedItemFeature] of Object.entries(document.system.items)) {
        logger.debug(`Checking granted item ${document.name}, with key: ${key}`, grantedItemFeature);
        if (grantedItemFeature.level > getProperty(this.result.character, "system.details.level.value")) continue;
        const feature = await fromUuid(grantedItemFeature.uuid);
        if (!feature) {
          const data = { uuid: grantedItemFeature.uuid, grantedFeature: grantedItemFeature, feature };
          logger.warn("Unable to determine granted item feature, needs better parser", data);
          failedFeatureItems[key] = grantedItemFeature;
          continue;
        }
        this.autoAddedFeatureIds.add(`${feature.id}${feature.type}`);
        const featureDoc = feature.toObject();
        featureDoc._id = foundry.utils.randomID();
        setProperty(featureDoc.system, "location", document._id);
        this.#createGrantedItem(featureDoc, document);
        if (hasProperty(featureDoc, "system.rules")) {
          logger.debug(`Processing granted rules for granted item document ${featureDoc.name}`, duplicate(featureDoc));
          // await this.#addGrantedRules(featureDoc);
          subRuleDocuments.push(featureDoc);
        }
      }
      if (!this.options.askForChoices) {
        // eslint-disable-next-line require-atomic-updates
        document.system.items = failedFeatureItems;
      }

      for (const subRuleDocument of subRuleDocuments) {
        logger.debug(
          `Processing granted rules for granted item document ${subRuleDocument.name}`,
          duplicate(subRuleDocument)
        );
        await this.#addGrantedItems(subRuleDocument);
      }
    }

    if (hasProperty(document, "system.rules")) {
      logger.debug(`Processing granted rules for core document ${document.name}`, duplicate(document));
      await this.#addGrantedRules(document);
    }
  }

  #determineAbilityBoosts() {
    const breakdown = getProperty(this.source, "abilities.breakdown");
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
          classBoostMap[key] = boosts.map((ability) => ability.toLowerCase());
        }
      }
      setProperty(this.result.character, "system.build.abilities.boosts", classBoostMap);
      this.boosts.class = classBoostMap;

      // ancestry
    } else {
      this.boosts.custom = true;
      setProperty(this.result.character, "system.abilities.str.value", this.source.abilities.str);
      setProperty(this.result.character, "system.abilities.dex.value", this.source.abilities.dex);
      setProperty(this.result.character, "system.abilities.con.value", this.source.abilities.con);
      setProperty(this.result.character, "system.abilities.int.value", this.source.abilities.int);
      setProperty(this.result.character, "system.abilities.wis.value", this.source.abilities.wis);
      setProperty(this.result.character, "system.abilities.cha.value", this.source.abilities.cha);
    }

    if (breakdown?.classBoosts.length > 0) {
      this.keyAbility = breakdown.classBoosts[0].toLowerCase();
    } else {
      this.keyAbility = this.source.keyability;
    }
    setProperty(this.result.character, "system.details.keyability.value", this.keyAbility);
  }

  #generateBackgroundAbilityBoosts() {
    if (!this.result.background[0]) return;
    const breakdown = getProperty(this.source, "abilities.breakdown");
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
    const breakdown = getProperty(this.source, "abilities.breakdown");
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
      setProperty(this.result.ancestry[0], "system.alternateAncestryBoosts", boosts);
    }
  }

  #setAbilityBoosts() {
    if (this.boosts.custom) return;
    this.#generateBackgroundAbilityBoosts();
    this.#generateAncestryAbilityBoosts();

    this.result.class[0].system.boosts = this.boosts.class;
  }

  #setSkills() {
    setProperty(this.result.character, "system.skills.acr.rank", this.source.proficiencies.acrobatics / 2);
    setProperty(this.result.character, "system.skills.arc.rank", this.source.proficiencies.arcana / 2);
    setProperty(this.result.character, "system.skills.ath.rank", this.source.proficiencies.athletics / 2);
    setProperty(this.result.character, "system.skills.cra.rank", this.source.proficiencies.crafting / 2);
    setProperty(this.result.character, "system.skills.dec.rank", this.source.proficiencies.deception / 2);
    setProperty(this.result.character, "system.skills.dip.rank", this.source.proficiencies.diplomacy / 2);
    setProperty(this.result.character, "system.skills.itm.rank", this.source.proficiencies.intimidation / 2);
    setProperty(this.result.character, "system.skills.med.rank", this.source.proficiencies.medicine / 2);
    setProperty(this.result.character, "system.skills.nat.rank", this.source.proficiencies.nature / 2);
    setProperty(this.result.character, "system.skills.occ.rank", this.source.proficiencies.occultism / 2);
    setProperty(this.result.character, "system.skills.prf.rank", this.source.proficiencies.performance / 2);
    setProperty(this.result.character, "system.skills.rel.rank", this.source.proficiencies.religion / 2);
    setProperty(this.result.character, "system.skills.soc.rank", this.source.proficiencies.society / 2);
    setProperty(this.result.character, "system.skills.ste.rank", this.source.proficiencies.stealth / 2);
    setProperty(this.result.character, "system.skills.sur.rank", this.source.proficiencies.survival / 2);
    setProperty(this.result.character, "system.skills.thi.rank", this.source.proficiencies.thievery / 2);
  }

  #setSaves() {
    setProperty(this.result.character, "system.saves.fortitude.tank", this.source.proficiencies.fortitude / 2);
    setProperty(this.result.character, "system.saves.reflex.value", this.source.proficiencies.reflex / 2);
    setProperty(this.result.character, "system.saves.will.value", this.source.proficiencies.will / 2);
  }

  #setMartials() {
    setProperty(this.result.character, "system.martial.advanced.rank", this.source.proficiencies.advanced / 2);
    setProperty(this.result.character, "system.martial.heavy.rank", this.source.proficiencies.heavy / 2);
    setProperty(this.result.character, "system.martial.light.rank", this.source.proficiencies.light / 2);
    setProperty(this.result.character, "system.martial.medium.rank", this.source.proficiencies.medium / 2);
    setProperty(this.result.character, "system.martial.unarmored.rank", this.source.proficiencies.unarmored / 2);
    setProperty(this.result.character, "system.martial.martial.rank", this.source.proficiencies.martial / 2);
    setProperty(this.result.character, "system.martial.simple.rank", this.source.proficiencies.simple / 2);
    setProperty(this.result.character, "system.martial.unarmed.rank", this.source.proficiencies.unarmed / 2);

  }

  async #processCore() {
    setProperty(this.result.character, "name", this.source.name);
    setProperty(this.result.character, "prototypeToken.name", this.source.name);
    setProperty(this.result.character, "system.details.level.value", this.source.level);
    if (this.source.age !== "Not set") setProperty(this.result.character, "system.details.age.value", this.source.age);
    if (this.source.gender !== "Not set") setProperty(this.result.character, "system.details.gender.value", this.source.gender);
    setProperty(this.result.character, "system.details.alignment.value", this.source.alignment);

    if (this.source.deity !== "Not set") setProperty(this.result.character, "system.details.deity.value", this.source.deity);
    this.size = Seasoning.getSizeValue(this.source.size);
    setProperty(this.result.character, "system.traits.size.value", this.size);
    setProperty(this.result.character, "system.traits.languages.value", this.source.languages.map((l) => l.toLowerCase()));

    this.#processSenses();

    this.#determineAbilityBoosts();
    this.#setSaves();
    this.#setMartials();
    // this.#setSkills();

    setProperty(this.result.character, "system.attributes.perception.rank", this.source.proficiencies.perception / 2);
    setProperty(this.result.character, "system.attributes.classDC.rank", this.source.proficiencies.classDC / 2);
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
          || (game.settings.get("pf2e", "dualClassVariant")
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

  async #generateFeatItems(type) {
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
    for (const featArray of [this.parsed.feats, this.parsed.specials]) {
      for (const pBFeat of featArray) {
        if (pBFeat.added) continue;
        logger.debug("Generating feature for", pBFeat);

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
        docData.name = displayName;

        this.#generateFoundryFeatLocation(docData, pBFeat);
        this.result.feats.push(docData);
        await this.#addGrantedItems(docData);
      }
    }
  }

  async #generateSpecialItems(type) {
    for (const special of this.parsed.specials) {
      if (special.added) continue;
      logger.debug("Generating special for", special);
      const indexMatch = this.#findInPackIndexes(type, [special.name, special.originalName]);
      if (!indexMatch) {
        logger.debug(`Unable to match special ${special.name}`, { special: special.name, type });
        this.check[special.originalName] = {
          name: special.name,
          type: "special",
          details: { displayName: special.name, name: special.name, originalName: special.originalName, special },
        };
        continue;
      }
      special.added = true;
      if (this.check[special.originalName]) delete this.check[special.originalName];
      if (this.autoAddedFeatureIds.has(`${indexMatch._id}${indexMatch.type}`)) {
        logger.debug("Special included in class features auto add", { special: special.name, type });
        special.addedAutoId = `${indexMatch._id}_${indexMatch.type}`;
        continue;
      }

      const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
      const docData = doc.toObject();
      docData._id = foundry.utils.randomID();
      special.addedId = docData._id;
      this.result.feats.push(docData);
      await this.#addGrantedItems(docData);
    }
  }

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
      const indexMatch = this.compendiumMatchers["equipment"].getNameMatch(data.containerName, name);
      const id = foundry.utils.randomID();
      const doc = indexMatch
        ? await indexMatch.pack.getDocument(indexMatch.i._id)
        : await Item.create({ name: data.containerName, type: "backpack" }, { temporary: true });
      const itemData = doc.toObject();
      itemData._id = id;
      this.#resizeItem(itemData);
      this.result["equipment"].push(itemData);
      this.parsed.equipment.push({
        pbName: data.containerName,
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
      const indexMatch = this.compendiumMatchers["equipment"].getNameMatch(e.pbName, e.pbName);
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

  static applyRunes(parsedItem, itemData, type) {
    itemData.system.potencyRune.value = parsedItem.pot;
    if (type === "weapon") {
      itemData.system.strikingRune.value = parsedItem.str;
    } else if (type === "armor") {
      itemData.system.resiliencyRune.value = parsedItem.res;
    }

    if (type === "armor" && parsedItem.worn
      && ((Number.isInteger(parsedItem.pot) && parsedItem.pot > 0)
        || (parsedItem.res && parsedItem.res !== "")
      )
    ) {
      itemData.system.equipped.invested = true;
    }

    if (parsedItem.runes[0]) itemData.system.propertyRune1.value = Seasoning.slugD(parsedItem.runes[0]);
    if (parsedItem.runes[1]) itemData.system.propertyRune2.value = Seasoning.slugD(parsedItem.runes[1]);
    if (parsedItem.runes[2]) itemData.system.propertyRune3.value = Seasoning.slugD(parsedItem.runes[2]);
    if (parsedItem.runes[3]) itemData.system.propertyRune4.value = Seasoning.slugD(parsedItem.runes[3]);
    if (parsedItem.mat) {
      const material = parsedItem.mat.split(" (")[0];
      itemData.system.preciousMaterial.value = Seasoning.slugD(material);
      itemData.system.preciousMaterialGrade.value = Seasoning.getMaterialGrade(parsedItem.mat);
    }
  }

  async #generateWeaponItems() {
    for (const w of this.parsed.weapons) {
      if (Seasoning.IGNORED_EQUIPMENT().includes(w.pbName)) {
        w.added = true;
        w.addedAutoId = "ignored";
        continue;
      }
      logger.debug("Generating weapon for", w);
      const indexMatch = this.compendiumMatchers["equipment"].getNameMatch(w.pbName, w.pbName);
      if (!indexMatch) {
        logger.error(`Unable to match weapon item ${w.name}`, w);
        this.bad.push({ pbName: w.pbName, type: "weapon", details: { w } });
        continue;
      }

      const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
      const itemData = doc.toObject();
      itemData._id = foundry.utils.randomID();
      itemData.system.quantity = w.qty;
      itemData.system.damage.die = w.die;

      Pathmuncher.applyRunes(w, itemData, "weapon");

      if (w.display) itemData.name = w.display;

      this.#resizeItem(itemData);
      this.result.weapons.push(itemData);
      w.added = true;
      w.addedId = itemData._id;
    }
  }

  async #generateArmorItems() {
    for (const a of this.parsed.armor) {
      if (Seasoning.IGNORED_EQUIPMENT().includes(a.pbName)) {
        a.added = true;
        a.addedAutoId = "ignored";
        continue;
      }
      logger.debug("Generating armor for", a);
      const indexMatch = this.compendiumMatchers["equipment"].getNameMatch(`${a.pbName} Armor`, a.pbName);
      if (!indexMatch) {
        logger.error(`Unable to match armor kit item ${a.name}`, a);
        this.bad.push({ pbName: a.pbName, type: "armor", details: { a } });
        continue;
      }

      const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
      const itemData = doc.toObject();
      itemData._id = foundry.utils.randomID();
      itemData.system.equipped.value = a.worn ?? false;
      if (!Seasoning.RESTRICTED_EQUIPMENT().some((i) => itemData.name.startsWith(i))) {
        itemData.system.equipped.inSlot = a.worn ?? false;
        itemData.system.quantity = a.qty;
        itemData.system.category = a.prof;

        const isShield = itemData.system.category === "shield";
        itemData.system.equipped.handsHeld = isShield && a.worn ? 1 : 0;
        itemData.system.equipped.carryType = isShield && a.worn ? "held" : "worn";

        Pathmuncher.applyRunes(a, itemData, "armor");
      }
      if (a.display) itemData.name = a.display;

      this.#resizeItem(itemData);
      this.result.armor.push(itemData);
      // eslint-disable-next-line require-atomic-updates
      a.added = true;
      a.addedId = itemData._id;
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
      && c.ability === caster.ability
    );
    if (abilityTradition) return abilityTradition.magicTradition;
    // if no type and multiple spell casters, then return the first spell casting type
    return this.source.spellCasters[0].magicTradition && this.source.spellCasters[0].magicTradition !== "focus"
      ? this.source.spellCasters[0].magicTradition
      : "divine";
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
      slots: {
        slot0: {
          max: caster.perDay[0],
          prepared: {},
          value: caster.perDay[0],
        },
        slot1: {
          max: caster.perDay[1],
          prepared: {},
          value: caster.perDay[1],
        },
        slot2: {
          max: caster.perDay[2],
          prepared: {},
          value: caster.perDay[2],
        },
        slot3: {
          max: caster.perDay[3],
          prepared: {},
          value: caster.perDay[3],
        },
        slot4: {
          max: caster.perDay[4],
          prepared: {},
          value: caster.perDay[4],
        },
        slot5: {
          max: caster.perDay[5],
          prepared: {},
          value: caster.perDay[5],
        },
        slot6: {
          max: caster.perDay[6],
          prepared: {},
          value: caster.perDay[6],
        },
        slot7: {
          max: caster.perDay[7],
          prepared: {},
          value: caster.perDay[7],
        },
        slot8: {
          max: caster.perDay[8],
          prepared: {},
          value: caster.perDay[8],
        },
        slot9: {
          max: caster.perDay[9],
          prepared: {},
          value: caster.perDay[9],
        },
        slot10: {
          max: caster.perDay[10],
          prepared: {},
          value: caster.perDay[10],
        },
      },
      showUnpreparedSpells: { value: true },
      showSlotlessLevels: { value: true },
    };
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
    const spellName = spell.split("(")[0].trim();
    logger.debug("focus spell details", { spell, spellName, debugData });

    const indexMatch = this.compendiumMatchers["spells"].getNameMatch(spellName, spellName);
    if (!indexMatch) {
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
        const parsedSpell = getProperty(spellNames, spell);
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
          if (itemData && !hasProperty(spellNames, itemData.name)) {
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
      this.result.spells.push(itemData);
    }
  }

  async #processRituals() {
    if (!this.source.rituals) return;
    const ritualCompendium = new CompendiumMatcher({
      type: "spells",
      indexFields: ["name", "type", "system.slug", "system.category.value"],
    });
    await ritualCompendium.loadCompendiums();

    const ritualFilters = {
      "system.category.value": "ritual",
    };
    for (const ritual of this.source.rituals) {
      const ritualName = ritual.split("(")[0].trim();
      logger.debug("focus spell details", { ritual, spellName: ritualName });

      const indexMatch = this.compendiumMatchers["spells"].getNameMatchWithFilter(ritualName, ritualName, ritualFilters);
      if (!indexMatch) {
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
      if (hasProperty(spellEnhancements, "showSlotless")) {
        instance.system.showSlotlessLevels.value = getProperty(spellEnhancements, "showSlotless");
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

    for (const tradition of ["occult", "primal", "divine", "arcane"]) {
      const traditionData = getProperty(this.source, `focus.${tradition}`);
      logger.debug(`Checking for focus tradition ${tradition}`);
      if (!traditionData) continue;
      for (const ability of ["str", "dex", "con", "int", "wis", "cha"]) {
        const abilityData = getProperty(traditionData, ability);
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

    setProperty(this.result.character, "system.resources.focus.max", this.source.focusPoints);
    setProperty(this.result.character, "system.resources.focus.value", this.source.focusPoints);
  }

  async #generateLores() {
    for (const lore of this.source.lores) {
      const data = {
        name: lore[0],
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
        const indexMatch = this.compendiumMatchers["formulas"].getNameMatch(formulaName, formulaName);
        if (!indexMatch) {
          logger.error(`Unable to match formula ${formulaName}`, { formulaSource, name: formulaName });
          this.bad.push({ pbName: formulaName, type: "formula", details: { formulaSource, name: formulaName } });
          continue;
        }
        const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
        uuids.push({ uuid: doc.uuid });
      }
    }
    setProperty(this.result.character, "system.crafting.formulas", uuids);
  }

  async #processFeats() {
    this.#statusUpdate(1, 5, "Feats");
    await this.#generateFeatItems("feats");
    this.#statusUpdate(2, 5, "Feats");
    await this.#generateFeatItems("ancestryFeatures");
    this.#statusUpdate(3, 5, "Feats");
    await this.#generateSpecialItems("ancestryFeatures");
    this.#statusUpdate(4, 5, "Feats");
    await this.#generateSpecialItems("classFeatures");
    this.#statusUpdate(5, 5, "Feats");
    await this.#generateSpecialItems("actions");
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

  async #generateTempActor(documents = [], includePassedDocumentsRules = false, includeGrants = false) {
    const actorData = mergeObject({ type: "character" }, this.result.character);
    actorData.name = `Mr Temp (${this.result.character.name})`;
    const actor = await Actor.create(actorData);
    const currentState = duplicate(this.result);

    // console.warn("Initial temp actor", deepClone(actor));

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
    ];
    for (const doc of documents) {
      if (!currentItems.some((d) => d._id === doc._id)) {
        currentItems.push(deepClone(doc));
      }
    }
    try {
      // if the rule selected is an object, id doesn't take on import
      const ruleUpdates = [];
      for (const i of deepClone(currentItems)) {
        if (!i.system.rules || i.system.rules.length === 0) continue;
        const isPassedDocument = documents.some((d) => d._id === i._id);
        if (isPassedDocument && !includePassedDocumentsRules) continue;

        const objectSelectionRules = i.system.rules
          // .filter((r) => {
          //   const evaluateRules = (isPassedDocument && includePassedDocumentsRules) || !isPassedDocument;
          //   return evaluateRules; // && ["RollOption", "GrantItem", "ChoiceSet", "ActiveEffectLike"].includes(r.key);
          //   // || (["ChoiceSet"].includes(r.key) && r.selection);
          // })
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

      // console.warn("Rule updates", duplicate(ruleUpdates));

      const items = duplicate(currentItems).map((i) => {
        if (i.system.items) i.system.items = [];
        if (i.system.rules) {
          i.system.rules = i.system.rules
            .filter((r) => {
              const isPassedDocument = documents.some((d) => d._id === i._id);
              const isChoiceSetSelection = ["ChoiceSet"].includes(r.key) && r.selection;
              // const choiceSetSelectionObject = isChoiceSetSelection && utils.isObject(r.selection);
              const choiceSetSelectionNotObject = isChoiceSetSelection && !utils.isObject(r.selection);
              // const grantRuleWithFlag = includeGrants && ["GrantItem"].includes(r.key) && r.flag;
              const grantRuleWithoutFlag = includeGrants && ["GrantItem"].includes(r.key) && !r.flag;
              // const genericDiscardRule = ["ChoiceSet", "GrantItem", "ActiveEffectLike", "Resistance", "Strike", "AdjustModifier"].includes(r.key);
              const genericDiscardRule = ["ChoiceSet", "GrantItem"].includes(r.key);
              const grantRuleFromItemFlag
                = includeGrants && ["GrantItem"].includes(r.key) && r.uuid.startsWith("{item|flags");
              const rollOptionsRule = ["RollOption"].includes(r.key);

              const notPassedDocumentRules
                = !isPassedDocument
                && (choiceSetSelectionNotObject
                  // || grantRuleWithFlag
                  || grantRuleWithoutFlag
                  || !genericDiscardRule);

              const passedDocumentRules
                = isPassedDocument
                && includePassedDocumentsRules
                && (isChoiceSetSelection || grantRuleWithoutFlag || grantRuleFromItemFlag || rollOptionsRule);

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
        }
        return i;
      });

      // const items2 = duplicate(currentItems).map((i) => {
      //   if (i.system.items) i.system.items = [];
      //   if (i.system.rules) i.system.rules = i.system.rules.filter((r) =>
      //     (!documents.some((d) => d._id === i._id)
      //     && ((["ChoiceSet",].includes(r.key) && r.selection)
      //     //  || (["GrantItem"].includes(r.key) && r.flag)
      //       || !["ChoiceSet", "GrantItem"].includes(r.key)
      //     ))
      //     || (includePassedDocumentsRules && documents.some((d) => d._id === i._id) && ["ChoiceSet",].includes(r.key) && r.selection)
      //   ).map((r) => {
      //     if ((typeof r.choices === 'string' || r.choices instanceof String)
      //       || (typeof r.choices === 'object' && !Array.isArray(r.choices) && r.choices !== null && r.choiceQueryResults)
      //     ) {
      //       r.choices = r.choiceQueryResults;
      //     }
      //     r.ignored = false;
      //     return r;
      //   });
      //   return i;
      // });

      // console.warn("temp items", {
      //   documents: deepClone(currentItems),
      //   items: deepClone(items),
      //   // items2: deepClone(items2),
      //   // diff: diffObject(items, items2),
      //   includePassedDocumentsRules,
      //   includeGrants,
      // });
      await actor.createEmbeddedDocuments("Item", items, { keepId: true });
      // console.warn("restoring selection rules to temp items", ruleUpdates);
      await actor.updateEmbeddedDocuments("Item", ruleUpdates);

      const itemUpdates = [];
      for (const [key, value] of Object.entries(this.autoAddedFeatureItems)) {
        itemUpdates.push({
          _id: `${key}`,
          system: {
            items: deepClone(value),
          },
        });
      }

      // console.warn("restoring feature items to temp items", itemUpdates);
      await actor.updateEmbeddedDocuments("Item", itemUpdates);

      logger.debug("Final temp actor", actor);
    } catch (err) {
      logger.error("Temp actor creation failed", {
        actor,
        documents,
        thisData: deepClone(this.result),
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
    this.#statusUpdate(4, 12, "Background");
    await this.#processGenericCompendiumLookup("backgrounds", this.source.background, "background");
    this.#statusUpdate(5, 12, "Class");
    await this.#processGenericCompendiumLookup("classes", this.source.class, "class");
    this.#statusUpdate(6, 12, "Ancestry");
    await this.#processGenericCompendiumLookup("ancestries", this.source.ancestry, "ancestry");
    this.#statusUpdate(7, 12, "Heritage");
    await this.#processGenericCompendiumLookup("heritages", this.source.heritage, "heritage");

    this.#setAbilityBoosts();
    this.#setSkills();

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
      && ["Platinum Pieces", "Gold Pieces", "Silver Pieces", "Copper Pieces"].includes(i.name)
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
      || (!this.options.addSpells && spellIds.includes(i._id))
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

    const newItems = deepClone(items);

    for (const item of newItems) {
      if (item.system.rules?.length > 0) {
        ruleUpdates.push({
          _id: item._id,
          system: {
            rules: deepClone(item.system.rules).map((r) => {
              delete r.choiceQueryResults;
              return r;
            }),
          },
        });
        item.system.rules = item.system.rules
          .filter((r) => {
            const excludedKeys = ["ActiveEffectLike", "AdjustModifier", "Resistance", "Strike"].includes(r.key);
            const grantItemWithFlags = ["GrantItem"].includes(r.key) && hasProperty(r, "flag");
            const objectSelection = ["ChoiceSet"].includes(r.key) && utils.isObject(r.selection);
            return !excludedKeys && !grantItemWithFlags && !objectSelection;
          })
          .map((r) => {
            if (r.key === "ChoiceSet") {
              if ((utils.isString(r.choices) || utils.isObject(r.choices)) && r.choiceQueryResults) {
                r.choices = r.choiceQueryResults;
              }
            }
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
      await this.actor.updateEmbeddedDocuments("Item", this.result.armor);
    }
    if (this.options.addTreasure) await this.#createAndUpdateItemsWithRuleRestore(this.result.treasure);
    if (this.options.addMoney) await this.#createAndUpdateItemsWithRuleRestore(this.result.money);
  }

  async #restoreEmbeddedRuleLogic() {
    const importedItems = this.actor.items.map((i) => i._id);
    // Loop back over items and add rule and item progression data back in.
    if (!this.options.askForChoices) {
      logger.debug("Restoring logic", { currentActor: duplicate(this.actor) });
      const itemUpdates = [];
      for (const [key, value] of Object.entries(this.autoAddedFeatureItems)) {
        if (importedItems.includes(key)) {
          itemUpdates.push({
            _id: `${key}`,
            system: {
              items: deepClone(value),
            },
          });
        }
      }
      this.#statusUpdate(1, 12, "Feats", "Clearing");
      logger.debug("Restoring granted item logic", itemUpdates);
      await this.actor.updateEmbeddedDocuments("Item", itemUpdates);
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
      const abilityDeletions = ["str", "dex", "con", "int", "wis", "cha"]
        .filter((ability) => hasProperty(this.actor, `system.abilities.${ability}`))
        .reduce(
          (accumulated, ability) => ({
            ...accumulated,
            [`-=${ability}`]: null,
          }),
          {}
        );
      setProperty(this.result.character, "system.abilities", abilityDeletions);
    }

    logger.debug("Generated result", this.result);
    await this.actor.update(this.result.character);
    await this.#createActorEmbeddedDocuments();
    await this.#restoreEmbeddedRuleLogic();
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
      ? this.bad.filter((b) => b.type === "deity" && b.pbName !== "Not set").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Deity")}: ${b.pbName}</li>`)
      : [];
    const badFeats = this.options.addFeats
      ? this.bad.filter((b) => b.type === "feat").map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Feats")}: ${b.pbName}</li>`)
      : [];
    const badFeats2 = this.options.addFeats
      ? Object.values(this.check).filter((b) =>
        b.type === "feat"
        && this.parsed.feats.some((f) => f.name === b.details.name && !f.added)
      ).map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Feats")}: ${b.details.name}</li>`)
      : [];
    const badSpecials = this.options.addFeats
      ? Object.values(this.check).filter((b) =>
        (b.type === "special")
        && this.parsed.specials.some((f) => f.name === b.details.name && !f.added)
      ).map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Specials")}: ${b.details.name}</li>`)
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
