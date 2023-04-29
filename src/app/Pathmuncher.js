/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import CONSTANTS from "../constants.js";
import { EQUIPMENT_RENAME_MAP, RESTRICTED_EQUIPMENT, IGNORED_EQUIPMENT } from "../data/equipment.js";
import { FEAT_RENAME_MAP, IGNORED_FEATS } from "../data/features.js";
import { FEAT_SPELLCASTING } from "../data/spells.js";
import logger from "../logger.js";
import utils from "../utils.js";

export class Pathmuncher {

  // eslint-disable-next-line class-methods-use-this
  EQUIPMENT_RENAME_MAP(name) {
    return EQUIPMENT_RENAME_MAP(name);
  }

  getFoundryEquipmentName(pbName) {
    return this.EQUIPMENT_RENAME_MAP(pbName).find((map) => map.pbName == pbName)?.foundryName ?? pbName;
  }

  FEAT_RENAME_MAP(name) {
    const dynamicItems = [
      { pbName: "Shining Oath", foundryName: `Shining Oath (${this.getChampionType()})` },
      { pbName: "Counterspell", foundryName: `Counterspell (${utils.capitalize(this.getClassSpellCastingType() ?? "")})` },
      { pbName: "Counterspell", foundryName: `Counterspell (${utils.capitalize(this.getClassSpellCastingType(true) ?? "")})` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${this.source.class})` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${this.source.dualClass})` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${utils.capitalize(this.getClassSpellCastingType() ?? "")} Caster)` },
      { pbName: "Cantrip Expansion", foundryName: `Cantrip Expansion (${utils.capitalize(this.getClassSpellCastingType(true) ?? "")} Caster)` },
    ];
    return FEAT_RENAME_MAP(name).concat(dynamicItems);
  }

  getFoundryFeatureName(pbName) {
    const match = this.FEAT_RENAME_MAP(pbName).find((map) => map.pbName == pbName);
    return match ?? { pbName, foundryName: pbName, details: undefined };
  }

  // eslint-disable-next-line class-methods-use-this
  get RESTRICTED_EQUIPMENT() {
    return RESTRICTED_EQUIPMENT;
  }

  // specials that are handled by Foundry and shouldn't be added
  // eslint-disable-next-line class-methods-use-this
  get IGNORED_FEATURES() {
    return IGNORED_FEATS();
  };

  // eslint-disable-next-line class-methods-use-this
  get IGNORED_EQUIPMENT() {
    return IGNORED_EQUIPMENT;
  };

  getChampionType() {
    if (this.source.alignment == "LG") return "Paladin";
    else if (this.source.alignment == "CG") return "Liberator";
    else if (this.source.alignment == "NG") return "Redeemer";
    else if (this.source.alignment == "LE") return "Tyrant";
    else if (this.source.alignment == "CE") return "Antipaladin";
    else if (this.source.alignment == "NE") return "Desecrator";
    return "Unknown";
  }

  constructor(actor, { addFeats = true, addEquipment = true, addSpells = true, addMoney = true, addLores = true,
    addWeapons = true, addArmor = true, addTreasure = true, addDeity = true, addName = true, addClass = true,
    addBackground = true, addHeritage = true, addAncestry = true, askForChoices = false } = {}
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
    this.allFeatureRules = {};
    this.autoAddedFeatureRules = {};
    this.grantItemLookUp = {};
    this.autoFeats = [];
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
  }

  async fetchPathbuilder(pathbuilderId) {
    if (!pathbuilderId) {
      const flags = utils.getFlags(this.actor);
      pathbuilderId = flags?.pathbuilderId;
    }
    if (pathbuilderId) {
      const jsonData = await foundry.utils.fetchJsonWithTimeout(`https://www.pathbuilder2e.com/json.php?id=${pathbuilderId}`);
      if (jsonData.success) {
        this.source = jsonData.build;
      } else {
        ui.notifications.warn(game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.FetchFailed`, { pathbuilderId }));
      }
    } else {
      ui.notifications.error(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.NoId`));
    }
  }

  getClassAdjustedSpecialNameLowerCase(name) {
    return `${name} (${this.source.class})`.toLowerCase();
  }

  getDualClassAdjustedSpecialNameLowerCase(name) {
    return `${name} (${this.source.dualClass})`.toLowerCase();
  }

  getAncestryAdjustedSpecialNameLowerCase(name) {
    return `${name} (${this.source.ancestry})`.toLowerCase();
  }

  getHeritageAdjustedSpecialNameLowerCase(name) {
    return `${name} (${this.source.heritage})`.toLowerCase();
  }

  static getMaterialGrade(material) {
    if (material.toLowerCase().includes("high-grade")) {
      return "high";
    } else if (material.toLowerCase().includes("standard-grade")) {
      return "standard";
    }
    return "low";
  }

  static getFoundryFeatLocation(pathbuilderFeatType, pathbuilderFeatLevel) {
    if (pathbuilderFeatType === "Ancestry Feat") {
      return `ancestry-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "Class Feat") {
      return `class-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "Skill Feat") {
      return `skill-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "General Feat") {
      return `general-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "Background Feat") {
      return `skill-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "Archetype Feat") {
      return `archetype-${pathbuilderFeatLevel}`;
    } else {
      return null;
    }
  }

  #generateFoundryFeatLocation(document, feature) {
    if (feature.type && feature.level) {
      const ancestryParagonVariant = game.settings.get("pf2e", "ancestryParagonVariant");
      const dualClassVariant = game.settings.get("pf2e", "dualClassVariant");
      // const freeArchetypeVariant = game.settings.get("pf2e", "freeArchetypeVariant");
      const location = Pathmuncher.getFoundryFeatLocation(feature.type, feature.level);
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

  #nameMap() {
    logger.debug("Starting Equipment Rename");
    this.source.equipment
      .filter((e) => e[0] && e[0] !== "undefined")
      .forEach((e) => {
        const name = this.getFoundryEquipmentName(e[0]);
        const item = { pbName: name, qty: e[1], added: false };
        this.parsed.equipment.push(item);
      });
    this.source.armor
      .filter((e) => e && e !== "undefined")
      .forEach((e) => {
        const name = this.getFoundryEquipmentName(e.name);
        const item = mergeObject({ pbName: name, originalName: e.name, added: false }, e);
        this.parsed.armor.push(item);
      });
    this.source.weapons
      .filter((e) => e && e !== "undefined")
      .forEach((e) => {
        const name = this.getFoundryEquipmentName(e.name);
        const item = mergeObject({ pbName: name, originalName: e.name, added: false }, e);
        this.parsed.weapons.push(item);
      });
    logger.debug("Finished Equipment Rename");

    logger.debug("Starting Special Rename");
    this.source.specials
      .filter((special) => special
        && special !== "undefined"
        && special !== "Not Selected"
        && special !== this.source.heritage
      )
      .forEach((special) => {
        const name = this.getFoundryFeatureName(special).foundryName;
        if (!this.#processSpecialData(name) && !this.IGNORED_FEATURES.includes(name)) {
          this.parsed.specials.push({ name, originalName: special, added: false });
        }
      });
    logger.debug("Finished Special Rename");

    logger.debug("Starting Feat Rename");
    this.source.feats
      .filter((feat) => feat[0]
        && feat[0] !== "undefined"
        && feat[0] !== "Not Selected"
        && feat[0] !== this.source.heritage
      )
      .forEach((feat) => {
        const name = this.getFoundryFeatureName(feat[0]).foundryName;
        const data = {
          name,
          extra: feat[1],
          added: false,
          type: feat[2],
          level: feat[3],
          originalName: feat[0],
        };
        this.parsed.feats.push(data);
      });
    logger.debug("Finished Feat Rename");
  }

  #prepare() {
    this.#nameMap();
  }

  static getSizeValue(size) {
    switch (size) {
      case 0:
        return "tiny";
      case 1:
        return "sm";
      case 3:
        return "lg";
      default:
        return "med";
    }
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
    const compendium = await game.packs.get("pf2e.classes");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });
    const foundryName = this.getFoundryFeatureName(this.source.dualClass).foundryName;
    const indexMatch = index.find((i) => i.system.slug === game.pf2e.system.sluggify(foundryName))
      ?? index.find((i) => i.system.slug === game.pf2e.system.sluggify(this.source.dualClass));

    if (!indexMatch) return;
    const doc = await compendium.getDocument(indexMatch._id);
    const dualClass = doc.toObject();

    logger.debug(`Dual Class ${dualClass.name} found, squashing things together.`);

    klass.name = `${klass.name} - ${dualClass.name}`;
    const ruleEntry = {
      "domain": "all",
      "key": "RollOption",
      "option": `class:${dualClass.system.slug}`
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
        klass.system.attacks.other.name = [...new Set(mashed.split(','))].join(',');
      }
      if (dualClass.system.attacks.other.rank > klass.system.attacks.other.rank) {
        klass.system.attacks.other.name = dualClass.system.attacks.other.name;
        klass.system.attacks.other.rank = dualClass.system.attacks.other.rank;
      }
    }
    if (klass.system.attacks.martial >= dualClass.system.attacks.other.rank
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
        const check = r.path.split('.');
        if (check.includes("data")
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
  async #processGenericCompendiumLookup(compendiumLabel, name, target) {
    logger.debug(`Checking for compendium documents for ${name} (${target}) in ${compendiumLabel}`);
    const compendium = await game.packs.get(compendiumLabel);
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });
    const foundryName = this.getFoundryFeatureName(name).foundryName;
    const indexMatch = index.find((i) => i.system.slug === game.pf2e.system.sluggify(foundryName))
     ?? index.find((i) => i.system.slug === game.pf2e.system.sluggify(name));

    if (indexMatch) {
      const doc = await compendium.getDocument(indexMatch._id);
      const itemData = doc.toObject();
      if (target === "class") {
        itemData.system.keyAbility.selected = this.source.keyability;
        await this.#addDualClass(itemData);
      }
      itemData._id = foundry.utils.randomID();
      this.#generateGrantItemData(itemData);
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

  #parsedFeatureMatch(type, slug, ignoreAdded) {
    // console.warn(`Trying to find ${slug} in ${type}, ignoreAdded? ${ignoreAdded}`);
    const parsedMatch = this.parsed[type].find((f) =>
      (!ignoreAdded || (ignoreAdded && !f.added))
      && (
        slug === game.pf2e.system.sluggify(f.name)
        || slug === game.pf2e.system.sluggify(this.getClassAdjustedSpecialNameLowerCase(f.name))
        || slug === game.pf2e.system.sluggify(this.getAncestryAdjustedSpecialNameLowerCase(f.name))
        || slug === game.pf2e.system.sluggify(this.getHeritageAdjustedSpecialNameLowerCase(f.name))
        || slug === game.pf2e.system.sluggify(f.originalName)
        || slug === game.pf2e.system.sluggify(this.getClassAdjustedSpecialNameLowerCase(f.originalName))
        || slug === game.pf2e.system.sluggify(this.getAncestryAdjustedSpecialNameLowerCase(f.originalName))
        || slug === game.pf2e.system.sluggify(this.getHeritageAdjustedSpecialNameLowerCase(f.originalName))
        || (game.settings.get("pf2e", "dualClassVariant")
          && (slug === game.pf2e.system.sluggify(this.getDualClassAdjustedSpecialNameLowerCase(f.name))
            || slug === game.pf2e.system.sluggify(this.getDualClassAdjustedSpecialNameLowerCase(f.originalName))
          )
        )
      )
    );
    // console.warn(`Results of find ${slug} in ${type}, ignoreAdded? ${ignoreAdded}`, {
    //   slug,
    //   parsedMatch,
    //   parsed: duplicate(this.parsed),
    // });
    return parsedMatch;
  }

  #generatedResultMatch(type, slug) {
    const featMatch = this.result[type].find((f) => slug === f.system.slug);
    return featMatch;
  }

  #findAllFeatureMatch(slug, ignoreAdded) {
    const featMatch = this.#parsedFeatureMatch("feats", slug, ignoreAdded);
    if (featMatch) return featMatch;
    const specialMatch = this.#parsedFeatureMatch("specials", slug, ignoreAdded);
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
    const camelCase = game.pf2e.system.sluggify(document.system.slug, { camel: "dromedary" });
    setProperty(parent, `flags.pf2e.itemGrants.${camelCase}`, { id: document._id, onDelete: "detach" });
    setProperty(document, "flags.pf2e.grantedBy", { id: parent._id, onDelete: "cascade" });
    this.autoFeats.push(document);
    if (!this.options.askForChoices) {
      this.result.feats.push(document);
    }
    const featureMatch = this.#findAllFeatureMatch(document.system.slug, true)
      ?? (document.name.includes("(")
        ? this.#findAllFeatureMatch(game.pf2e.system.sluggify(document.name.split("(")[0].trim()), true)
        : undefined
      );

    // console.warn(`Matching feature for ${document.name}?`, {
    //   featureMatch,
    // });

    if (featureMatch) {
      if (hasProperty(featureMatch, "added")) {
        featureMatch.added = true;
        this.#generateFoundryFeatLocation(document, featureMatch);
      }

      return;
    }
    if (document.type !== "action") logger.warn(`Unable to find parsed feature match for granted feature ${document.name}. This might not be an issue, but might indicate feature duplication.`, { document, parent });
  }

  async #featureChoiceMatch(choices, ignoreAdded, adjustName) {
    for (const choice of choices) {
      const doc = adjustName
        ? game.i18n.localize(choice.label)
        : await fromUuid(choice.value);
      if (!doc) continue;
      const slug = adjustName
        ? game.pf2e.system.sluggify(doc)
        : doc.system.slug;
      const featMatch = this.#findAllFeatureMatch(slug, ignoreAdded);
      if (featMatch) {
        if (adjustName && hasProperty(featMatch, "added")) featMatch.added = true;
        logger.debug("Choices evaluated", { choices, document, featMatch, choice });
        return choice;
      }
    }
    return undefined;
  }

  async #evaluateChoices(document, choiceSet) {
    logger.debug(`Evaluating choices for ${document.name}`, { document, choiceSet });
    const tempActor = await this.#generateTempActor();
    const cleansedChoiceSet = deepClone(choiceSet);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const choiceSetRules = new game.pf2e.RuleElements.all.ChoiceSet(cleansedChoiceSet, item);
      const rollOptions = [tempActor.getRollOptions(), item.getRollOptions("item")].flat();
      const choices = (await choiceSetRules.inflateChoices()).filter((c) => !c.predicate || c.predicate.test(rollOptions));

      logger.debug("Starting choice evaluation", {
        document,
        choiceSet,
        item,
        choiceSetRules,
        rollOptions,
        choices,
      });

      if (choiceSet.choices?.query) {
        const queryResults = await choiceSetRules.queryCompendium(choiceSet.choices);
        logger.debug("Query Result", queryResults);
      }

      logger.debug("Evaluating choiceset", cleansedChoiceSet);
      const choiceMatch = await this.#featureChoiceMatch(choices, true, cleansedChoiceSet.adjustName);
      logger.debug("choiceMatch result", choiceMatch);
      if (choiceMatch) return choiceMatch;

      if (typeof cleansedChoiceSet.choices === "string" || Array.isArray(choices)) {
        for (const choice of choices) {
          const featMatch = this.#findAllFeatureMatch(choice.value, true, cleansedChoiceSet.adjustName);
          if (featMatch) {
            logger.debug("Choices evaluated", { cleansedChoiceSet, choices, document, featMatch, choice });
            featMatch.added = true;
            choice.nouuid = true;
            return choice;
          }
        }
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

  async #resolveInjectedUuid(source, propertyData) {
    if (source === null || typeof source === "number" || (typeof source === "string" && !source.includes("{"))) {
      return source;
    }

    // Walk the object tree and resolve any string values found
    if (Array.isArray(source)) {
      for (let i = 0; i < source.length; i++) {
        source[i] = this.#resolveInjectedUuid(source[i]);
      }
    } else if (typeof source === 'object' && source !== null) {
      for (const [key, value] of Object.entries(source)) {
        if (typeof value === "string" || (typeof value === 'object' && value !== null)) {
          source[key] = this.#resolveInjectedUuid(value);
        }
      }
      return source;
    } else if (typeof source === "string") {
      const match = source.match(/{(actor|item|rule)\|(.*?)}/);
      if (match && match[1] === "actor") {
        return String(getProperty(this.result.character, match[1]));
      } else if (match) {
        const value = this.grantItemLookUp[match[0]].uuid;
        if (!value) {
          logger.error("Failed to resolve injected property", {
            source,
            propertyData,
            key: match[1],
            prop: match[2],
          });
        }
        return String(value);
      } else {
        logger.error("Failed to resolve injected property", {
          source,
          propertyData,
        });
      }
    }

    return source;
  }

  async #generateGrantItemData(document) {
    logger.debug(`Generating grantItem rule lookups for ${document.name}...`, { document: deepClone(document) });
    for (const rule of document.system.rules.filter((r) => r.key === "GrantItem" && r.uuid.includes("{"))) {
      logger.debug("Generating rule for...", { document: deepClone(document), rule });
      const match = rule.uuid.match(/{(item|rule)\|(.*?)}/);
      if (match) {
        const flagName = match[2].split(".").pop();
        const choiceSet = document.system.rules.find((rule) => rule.key === "ChoiceSet" && rule.flag === flagName)
          ?? document.system.rules.find((rule) => rule.key === "ChoiceSet");
        const choice = choiceSet ? (await this.#evaluateChoices(document, choiceSet)) : undefined;
        const value = choice?.value ?? undefined;
        if (!value) {
          logger.warn("Failed to resolve injected uuid", {
            ruleData: choiceSet,
            flagName,
            key: match[1],
            prop: match[2],
            value,
          });
        } else {
          logger.debug(`Generated lookup ${value} for key ${document.name}`);
        }
        this.grantItemLookUp[rule.uuid] = {
          docId: document.id,
          key: rule.uuid,
          choice,
          uuid: value,
          flag: flagName,
          choiceSet,
        };
        this.grantItemLookUp[`${document._id}-${flagName}`] = {
          docId: document.id,
          key: rule.uuid,
          choice,
          uuid: value,
          flag: flagName,
          choiceSet,
        };
        this.grantItemLookUp[`${document._id}`] = {
          docId: document.id,
          key: rule.uuid,
          choice,
          uuid: value,
          flag: flagName,
          choiceSet,
        };
        this.grantItemLookUp[`${document._id}-${flagName}`] = {
          docId: document.id,
          key: rule.uuid,
          choice,
          uuid: value,
          flag: flagName,
          choiceSet,
        };
      } else {
        logger.error("Failed to resolve injected uuid", {
          document,
          rule,
        });
      }
    }
  }

  async #checkRule(document, rule) {
    const tempActor = await this.#generateTempActor([document]);
    const cleansedRule = deepClone(rule);
    try {
      const item = tempActor.getEmbeddedDocument("Item", document._id);
      const ruleElement = cleansedRule.key === "ChoiceSet"
        ? new game.pf2e.RuleElements.all.ChoiceSet(cleansedRule, item)
        : new game.pf2e.RuleElements.all.GrantItem(cleansedRule, item);
      const rollOptions = [tempActor.getRollOptions(), item.getRollOptions("item")].flat();
      const choices = cleansedRule.key === "ChoiceSet"
        ? (await ruleElement.inflateChoices()).filter((c) => !c.predicate || c.predicate.test(rollOptions))
        : [ruleElement.resolveValue()];

      const isGood = cleansedRule.key === "ChoiceSet"
        ? (await this.#featureChoiceMatch(choices, false)) !== undefined
        : ruleElement.test(rollOptions);

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

    if (hasProperty(document, "system.level.value")
     && document.system.level.value > this.result.character.system.details.level.value
    ) {
      return;
    }

    // const rulesToKeep = document.system.rules.filter((r) => !["GrantItem", "ChoiceSet", "MartialProficiency"].includes(r.key));
    const rulesToKeep = [];
    this.allFeatureRules[document._id] = deepClone(document.system.rules);
    this.autoAddedFeatureRules[document._id] = deepClone(document.system.rules.filter((r) => !["GrantItem", "ChoiceSet"].includes(r.key)));
    await this.#generateGrantItemData(document);

    const grantRules = document.system.rules.filter((r) => r.key === "GrantItem");
    const choiceRules = document.system.rules.filter((r) => r.key === "ChoiceSet");
    const rollOptions = document.system.rules.filter((r) => r.key === "RollOption");
    const appendElements = [];
    const localFeatureDocs = [];

    for (const ruleTypes of [choiceRules, grantRules]) {
      for (const rawRuleEntry of ruleTypes) {
        const ruleEntry = deepClone(rawRuleEntry);
        logger.debug(`Checking ${document.name} rule key: ${ruleEntry.key}`);

        const lookupName = ruleEntry.flag ? `${document._id}-${ruleEntry.flag}` : document._id;

        logger.debug("Rule check, looking up", {
          id: `${document._id}-${ruleEntry.flag}`,
          lookup: this.grantItemLookUp[lookupName],
          lookups: this.grantItemLookUp,
          ruleEntry,
          lookupName,
        });

        // have we pre-evaluated this choice?
        const choice = ruleEntry.key === "ChoiceSet"
          ? this.grantItemLookUp[lookupName]?.choice
            ? this.grantItemLookUp[lookupName].choice
            : await this.#evaluateChoices(document, ruleEntry)
          : undefined;

        const uuid = ruleEntry.key === "GrantItem"
          ? await this.#resolveInjectedUuid(ruleEntry.uuid, ruleEntry)
          : choice?.value;

        logger.debug(`UUID for ${document.name}: "${uuid}"`, { document, ruleEntry, choice, uuid });
        const ruleFeature = uuid && (typeof uuid === "string")
          ? await fromUuid(uuid)
          : undefined;
        if (ruleFeature) {
          const featureDoc = ruleFeature.toObject();
          featureDoc._id = foundry.utils.randomID();
          if (featureDoc.system.rules) this.allFeatureRules[document._id] = deepClone(document.system.rules);
          setProperty(featureDoc, "flags.pathmuncher.origin.uuid", uuid);
          if (this.autoAddedFeatureIds.has(`${ruleFeature.id}${ruleFeature.type}`)) {
            logger.debug(`Feature ${featureDoc.name} found for ${document.name}, but has already been added (${ruleFeature.id})`, ruleFeature);
            continue;
          }
          logger.debug(`Found rule feature ${featureDoc.name} for ${document.name} for`, ruleEntry);

          if (ruleEntry.predicate) { // && featureDoc.type === "feat") {
            const testResult = await this.#checkRule(featureDoc, ruleEntry);
            // eslint-disable-next-line max-depth
            if (!testResult) {
              const data = { document, ruleEntry, featureDoc, testResult };
              logger.debug(`The test failed for ${document.name} rule key: ${ruleFeature.key} (This is probably not a problem).`, data);
              continue;
            }
          }
          if (choice) {
            ruleEntry.selection = choice.value;
          }
          this.autoAddedFeatureIds.add(`${ruleFeature.id}${ruleFeature.type}`);
          featureDoc._id = foundry.utils.randomID();
          this.#createGrantedItem(featureDoc, document);
          if (hasProperty(ruleFeature, "system.rules.length")) await this.#addGrantedRules(featureDoc);
          localFeatureDocs.push(featureDoc);
        } else if (choice?.nouuid) {
          logger.debug("Parsed no id rule", { choice, uuid, ruleEntry });
          if (!ruleEntry.flag) ruleEntry.flag = game.pf2e.system.sluggify(document.name, { camel: "dromedary" });
          ruleEntry.selection = choice.value;
          if (choice.label) document.name = `${document.name} (${choice.label})`;
        } else if (choice && uuid && !hasProperty(ruleEntry, "selection")) {
          logger.debug("Parsed odd choice rule", { choice, uuid, ruleEntry });
          if (!ruleEntry.flag) ruleEntry.flag = game.pf2e.system.sluggify(document.name, { camel: "dromedary" });
          ruleEntry.selection = choice.value;
          if (!ruleEntry.adjustName && choice.label && (typeof uuid === "object")) {
            document.name = Pathmuncher.adjustDocumentName(document.name, choice.label);
          }
        } else {
          const data = {
            uuid: ruleEntry.uuid,
            document,
            ruleEntry,
            choice,
            lookup: this.grantItemLookUp[ruleEntry.uuid],
          };
          if (ruleEntry.key === "GrantItem" && this.grantItemLookUp[ruleEntry.uuid]) {
            rulesToKeep.push(ruleEntry);
            // const lookup = this.grantItemLookUp[ruleEntry.uuid].choiceSet
            // eslint-disable-next-line max-depth
            // if (!rulesToKeep.some((r) => r.key == lookup && r.prompt === lookup.prompt)) {
            //   rulesToKeep.push(this.grantItemLookUp[ruleEntry.uuid].choiceSet);
            // }
          } else if (ruleEntry.key === "ChoiceSet" && !hasProperty(ruleEntry, "flag")) {
            logger.debug("Prompting user for choices", ruleEntry);
            rulesToKeep.push(ruleEntry);
          } else if (ruleEntry.key === "ChoiceSet" && !choice && !uuid) {
            logger.warn("Unable to determine choice asking", data);
            rulesToKeep.push(ruleEntry);
            rulesToKeep.push(...rollOptions);
          }
          logger.warn("Unable to determine granted rule feature, needs better parser", data);
        }
        if (ruleEntry.adjustName && choice.label) {
          document.name = Pathmuncher.adjustDocumentName(document.name, choice.label);
        }
        appendElements.push(ruleEntry);
      }
    }
    if (grantRules.length > 0
      && rulesToKeep.filter((c) => c.key === "ChoiceSet").length > 0
      && localFeatureDocs.filter((c) => c.key === "GrantItem").length === 0
    ) {
      rulesToKeep.push(...grantRules);
    }
    this.autoAddedFeatureRules[document._id].unshift(...appendElements);
    if (!this.options.askForChoices) {
      // eslint-disable-next-line require-atomic-updates
      document.system.rules = rulesToKeep;
    }
  }

  async #addGrantedItems(document) {
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
        if (hasProperty(featureDoc, "system.rules")) await this.#addGrantedRules(featureDoc);
      }
      if (!this.options.askForChoices) {
        // eslint-disable-next-line require-atomic-updates
        document.system.items = failedFeatureItems;
      }
    }
    if (hasProperty(document, "system.rules")) await this.#addGrantedRules(document);

  }

  async #detectGrantedFeatures() {
    if (this.result.class.length > 0) await this.#addGrantedItems(this.result.class[0]);
    if (this.result.ancestry.length > 0) await this.#addGrantedItems(this.result.ancestry[0]);
    if (this.result.heritage.length > 0) await this.#addGrantedItems(this.result.heritage[0]);
    if (this.result.background.length > 0) await this.#addGrantedItems(this.result.background[0]);
  }

  async #processCore() {
    setProperty(this.result.character, "name", this.source.name);
    setProperty(this.result.character, "prototypeToken.name", this.source.name);
    setProperty(this.result.character, "system.details.level.value", this.source.level);
    if (this.source.age !== "Not set") setProperty(this.result.character, "system.details.age.value", this.source.age);
    if (this.source.gender !== "Not set") setProperty(this.result.character, "system.details.gender.value", this.source.gender);
    setProperty(this.result.character, "system.details.alignment.value", this.source.alignment);
    setProperty(this.result.character, "system.details.keyability.value", this.source.keyability);
    if (this.source.deity !== "Not set") setProperty(this.result.character, "system.details.deity.value", this.source.deity);
    setProperty(this.result.character, "system.traits.size.value", Pathmuncher.getSizeValue(this.source.size));
    setProperty(this.result.character, "system.traits.languages.value", this.source.languages.map((l) => l.toLowerCase()));

    this.#processSenses();

    setProperty(this.result.character, "system.abilities.str.value", this.source.abilities.str);
    setProperty(this.result.character, "system.abilities.dex.value", this.source.abilities.dex);
    setProperty(this.result.character, "system.abilities.con.value", this.source.abilities.con);
    setProperty(this.result.character, "system.abilities.int.value", this.source.abilities.int);
    setProperty(this.result.character, "system.abilities.wis.value", this.source.abilities.wis);
    setProperty(this.result.character, "system.abilities.cha.value", this.source.abilities.cha);

    setProperty(this.result.character, "system.saves.fortitude.tank", this.source.proficiencies.fortitude / 2);
    setProperty(this.result.character, "system.saves.reflex.value", this.source.proficiencies.reflex / 2);
    setProperty(this.result.character, "system.saves.will.value", this.source.proficiencies.will / 2);

    setProperty(this.result.character, "system.martial.advanced.rank", this.source.proficiencies.advanced / 2);
    setProperty(this.result.character, "system.martial.heavy.rank", this.source.proficiencies.heavy / 2);
    setProperty(this.result.character, "system.martial.light.rank", this.source.proficiencies.light / 2);
    setProperty(this.result.character, "system.martial.medium.rank", this.source.proficiencies.medium / 2);
    setProperty(this.result.character, "system.martial.unarmored.rank", this.source.proficiencies.unarmored / 2);
    setProperty(this.result.character, "system.martial.martial.rank", this.source.proficiencies.martial / 2);
    setProperty(this.result.character, "system.martial.simple.rank", this.source.proficiencies.simple / 2);
    setProperty(this.result.character, "system.martial.unarmed.rank", this.source.proficiencies.unarmed / 2);

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

    setProperty(this.result.character, "system.attributes.perception.rank", this.source.proficiencies.perception / 2);
    setProperty(this.result.character, "system.attributes.classDC.rank", this.source.proficiencies.classDC / 2);
  }

  #indexFind(index, arrayOfNameMatches) {
    for (const name of arrayOfNameMatches) {
      const indexMatch = index.find((i) =>
        i.system.slug === game.pf2e.system.sluggify(name)
        || i.system.slug === game.pf2e.system.sluggify(this.getClassAdjustedSpecialNameLowerCase(name))
        || i.system.slug === game.pf2e.system.sluggify(this.getAncestryAdjustedSpecialNameLowerCase(name))
        || i.system.slug === game.pf2e.system.sluggify(this.getHeritageAdjustedSpecialNameLowerCase(name))
        || (game.settings.get("pf2e", "dualClassVariant")
          && (i.system.slug === game.pf2e.system.sluggify(this.getDualClassAdjustedSpecialNameLowerCase(name))
          )
        )
      );
      if (indexMatch) return indexMatch;
    }
    return undefined;
  }

  async #generateFeatItems(compendiumLabel) {
    const compendium = await game.packs.get(compendiumLabel);
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });

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
      }
      return 0;
    });
    for (const featArray of [this.parsed.feats, this.parsed.specials]) {
      for (const pBFeat of featArray) {
        if (pBFeat.added) continue;
        logger.debug("Generating feature for", pBFeat);

        const indexMatch = this.#indexFind(index, [pBFeat.name, pBFeat.originalName]);
        const displayName = pBFeat.extra ? Pathmuncher.adjustDocumentName(pBFeat.name, pBFeat.extra) : pBFeat.name;
        if (!indexMatch) {
          logger.debug(`Unable to match feat ${displayName}`, { displayName, name: pBFeat.name, extra: pBFeat.extra, pBFeat, compendiumLabel });
          this.check[pBFeat.originalName] = { name: displayName, type: "feat", details: { displayName, name: pBFeat.name, originalName: pBFeat.originalName, extra: pBFeat.extra, pBFeat, compendiumLabel } };
          continue;
        }
        if (this.check[pBFeat.originalName]) delete this.check[pBFeat.originalName];
        pBFeat.added = true;
        if (this.autoAddedFeatureIds.has(`${indexMatch._id}${indexMatch.type}`)) {
          logger.debug("Feat included in class features auto add", { displayName, pBFeat, compendiumLabel });
          continue;
        }

        const doc = await compendium.getDocument(indexMatch._id);
        const item = doc.toObject();
        item._id = foundry.utils.randomID();
        item.name = displayName;

        this.#generateFoundryFeatLocation(item, pBFeat);
        this.result.feats.push(item);
        await this.#addGrantedItems(item);
      }
    }
  }

  async #generateSpecialItems(compendiumLabel) {
    const compendium = await game.packs.get(compendiumLabel);
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });

    for (const special of this.parsed.specials) {
      if (special.added) continue;
      logger.debug("Generating special for", special);
      const indexMatch = this.#indexFind(index, [special.name, special.originalName]);
      if (!indexMatch) {
        logger.debug(`Unable to match special ${special.name}`, { special: special.name, compendiumLabel });
        this.check[special.originalName] = { name: special.name, type: "special", details: { displayName: special.name, name: special.name, originalName: special.originalName, special } };
        continue;
      }
      special.added = true;
      if (this.check[special.originalName]) delete this.check[special.originalName];
      if (this.autoAddedFeatureIds.has(`${indexMatch._id}${indexMatch.type}`)) {
        logger.debug("Special included in class features auto add", { special: special.name, compendiumLabel });
        continue;
      }

      const doc = await compendium.getDocument(indexMatch._id);
      const docData = doc.toObject();
      docData._id = foundry.utils.randomID();
      this.result.feats.push(docData);
      await this.#addGrantedItems(docData);
    }
  }

  async #generateEquipmentItems(pack = "pf2e.equipment-srd") {
    const compendium = game.packs.get(pack);
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });
    const compendiumBackpack = await compendium.getDocument("3lgwjrFEsQVKzhh7");

    const adventurersPack = this.parsed.equipment.find((e) => e.pbName === "Adventurer's Pack");
    const backpackInstance = adventurersPack ? compendiumBackpack.toObject() : null;
    if (backpackInstance) {
      adventurersPack.added = true;
      backpackInstance._id = foundry.utils.randomID();
      this.result.adventurersPack.item = adventurersPack;
      this.result.equipment.push(backpackInstance);
      for (const content of this.result.adventurersPack.contents) {
        const indexMatch = index.find((i) => i.system.slug === content.slug);
        if (!indexMatch) {
          logger.error(`Unable to match adventurers kit item ${content.name}`, content);
          continue;
        }

        const doc = await compendium.getDocument(indexMatch._id);
        const itemData = doc.toObject();
        itemData._id = foundry.utils.randomID();
        itemData.system.quantity = content.qty;
        itemData.system.containerId = backpackInstance?._id;
        this.result.equipment.push(itemData);
      }
    }

    for (const e of this.parsed.equipment) {
      if (e.pbName === "Adventurer's Pack") continue;
      if (e.added) continue;
      if (this.IGNORED_EQUIPMENT.includes(e.pbName)) {
        e.added = true;
        continue;
      }
      logger.debug("Generating item for", e);
      const indexMatch = index.find((i) => i.system.slug === game.pf2e.system.sluggify(e.pbName));
      if (!indexMatch) {
        logger.error(`Unable to match ${e.pbName}`, e);
        this.bad.push({ pbName: e.pbName, type: "equipment", details: { e } });
        continue;
      }

      const doc = await compendium.getDocument(indexMatch._id);
      if (doc.type != "kit") {
        const itemData = doc.toObject();
        itemData._id = foundry.utils.randomID();
        itemData.system.quantity = e.qty;
        const type = doc.type === "treasure" ? "treasure" : "equipment";
        this.result[type].push(itemData);
      }
      // eslint-disable-next-line require-atomic-updates
      e.added = true;
    }
  }

  async #generateWeaponItems() {
    const compendium = game.packs.get("pf2e.equipment-srd");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });

    for (const w of this.parsed.weapons) {
      if (this.IGNORED_EQUIPMENT.includes(w.pbName)) {
        w.added = true;
        continue;
      }
      logger.debug("Generating weapon for", w);
      const indexMatch = index.find((i) => i.system.slug === game.pf2e.system.sluggify(w.pbName));
      if (!indexMatch) {
        logger.error(`Unable to match weapon item ${w.name}`, w);
        this.bad.push({ pbName: w.pbName, type: "weapon", details: { w } });
        continue;
      }

      const doc = await compendium.getDocument(indexMatch._id);
      const itemData = doc.toObject();
      itemData._id = foundry.utils.randomID();
      itemData.system.quantity = w.qty;
      itemData.system.damage.die = w.die;
      itemData.system.potencyRune.value = w.pot;
      itemData.system.strikingRune.value = w.str;

      if (w.runes[0]) itemData.system.propertyRune1.value = game.pf2e.system.sluggify(w.runes[0], { camel: "dromedary" });
      if (w.runes[1]) itemData.system.propertyRune2.value = game.pf2e.system.sluggify(w.runes[1], { camel: "dromedary" });
      if (w.runes[2]) itemData.system.propertyRune3.value = game.pf2e.system.sluggify(w.runes[2], { camel: "dromedary" });
      if (w.runes[3]) itemData.system.propertyRune4.value = game.pf2e.system.sluggify(w.runes[3], { camel: "dromedary" });
      if (w.mat) {
        const material = w.mat.split(" (")[0];
        itemData.system.preciousMaterial.value = game.pf2e.system.sluggify(material, { camel: "dromedary" });
        itemData.system.preciousMaterialGrade.value = Pathmuncher.getMaterialGrade(w.mat);
      }
      if (w.display) itemData.name = w.display;

      this.result.weapons.push(itemData);
      w.added = true;
    }
  }

  async #generateArmorItems() {
    const compendium = game.packs.get("pf2e.equipment-srd");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });

    for (const a of this.parsed.armor) {
      if (this.IGNORED_EQUIPMENT.includes(a.pbName)) {
        a.added = true;
        continue;
      }
      logger.debug("Generating armor for", a);
      const indexMatch = index.find((i) =>
        i.system.slug === game.pf2e.system.sluggify(a.pbName)
        || i.system.slug === game.pf2e.system.sluggify(`${a.pbName} Armor`)
      );
      if (!indexMatch) {
        logger.error(`Unable to match armor kit item ${a.name}`, a);
        this.bad.push({ pbName: a.pbName, type: "armor", details: { a } });
        continue;
      }

      const doc = await compendium.getDocument(indexMatch._id);
      const itemData = doc.toObject();
      itemData._id = foundry.utils.randomID();
      itemData.system.equipped.value = a.worn ?? false;
      if (!this.RESTRICTED_EQUIPMENT.some((i) => itemData.name.startsWith(i))) {
        itemData.system.equipped.inSlot = a.worn ?? false;
        itemData.system.quantity = a.qty;
        itemData.system.category = a.prof;
        itemData.system.potencyRune.value = a.pot;
        itemData.system.resiliencyRune.value = a.res;

        const isShield = itemData.system.category === "shield";
        itemData.system.equipped.handsHeld = isShield && a.worn ? 1 : 0;
        itemData.system.equipped.carryType = isShield && a.worn ? "held" : "worn";

        if (a.runes[0]) itemData.system.propertyRune1.value = game.pf2e.system.sluggify(a.runes[0], { camel: "dromedary" });
        if (a.runes[1]) itemData.system.propertyRune2.value = game.pf2e.system.sluggify(a.runes[1], { camel: "dromedary" });
        if (a.runes[2]) itemData.system.propertyRune3.value = game.pf2e.system.sluggify(a.runes[2], { camel: "dromedary" });
        if (a.runes[3]) itemData.system.propertyRune4.value = game.pf2e.system.sluggify(a.runes[3], { camel: "dromedary" });
        if (a.mat) {
          const material = a.mat.split(" (")[0];
          itemData.system.preciousMaterial.value = game.pf2e.system.sluggify(material, { camel: "dromedary" });
          itemData.system.preciousMaterialGrade.value = Pathmuncher.getMaterialGrade(a.mat);
        }
      }
      if (a.display) itemData.name = a.display;

      this.result.armor.push(itemData);
      // eslint-disable-next-line require-atomic-updates
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
    const tradition = classCaster
      ? caster?.magicTradition
      : undefined;
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
      showSlotlessLevels: { value: true }
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
    const compendium = game.packs.get("pf2e.spells-srd");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });

    const psiCompendium = game.packs.get("pf2e-psychic-amps.psychic-psi-cantrips");
    const psiIndex = psiCompendium ? await psiCompendium.getIndex({ fields: ["name", "type", "system.slug"] }) : undefined;

    const spellName = spell.split("(")[0].trim();
    logger.debug("focus spell details", { spell, spellName, debugData });

    const psiMatch = psiIndex ? psiIndex.find((i) => i.name === spell) : undefined;
    const indexMatch = index.find((i) => i.system.slug === game.pf2e.system.sluggify(spellName));
    if (!indexMatch && !psiMatch) {
      logger.error(`Unable to match focus spell ${spell}`, { spell, spellName, debugData });
      this.bad.push({ pbName: spell, type: "spell", details: { originalName: spell, name: spellName, debugData } });
      return undefined;
    }

    const doc = psiMatch
      ? await psiCompendium.getDocument(psiMatch._id)
      : await compendium.getDocument(indexMatch._id);
    const itemData = doc.toObject();
    itemData._id = foundry.utils.randomID();
    itemData.system.location.value = casterId;

    return itemData;
  }

  async #processCasterSpells(instance, spells, spellEnhancements) {
    const spellNames = [];
    for (const spellSelection of spells) {
      const level = spellSelection.spellLevel;
      for (const [i, spell] of spellSelection.list.entries()) {
        const itemData = await this.#loadSpell(spell, instance._id, {
          spellSelection,
          list: spellSelection.list,
          level,
          instance,
        });
        if (itemData) {
          itemData.system.location.heightenedLevel = level;
          spellNames.push(itemData.name);
          this.result.spells.push(itemData);

          // if the caster is prepared we don't prepare spells as all known spells come through in JSON
          if (instance.system.prepared.value !== "prepared" || spellEnhancements?.preparePBSpells) {
            instance.system.slots[`slot${level}`].prepared[i] = { id: itemData._id };
          }
        }
      }

      if (spellEnhancements?.knownSpells) {
        for (const spell of spellEnhancements.knownSpells) {
          const itemData = await this.#loadSpell(spell, instance._id, {
            spellEnhancements,
            instance
          });
          if (itemData && !spellNames.includes(itemData.name)) {
            itemData.system.location.heightenedLevel = level;
            spellNames.push(itemData.name);
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

  async #processSpells() {
    for (const caster of this.source.spellCasters) {
      logger.debug("Generating caster for", caster);
      if (Number.isInteger(parseInt(caster.focusPoints))) this.result.focusPool += caster.focusPoints;
      const instance = this.#generateSpellCaster(caster);
      logger.debug("Generated caster instance", instance);
      const spellEnhancements = FEAT_SPELLCASTING.find((f) => f.name === caster.name);
      if (hasProperty(spellEnhancements, "showSlotless")) {
        instance.system.showSlotlessLevels.value = getProperty(spellEnhancements, "showSlotless");
      }
      await this.#processCasterSpells(instance, caster.spells, spellEnhancements);
    }

    const globalFocus = this.result.focus?.focusPoints;
    if (Number.isInteger(globalFocus) && globalFocus > 0) {
      this.result.focusPool = globalFocus;
    }

    for (const tradition of ["occult", "primal", "divine", "arcane"]) {
      const traditionData = getProperty(this.source, `focus.${tradition}`);
      logger.debug(`Checking for focus tradition ${tradition}`);
      if (!traditionData) continue;
      for (const ability of ["str", "dex", "con", "int", "wise", "cha"]) {
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

    setProperty(this.result.character, "system.resources.focus.max", this.result.focusPool);
    setProperty(this.result.character, "system.resources.focus.value", this.result.focusPool);
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
    const compendium = game.packs.get("pf2e.equipment-srd");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });
    const uuids = [];

    for (const formulaSource of this.source.formula) {
      for (const formulaName of formulaSource.known) {
        const indexMatch = index.find((i) => i.system.slug === game.pf2e.system.sluggify(formulaName));
        if (!indexMatch) {
          logger.error(`Unable to match formula ${formulaName}`, { formulaSource, name: formulaName });
          this.bad.push({ pbName: formulaName, type: "formula", details: { formulaSource, name: formulaName } });
          continue;
        }
        const doc = await compendium.getDocument(indexMatch._id);
        uuids.push({ uuid: doc.uuid });
      }
    }
    setProperty(this.result.character, "system.crafting.formulas", uuids);
  }

  async #processFeats() {
    await this.#generateFeatItems("pf2e.feats-srd");
    await this.#generateFeatItems("pf2e.ancestryfeatures");
    await this.#generateSpecialItems("pf2e.ancestryfeatures");
    await this.#generateSpecialItems("pf2e.classfeatures");
    await this.#generateSpecialItems("pf2e.actionspf2e");
  }

  async #processEquipment() {
    await this.#generateEquipmentItems();
    await this.#generateWeaponItems();
    await this.#generateArmorItems();
    await this.#generateMoney();
  }

  async #generateTempActor(documents = []) {
    const actorData = mergeObject({ type: "character" }, this.result.character);
    actorData.name = "Mr Temp";
    const actor = await Actor.create(actorData);
    const currentState = duplicate(this.result);

    const currentItems = [
      ...(this.options.askForChoices ? this.autoFeats : []),
      ...currentState.feats,
      ...currentState.class,
      ...currentState.background,
      ...currentState.ancestry,
      ...currentState.heritage,
      ...currentState.deity,
      ...currentState.lores,
    ];
    for (const doc of documents) {
      if (!currentItems.some((d) => d._id === doc._id)) {
        currentItems.push(doc);
      }
    }
    try {
      const items = duplicate(currentItems).map((i) => {
        if (i.system.items) i.system.items = [];
        if (i.system.rules) i.system.rules = [];
        return i;
      });

      await actor.createEmbeddedDocuments("Item", items, { keepId: true });
      const ruleIds = currentItems.map((i) => i._id);
      const ruleUpdates = [];
      for (const [key, value] of Object.entries(this.allFeatureRules)) {
        if (ruleIds.includes(key)) {
          ruleUpdates.push({
            _id: key,
            system: {
              // rules: value,
              rules: value.filter((r) => ["GrantItem", "ChoiceSet", "RollOption"].includes(r.key)),
            },
          });
        }
      }
      // console.warn("rule updates", ruleUpdates);
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

      for (const doc of documents) {
        if (getProperty(doc, "system.rules")?.length > 0 && !ruleUpdates.some((r) => r._id === doc._id)) {
          ruleUpdates.push({
            _id: doc._id,
            system: {
              rules: deepClone(doc.system.rules),
            },
          });
        }
      }

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
    this.#prepare();
    await this.#processCore();
    await this.#processFormulas();
    await this.#processGenericCompendiumLookup("pf2e.deities", this.source.deity, "deity");
    await this.#processGenericCompendiumLookup("pf2e.backgrounds", this.source.background, "background");
    await this.#processGenericCompendiumLookup("pf2e.classes", this.source.class, "class");
    await this.#processGenericCompendiumLookup("pf2e.ancestries", this.source.ancestry, "ancestry");
    await this.#processGenericCompendiumLookup("pf2e.heritages", this.source.heritage, "heritage");
    await this.#detectGrantedFeatures();
    await this.#processFeats();
    await this.#processEquipment();
    await this.#processSpells();
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
    const treasureIds = this.actor.items.filter((i) => i.type === "treasure" && !moneyIds.includes(i.id)).map((i) => i._id);
    const featIds = this.actor.items.filter((i) => i.type === "feat").map((i) => i._id);
    const actionIds = this.actor.items.filter((i) => i.type === "action").map((i) => i._id);
    const equipmentIds = this.actor.items.filter((i) =>
      i.type === "equipment" || i.type === "backpack" || i.type === "consumable"
    ).map((i) => i._id);
    const weaponIds = this.actor.items.filter((i) => i.type === "weapon").map((i) => i._id);
    const armorIds = this.actor.items.filter((i) => i.type === "armor").map((i) => i._id);
    const loreIds = this.actor.items.filter((i) => i.type === "lore").map((i) => i._id);
    const spellIds = this.actor.items.filter((i) => i.type === "spell" || i.type === "spellcastingEntry").map((i) => i._id);
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

  async #createActorEmbeddedDocuments() {
    if (this.options.addDeity) await this.actor.createEmbeddedDocuments("Item", this.result.deity, { keepId: true });
    if (this.options.addAncestry) await this.actor.createEmbeddedDocuments("Item", this.result.ancestry, { keepId: true });
    if (this.options.addHeritage) await this.actor.createEmbeddedDocuments("Item", this.result.heritage, { keepId: true });
    if (this.options.addBackground) await this.actor.createEmbeddedDocuments("Item", this.result.background, { keepId: true });
    if (this.options.addClass) await this.actor.createEmbeddedDocuments("Item", this.result.class, { keepId: true });
    if (this.options.addLores) await this.actor.createEmbeddedDocuments("Item", this.result.lores, { keepId: true });
    // for (const feat of this.result.feats.reverse()) {
    //   console.warn(`creating ${feat.name}`, feat);
    //   await this.actor.createEmbeddedDocuments("Item", [feat], { keepId: true });
    // }
    if (this.options.addFeats) await this.actor.createEmbeddedDocuments("Item", this.result.feats, { keepId: true });
    if (this.options.addSpells) {
      await this.actor.createEmbeddedDocuments("Item", this.result.casters, { keepId: true });
      await this.actor.createEmbeddedDocuments("Item", this.result.spells, { keepId: true });
    }
    if (this.options.addEquipment) await this.actor.createEmbeddedDocuments("Item", this.result.equipment, { keepId: true });
    if (this.options.addWeapons) await this.actor.createEmbeddedDocuments("Item", this.result.weapons, { keepId: true });
    if (this.options.addArmor) {
      await this.actor.createEmbeddedDocuments("Item", this.result.armor, { keepId: true });
      await this.actor.updateEmbeddedDocuments("Item", this.result.armor, { keepId: true });
    }
    if (this.options.addTreasure) await this.actor.createEmbeddedDocuments("Item", this.result.treasure, { keepId: true });
    if (this.options.addMoney) await this.actor.createEmbeddedDocuments("Item", this.result.money, { keepId: true });
  }

  async #restoreEmbeddedRuleLogic() {
    const importedItems = this.actor.items.map((i) => i._id);
    // Loop back over items and add rule and item progression data back in.
    if (!this.options.askForChoices) {
      logger.debug("Restoring logic", { currentActor: duplicate(this.actor) });
      const ruleUpdates = [];
      for (const [key, value] of Object.entries(this.autoAddedFeatureRules)) {
        if (importedItems.includes(key)) {
          ruleUpdates.push({
            _id: `${key}`,
            system: {
              rules: deepClone(value),
            },
          });
        }
      }
      logger.debug("Restoring rule logic", ruleUpdates);
      await this.actor.updateEmbeddedDocuments("Item", ruleUpdates);

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
        (b.type === "feat" || b.type === "special")
        && this.parsed.feats.concat(this.parsed.specials).some((f) => f.name === b.details.name && !f.added)
      ).map((b) => `<li>${game.i18n.localize("pathmuncher.Labels.Feats")}: ${b.details.name}</li>`)
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
    if (this.result.focusPool > 0) {
      warning += `<strong>${game.i18n.localize("pathmuncher.Dialogs.Pathmuncher.FocusSpells")}</strong><br>`;
    }

    logger.debug("Bad thing check", {
      badClass,
      badAncestry,
      badHeritage,
      badBackground,
      badDeity,
      badFeats,
      badFeats2,
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

    if (totalBad.length > 0 || this.result.focusPool > 0) {
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
