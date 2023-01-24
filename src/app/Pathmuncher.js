/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import CONSTANTS from "../constants.js";
import logger from "../logger.js";
import utils from "../utils.js";

export class Pathmuncher {

  static EQUIPMENT_MAP = [
    { name: "Chain", new: "Chain (10 feet)" },
    { name: "Oil", new: "Oil (1 pint)" },
    { name: "Bracelets of Dashing", new: "Bracelet of Dashing" },
    { name: "Fingerprinting Kit", new: "Fingerprint Kit" },
    { name: "Greater Unmemorable Mantle", new: "Unmemorable Mantle (Greater)" },
    { name: "Major Unmemorable Mantle", new: "Unmemorable Mantle (Major)" },
    { name: "Ladder", new: "Ladder (10-foot)" },
    { name: "Mezmerizing Opal", new: "Mesmerizing Opal" },
    { name: "Explorer's Clothing", new: "Clothing (Explorer's)" },
    { name: "Flaming Star (Greater)", new: "Greater Flaming Star" },
    { name: "Potion of Lesser Darkvision", new: "Darkvision Elixir (Lesser)" },
    { name: "Bottled Sunlight", new: "Formulated Sunlight" },
    { name: "Magazine (Repeating Hand Crossbow)", new: "Magazine with 5 Bolts" },
    { name: "Astrolabe (Standard)", new: "Standard Astrolabe" },
    { name: "Greater Cloak of Repute", new: "Cloak of Repute (Greater)" },
    { name: "Skinitch Salve", new: "Skinstitch Salve" },
    { name: "Flawless Scale", new: "Abadar's Flawless Scale" },
    { name: "Construct Key", new: "Cordelia's Construct Key" },
    { name: "Construct Key (Greater)", new: "Cordelia's Greater Construct Key" },
    { name: "Lesser Swapping Stone", new: "Lesser Bonmuan Swapping Stone" },
    { name: "Major Swapping Stone", new: "Major Bonmuan Swapping Stone" },
    { name: "Moderate Swapping Stone", new: "Moderate Bonmuan Swapping Stone" },
    { name: "Greater Swapping Stone", new: "Greater Bonmuan Swapping Stone" },
    { name: "Heartstone", new: "Skarja's Heartstone" },
    { name: "Bullets (10 rounds)", new: "Sling Bullets" },
  ];

  getChampionType() {
    if (this.source.alignment == "LG") return "Paladin";
    else if (this.source.alignment == "CG") return "Liberator";
    else if (this.source.alignment == "NG") return "Redeemer";
    else if (this.source.alignment == "LE") return "Tyrant";
    else if (this.source.alignment == "CE") return "Antipaladin";
    else if (this.source.alignment == "NE") return "Desecrator";
    return "Unknown";
  }

  get SPECIAL_MAP () {
    return [
      { name: "Deflect Arrows", new: "Deflect Arrow" },
      { name: "Maestro", new: "Maestro Muse" },
      { name: "Tenets of Evil", new: "The Tenets of Evil" },
      { name: "Antipaladin [Chaotic Evil]", new: "Antipaladin" },
      { name: "Paladin [Lawful Good]", new: "Paladin" },
      { name: "Redeemer [Neutral Good]", new: "Redeemer" },
      { name: "Liberator [Chaotic Good]", new: "Liberator" },
      { name: "Tyrant [Lawful Evil]", new: "Tyrant" },
      { name: "Desecrator [Neutral Evil]", new: "Desecrator" },
      { name: "Harmful Font", new: "Divine Font" },
      { name: "Healing Font", new: "Divine Font" },
      { name: "Deepvision", new: "Deep Vision" },
      { name: "Wind God's Fan", new: "Wind God’s Fan" },
      { name: "Redeemer [Neutral Good]", new: "Redeemer" },
      { name: "Enigma", new: "Enigma Muse" },
      { name: "Polymath", new: "Polymath Muse" },
      { name: "Warrior", new: "Warrior Muse" },
      { name: "Multifarious", new: "Multifarious Muse" },
      { name: "Constructed (Android)", new: "Constructed" },
      { name: "Wakizashi", new: "Wakizashi Weapon Familiarity" },
      { name: "Katana", new: "Katana Weapon Familiarity" },
      { name: "Marked for Death", new: "Mark for Death" },
      { name: "Precise Debilitation", new: "Precise Debilitations" },
      { name: "Major Lesson I", new: "Major Lesson" },
      { name: "Major Lesson II", new: "Major Lesson" },
      { name: "Major Lesson III", new: "Major Lesson" },
      { name: "Eye of the Arcane Lords", new: "Eye of the Arclords" },
      { name: "Aeromancer", new: "Shory Aeromancer" },
      { name: "Heatwave", new: "Heat Wave" },
      { name: "Bloodline: Genie (Efreeti)", new: "Bloodline: Genie" },
      { name: "Bite (Gnoll)", new: "Bite" },
      { name: "Shining Oath", new: `Shining Oath (${this.getChampionType()})` },
      { name: "Cognative Mutagen (Greater)", new: "Cognitive Mutagen (Greater)" },
      { name: "Cognative Mutagen (Lesser)", new: "Cognitive Mutagen (Lesser)" },
      { name: "Cognative Mutagen (Major)", new: "Cognitive Mutagen (Major)" },
      { name: "Cognative Mutagen (Moderate)", new: "Cognitive Mutagen (Moderate)" },
      { name: "Recognise Threat", new: "Recognize Threat" },
      { name: "Enhanced Familiar Feat", new: "Enhanced Familiar" },
      { name: "Aquatic Eyes (Darkvision)", new: "Aquatic Eyes" },
      { name: "Heir of the Astrologers", new: "Heir of the Saoc" },
      { name: "Precise Debilitation", new: "Precise Debilitations" },
      { name: "Heatwave", new: "Heat Wave" },
      { name: "Detective Dedication", new: "Edgewatch Detective Dedication" },
      { name: "Flip", new: "Farabellus Flip" },
      { name: "Interrogation", new: "Bolera's Interrogation" },
      { name: "Wind God’s Fan", new: "Wind God's Fan" },
      { name: "Rkoan Arts", new: "Rokoan Arts" },
      { name: "Virtue-Forged Tattooed", new: "Virtue-Forged Tattoos" },
      { name: "Bloody Debilitations", new: "Bloody Debilitation" },
      { name: "Cave Climber Kobold", new: "Caveclimber Kobold" },
      { name: "Tribal Bond", new: "Quah Bond" },
      { name: "Tongue of the Sun and Moon", new: "Tongue of Sun and Moon" },
      { name: "Aerialist", new: "Shory Aerialist" },
      { name: "Aeromancer", new: "Shory Aeromancer" },
      { name: "Ganzi Gaze (Low-Light Vision)", new: "Ganzi Gaze" },
      { name: "Saberteeth", new: "Saber Teeth" },
      { name: "Vestigal Wings", new: "Vestigial Wings" },
      { name: "Chosen One", new: "Chosen of Lamashtu" },
      { name: "Ice-Witch", new: "Irriseni Ice-Witch" },
      { name: "Construct Carver", new: "Tupilaq Carver" },
      { name: "Deadly Hair", new: "Syu Tak-nwa's Deadly Hair" },
      { name: "Revivification Protocall", new: "Revivification Protocol" },
      { name: "Ember's Eyes (Darkvision)", new: "Ember's Eyes" },
      { name: "Astrology", new: "Saoc Astrology" },
      { name: "Ape", new: "Ape Animal Instinct" },
      { name: "Duelist Dedication (LO)", new: "Aldori Duelist Dedication" },
      { name: "Parry", new: "Aldori Parry" },
      { name: "Riposte", new: "Aldori Riposte" },
      { name: "Sentry Dedication", new: "Lastwall Sentry Dedication" },
      { name: "Wary Eye", new: "Eye of Ozem" },
      { name: "Warden", new: "Lastwall Warden" },
      { name: "Heavenseeker Dedication", new: "Jalmeri Heavenseeker Dedication" },
      { name: "Mantis God's Grip", new: "Achaekek's Grip" },
      { name: "High Killer Training", new: "Vernai Training" },
      { name: "Guild Agent Dedication", new: "Pathfinder Agent Dedication" },
      { name: "Wayfinder Resonance Infiltrator", new: "Westyr's Wayfinder Repository" },
      { name: "Collegiate Attendant Dedication", new: "Magaambyan Attendant Dedication" },
      { name: "Scholarly Storytelling", new: "Uzunjati Storytelling" },
      { name: "Scholarly Recollection", new: "Uzunjati Recollection" },
      { name: "Secret Lesson", new: "Janatimo's Lessons" },
      { name: "Lumberjack Dedication", new: "Turpin Rowe Lumberjack Dedication" },
      { name: "Fourberie", new: "Fane's Fourberie" },
      { name: "Incredible Beastmaster's Companion", new: "Incredible Beastmaster Companion" },
      { name: "Polymath", new: "Polymath Muse" },
      { name: "Escape", new: "Fane's Escape" },
      { name: "Quick Climber", new: "Quick Climb" },
      { name: "Stab and Snag", new: "Stella's Stab and Snag" },
      { name: "Cognitive Crossover", new: "Kreighton's Cognitive Crossover" },
    ];
  }

  // specials that are handled by Foundry:
  static FOUNDRY_SPECIALS = [
    "Great Fortitude",
    "Divine Spellcasting",
    "Divine Ally (Blade)",
    "Divine Ally (Shield)",
    "Divine Ally (Steed)",
    "Divine Smite (Antipaladin)",
    "Divine Smite (Paladin)",
    "Divine Smite (Desecrator)",
    "Divine Smite (Liberator)",
    "Divine Smite (Redeemer)",
    "Divine Smite (Tyrant)",
    "Exalt (Antipaladin)",
    "Exalt (Paladin)",
    "Exalt (Desecrator)",
    "Exalt (Redeemer)",
    "Exalt (Liberator)",
    "Exalt (Tyrant)",
    "Intimidation",
    "Axe",
    "Sword",
    "Water",
    "Sword Cane",
    "Battle Axe",
    "Bane",
    "Air",
    "Occultism",
    "Performance",
    "Alchemy",
    "Nature",
    "Red",
    "Shark",
    "Green",
    "Divine",
    "Sun",
    "Fire",
    "Might",
    "Mace",
    "Bronze",
    "Spirit",
    "Zeal",
    "Battledancer",
    "Light Armor Expertise",
    "Religion",
    "Polearm",
    "Longsword",
    "Moon",
    "Hammer",
    "Athletics",
    "Deception",
    "Society",
    "Occultism",
    "Arcane",
    "Simple Weapon Expertise",
    "Defensive Robes",
    "Magical Fortitude",
    "Occult",
    "Acrobatics",
    "Medicine",
    "Diplomacy",
    "Might",
    "Reflex",
    "Evasion",
    "Vigilant Senses",
    "Iron Will",
    "Lightning Reflexes",
    "Alertness",
    "Shield Block",
    "Anathema",
    "Druidic Language",
    "Weapon Expertise",
    "Armor Expertise",
    "Armor Mastery",
    "Darkvision",
    "Stealth",
    "Divine",
    "Shield",
    "Survival",
    "Arcana",
    "Will",
    "Fortitude",
    "Signature Spells",
    "Low-Light Vision",
    "Powerful Fist",
    "Mystic Strikes",
    "Incredible Movement",
    "Claws",
    "Wild Empathy",
    "Aquatic Adaptation",
    "Resolve",
    "Expert Spellcaster",
    "Master Spellcaster",
    "Legendary Spellcaster",
    "Weapon Specialization",
    "Mighty Rage",
    "Deny Advantage",
    "Critical Brutality",
    "Juggernaut",
    "Medium Armor Expertise",
    "Weapon Specialization (Barbarian)",
    "Greater Weapon Specialization",
    "Diplomacy",
    "Improved Evasion",
    "Weapon Mastery",
    "Incredible Senses",
  ];

  static RESTRICTED_ITEMS = ["Bracers of Armor"];

  constructor(actor, { addFeats = true, addEquipment = true, addSpells = true, addMoney = true, addLores = true,
    addWeapons = true, addArmor = true, addTreasure = true, addDeity = true, addName = true, addClass = true } = {}
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
    };
    this.source = null;
    this.parsed = {
      specials: [],
      feats: [],
      equipment: [],
    };
    this.usedLocations = [];
    this.autoAddedFeatureIds = [];
    this.result = {
      character: {
        _id: this.actor.id,
        prototypeToken: {},
      },
      class: [],
      deity: [],
      heritage: [],
      ancestory: [],
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
    this.check = [];
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

  static getSlug(name) {
    return name.toString().toLowerCase().replace(/[^a-z0-9]+/gi, " ").trim().replace(/\s+|-{2,}/g, "-");
  }

  static getSlugNoQuote(name) {
    return name.toString().toLowerCase().replace(/[']+/gi, "").replace(/[^a-z0-9]+/gi, " ").trim().replace(/\s+|-{2,}/g, "-");
  }

  getClassAdjustedSpecialNameLowerCase(name) {
    return `${name} (${this.source.class})`.toLowerCase();
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
    } else {
      return null;
    }
  }

  #processSpecialData(name) {
    if (name.includes("Domain: ")) {
      const domainName = name.split(" ")[1];
      this.parsed.feats.push({ 0: "Deity's Domain", 1: domainName });
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
        const name = e[0];
        const newName = Pathmuncher.EQUIPMENT_MAP.find((item) => item.name == name);
        const item = { name: newName?.new ?? name, qty: e[1], added: false };
        this.parsed.equipment.push(item);
      });
    logger.debug("Finished Equipment Rename");

    logger.debug("Starting Special Rename");
    this.source.specials
      .filter((special) => special !== "undefined" && special !== this.source.heritage)
      .forEach((special) => {
        const name = this.SPECIAL_MAP.find((map) => map.name == special)?.new ?? special;
        if (!this.#processSpecialData(name) && !Pathmuncher.FOUNDRY_SPECIALS.includes(name)) {
          this.parsed.specials.push({ name, added: false });
        }
      });
    logger.debug("Finished Special Rename");

    logger.debug("Starting Feat Rename");
    this.source.feats
      .filter((feat) => feat[0] && feat[0] !== "undefined" && feat[0] !== this.source.heritage)
      .forEach((feat) => {
        const newName = this.SPECIAL_MAP.find((special) => special.name == feat[0]);
        const data = {
          name: newName?.new ?? feat[0],
          extra: feat[1],
          added: false,
          type: feat[2],
          level: feat[3],
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

  // eslint-disable-next-line class-methods-use-this
  async #processGenericCompendiumLookup(compendiumLabel, name, target) {
    const compendium = await game.packs.get(compendiumLabel);
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });

    const indexMatch = index.find((i) =>
      i.system.slug === Pathmuncher.getSlug(name)
      || i.system.slug === Pathmuncher.getSlugNoQuote(name)
    );

    if (indexMatch) {
      const doc = await compendium.getDocument(indexMatch._id);
      this.result[target].push(doc.toObject());
      return true;
    } else {
      return false;
    }
  }

  async #detectGrantedClassFeatures() {
    for (const grantedFeature of Object.values(this.result.class[0].system.items)) {
      const feature = await fromUuid(grantedFeature.uuid);
      if (!feature) {
        logger.debug("Unable to determine granted feature, needs better parser", { grantedFeature, feature });
        continue;
      }
      this.autoAddedFeatureIds.push(feature.id);
      if (!feature.system?.rules) continue;
      for (const grantedSubFeature of feature.system.rules.filter((f) => f.key === "GrantItem")) {
        const subFeature = await fromUuid(grantedSubFeature.uuid);
        if (subFeature) {
          this.autoAddedFeatureIds.push(subFeature.id);
        } else {
          logger.debug("Unable to determine granted feature, needs better parser", { grantedFeature, feature, grantedSubFeature });
        }
      }
    }
  }

  async #processCore() {
    if (!this.options.addName) setProperty(this.result.character, "name", this.source.name);
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

  async #generateFeatItems(compendiumLabel) {
    const compendium = await game.packs.get(compendiumLabel);
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });

    for (const featArray of [this.parsed.feats, this.parsed.specials]) {
      for (const pBFeat of featArray) {

        const indexMatch = index.find((i) =>
          i.system.slug === Pathmuncher.getSlug(pBFeat.name)
          || i.system.slug === Pathmuncher.getSlugNoQuote(pBFeat.name)
          || i.system.slug === Pathmuncher.getSlug(this.getClassAdjustedSpecialNameLowerCase(pBFeat.name))
          || i.system.slug === Pathmuncher.getSlug(this.getAncestryAdjustedSpecialNameLowerCase(pBFeat.name))
          || i.system.slug === Pathmuncher.getSlug(this.getHeritageAdjustedSpecialNameLowerCase(pBFeat.name))
        );
        const displayName = pBFeat.extra ? `${pBFeat.name} (${pBFeat.extra})` : pBFeat.name;
        if (!indexMatch) {
          logger.debug(`Unable to match feat ${displayName}`, { displayName, name: pBFeat.name, extra: pBFeat.extra, pBFeat, compendiumLabel });
          this.check.push({ name: displayName, type: "feat", details: { displayName, name: pBFeat.name, extra: pBFeat.extra, pBFeat, compendiumLabel } });
          continue;
        }
        if (this.result.feats.some((i) => i.name === displayName)) {
          logger.debug("Feat already generated", { displayName, pBFeat, compendiumLabel });
          continue;
        }
        pBFeat.added = true;
        if (this.autoAddedFeatureIds.includes(indexMatch._id)) {
          logger.debug("Feat included in class features auto add", { displayName, pBFeat, compendiumLabel });
          continue;
        }

        const doc = await compendium.getDocument(indexMatch._id);
        const item = doc.toObject();
        item.name = displayName;

        if (pBFeat.type && pBFeat.level) {
          const location = Pathmuncher.getFoundryFeatLocation(pBFeat.type, pBFeat.level);
          if (!this.usedLocations.includes(location)) {
            item.system.location = location;
            this.usedLocations.push(location);
          }
        }

        this.result.feats.push(item);
      }
    }
  }

  async #generateSpecialItems(compendiumLabel) {
    const compendium = await game.packs.get(compendiumLabel);
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });

    for (const special of this.parsed.specials) {
      if (special.added) return;
      const indexMatch = index.find((i) =>
        i.system.slug === Pathmuncher.getSlug(special.name)
        || i.system.slug === Pathmuncher.getSlugNoQuote(special.name)
        || i.system.slug === Pathmuncher.getSlug(this.getClassAdjustedSpecialNameLowerCase(special.name))
        || i.system.slug === Pathmuncher.getSlugNoQuote(this.getClassAdjustedSpecialNameLowerCase(special.name))
        || i.system.slug === Pathmuncher.getSlug(this.getAncestryAdjustedSpecialNameLowerCase(special.name))
        || i.system.slug === Pathmuncher.getSlugNoQuote(this.getAncestryAdjustedSpecialNameLowerCase(special.name))
        || i.system.slug === Pathmuncher.getSlug(this.getHeritageAdjustedSpecialNameLowerCase(special.name))
        || i.system.slug === Pathmuncher.getSlugNoQuote(this.getHeritageAdjustedSpecialNameLowerCase(special.name))
      );
      if (!indexMatch) {
        logger.debug(`Unable to match special ${special.name}`, { special: special.name, compendiumLabel });
        this.check.push({ name: special.name, type: "special", details: { special: special.name, compendiumLabel } });
        continue;
      }
      if (this.result.feats.some((i) => i.name === special.name)) {
        logger.debug("Special already generated", { special: special.name, compendiumLabel });
        continue;
      }
      special.added = true;
      if (this.autoAddedFeatureIds.includes(indexMatch._id)) {
        logger.debug("Special included in class features auto add", { special: special.name, compendiumLabel });
        continue;
      }

      const doc = await compendium.getDocument(indexMatch._id);
      this.result.feats.push(doc.toObject());
    }
  }

  async #generateEquipmentItems() {
    const compendium = game.packs.get("pf2e.equipment-srd");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });
    const compendiumBackpack = await compendium.getDocument("3lgwjrFEsQVKzhh7");

    const adventurersPack = this.parsed.equipment.find((e) => e.name === "Adventurer's Pack");
    const backpackInstance = adventurersPack ? compendiumBackpack.toObject() : null;
    if (backpackInstance) {
      adventurersPack.added = true;
      this.result.adventurersPack.item = adventurersPack;
      this.result.equipment.push(backpackInstance);
    }

    for (const e of this.parsed.equipment.filter((e) => e.name !== "Adventurer's Pack")) {
      const indexMatch = index.find((i) =>
        i.system.slug === Pathmuncher.getSlug(e.name)
        || i.system.slug === Pathmuncher.getSlugNoQuote(e.name)
      );
      if (!indexMatch) {
        logger.error(`Unable to match ${e.name}`, e);
        this.bad.push({ name: e.name, type: "equipment", details: { e } });
        continue;
      }

      const doc = await compendium.getDocument(indexMatch._id);
      if (doc.type != "kit") {
        const itemData = doc.toObject();
        itemData.system.quantity = e.qty;
        const type = doc.type === "treasure" ? "treasure" : "equipment";
        this.result[type].push(itemData);
      }
    }

    for (const e of this.result.adventurersPack.contents) {
      const indexMatch = index.find((i) => i.system.slug === e.slug);
      if (!indexMatch) {
        logger.error(`Unable to match adventurers kit item ${e.name}`, e);
        continue;
      }

      const doc = await compendium.getDocument(indexMatch._id);
      const itemData = doc.toObject();
      itemData.system.quantity = e.qty;
      itemData.system.containerId = backpackInstance?._id;
      this.result.equipment.push(itemData);
    }
  }

  async #generateWeaponItems() {
    const compendium = game.packs.get("pf2e.equipment-srd");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });

    for (const w of this.source.weapons) {
      const indexMatch = index.find((i) =>
        i.system.slug === Pathmuncher.getSlug(w.name)
        || i.system.slug === Pathmuncher.getSlugNoQuote(w.name)
      );
      if (!indexMatch) {
        logger.error(`Unable to match weapon item ${w.name}`, w);
        this.bad.push({ name: w.name, type: "weapon", details: { w } });
        continue;
      }

      const doc = await compendium.getDocument(indexMatch._id);
      const itemData = doc.toObject();
      itemData.system.quantity = w.qty;
      itemData.system.damage.die = w.die;
      itemData.system.potencyRune.value = w.pot;
      itemData.system.strikingRune.value = w.str;

      if (w.runes[0]) itemData.system.propertyRune1.value = utils.camelCase(w.runes[0]);
      if (w.runes[1]) itemData.system.propertyRune2.value = utils.camelCase(w.runes[1]);
      if (w.runes[2]) itemData.system.propertyRune3.value = utils.camelCase(w.runes[2]);
      if (w.runes[3]) itemData.system.propertyRune4.value = utils.camelCase(w.runes[3]);
      if (w.mat) {
        const material = w.mat.split(" (")[0];
        itemData.system.preciousMaterial.value = utils.camelCase(material);
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

    for (const a of this.source.armor) {
      const indexMatch = index.find((i) =>
        i.system.slug === Pathmuncher.getSlug(a.name)
        || i.system.slug === Pathmuncher.getSlugNoQuote(a.name)
        || i.system.slug === Pathmuncher.getSlug(`${a.name} Armor`)
        || i.system.slug === Pathmuncher.getSlugNoQuote(`${a.name} Armor`)
      );
      if (!indexMatch) {
        logger.error(`Unable to match armor kit item ${a.name}`, a);
        this.bad.push({ name: a.name, type: "armor", details: { a } });
        continue;
      }

      const doc = await compendium.getDocument(indexMatch._id);
      const itemData = doc.toObject();
      itemData.system.quantity = a.qty;
      itemData.system.category = a.prof;
      itemData.system.potencyRune.value = a.pot;
      itemData.system.resiliencyRune.value = a.res;
      itemData.system.equipped.value = a.worn ?? false;

      if (a.runes[0]) itemData.system.propertyRune1.value = utils.camelCase(a.runes[0]);
      if (a.runes[1]) itemData.system.propertyRune2.value = utils.camelCase(a.runes[1]);
      if (a.runes[2]) itemData.system.propertyRune3.value = utils.camelCase(a.runes[2]);
      if (a.runes[3]) itemData.system.propertyRune4.value = utils.camelCase(a.runes[3]);
      if (a.mat) {
        const material = a.mat.split(" (")[0];
        itemData.system.preciousMaterial.value = utils.camelCase(material);
        itemData.system.preciousMaterialGrade.value = Pathmuncher.getMaterialGrade(a.mat);
      }
      if (a.display) itemData.name = a.display;

      this.result.armor.push(itemData);
      a.added = true;
    }
  }

  async #generateSpellCaster(caster) {
    const magicTradition = caster.magicTradition === "focus" ? "divine" : caster.magicTradition;
    const spellcastingType = caster.magicTradition === "focus" ? caster.magicTradition : caster.spellcastingType;

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
        flexible: false
      },
      slots: {
        slot0: {
          max: caster.perDay[0],
          prepared: [],
          value: caster.perDay[0],
        },
        slot1: {
          max: caster.perDay[1],
          prepared: [],
          value: caster.perDay[1],
        },
        slot2: {
          max: caster.perDay[2],
          prepared: [],
          value: caster.perDay[2],
        },
        slot3: {
          max: caster.perDay[3],
          prepared: [],
          value: caster.perDay[3],
        },
        slot4: {
          max: caster.perDay[4],
          prepared: [],
          value: caster.perDay[4],
        },
        slot5: {
          max: caster.perDay[5],
          prepared: [],
          value: caster.perDay[5],
        },
        slot6: {
          max: caster.perDay[6],
          prepared: [],
          value: caster.perDay[6],
        },
        slot7: {
          max: caster.perDay[7],
          prepared: [],
          value: caster.perDay[7],
        },
        slot8: {
          max: caster.perDay[8],
          prepared: [],
          value: caster.perDay[8],
        },
        slot9: {
          max: caster.perDay[9],
          prepared: [],
          value: caster.perDay[9],
        },
        slot10: {
          max: caster.perDay[10],
          prepared: [],
          value: caster.perDay[10],
        },
      },
      showUnpreparedSpells: { value: true },
    };
    const data = {
      _id: foundry.utils.randomID(),
      name: caster.name,
      type: "spellcastingEntry",
      system: spellcastingEntity,
    };
    this.result.casters.push(data);
    return data;
  }

  async #processSpells() {
    if (!this.options.addSpells) return;

    const compendium = game.packs.get("pf2e.spells-srd");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });

    for (const caster of this.source.spellCasters) {
      if (Number.isInteger(parseInt(caster.focusPoints))) this.result.focusPool += caster.focusPoints;
      caster.instance = await this.#generateSpellCaster(caster);

      for (const spellSelection of caster.spells) {
        const level = spellSelection.level;

        for (const spell of spellSelection.list) {
          console.warn({spell, spellSelection, list: spellSelection.list})
          const indexMatch = index.find((i) =>
            i.system.slug === Pathmuncher.getSlug(spell)
            || i.system.slug === Pathmuncher.getSlugNoQuote(spell)
          );
          if (!indexMatch) {
            logger.error(`Unable to match spell ${spell}`, { spell, spellSelection, caster });
            this.bad.push({ name: spell, type: "spell", details: { spell, spellSelection, caster } });
            continue;
          }

          const doc = await compendium.getDocument(indexMatch._id);
          const itemData = doc.toObject();
          itemData.system.location.heightenedLevel = level;
          itemData.system.location.value = caster.instance._id;
          this.result.spells.push(itemData);
        }
      }
    }

    setProperty(this.result.character, "system.resources.focus.max", this.result.focusPool);
    setProperty(this.result.character, "system.resources.focus.value", this.result.focusPool);
  }

  async #generateLores() {
    if (!this.options.addLores) return;
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
    if (!this.options.addMoney) return;
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
        doc.system.quantity = this.source.money[lookup.type];
        this.result.money.push(doc.toObject());
      }
    }
  }

  async #processFeats() {
    await this.#generateFeatItems("pf2e.feats-srd");
    await this.#generateFeatItems("pf2e.ancestryfeatures");
    await this.#generateSpecialItems("pf2e.actionspf2e");
    await this.#generateSpecialItems("pf2e.ancestryfeatures");
    await this.#generateSpecialItems("pf2e.classfeatures");
  }

  async #processEquipment() {
    await this.#generateEquipmentItems();
    await this.#generateWeaponItems();
    await this.#generateArmorItems();
    await this.#generateMoney();
  }

  async processCharacter() {
    if (!this.source) return;
    this.#prepare();
    await this.#processCore();
    await this.#processGenericCompendiumLookup("pf2e.deities", this.source.deity, "deity");
    await this.#processGenericCompendiumLookup("pf2e.backgrounds", this.source.background, "background");
    await this.#processGenericCompendiumLookup("pf2e.classes", this.source.class, "class");
    await this.#processGenericCompendiumLookup("pf2e.ancestries", this.source.ancestry, "ancestory");
    await this.#processGenericCompendiumLookup("pf2e.heritages", this.source.heritage, "heritage");
    await this.#detectGrantedClassFeatures();
    await this.#processFeats();
    await this.#processEquipment();
    await this.#processSpells();
    await this.#generateLores();
  }

  async updateActor() {
    const moneyIds = this.actor.items.filter((i) =>
      i.type === "treasure"
      && ["Platinum Pieces", "Gold Pieces", "Silver Pieces", "Copper Pieces"].includes(i.name)
    );
    const classIds = this.actor.items.filter((i) => i.type === "class");
    const backgroundIds = this.actor.items.filter((i) => i.type === "background");
    const heritageIds = this.actor.items.filter((i) => i.type === "heritage");
    const ancestryIds = this.actor.items.filter((i) => i.type === "ancestry");
    const treasureIds = this.actor.items.filter((i) => i.type === "treasure" && !moneyIds.includes(i.id));
    const featIds = this.actor.items.filter((i) => i.type === "feat");
    const actionIds = this.actor.items.filter((i) => i.type === "action");
    const equipmentIds = this.actor.items.filter((i) =>
      i.type === "equipment" || i.type === "backpack" || i.type === "consumable"
      || i.type === "weapon" || i.type === "armor"
    );
    const loreIds = this.actor.items.filter((i) => i.type === "lore");
    const spellIds = this.actor.items.filter((i) => i.type === "spell" || i.type === "spellcastingEntry");

    console.warn("ids", {
      moneyIds,
      classIds,
      backgroundIds,
      heritageIds,
      ancestryIds,
      treasureIds,
      featIds,
      actionIds,
      equipmentIds,
      loreIds,
      spellIds,
    });
    // await this.actor.deleteEmbeddedDocuments("Item", deleteIds);
    await this.actor.deleteEmbeddedDocuments("Item", [], { deleteAll: true });

    console.warn(duplicate(this.result));
    await this.actor.update(this.result.character);
    await this.actor.createEmbeddedDocuments("Item", this.result.ancestory);
    await this.actor.createEmbeddedDocuments("Item", this.result.heritage);
    await this.actor.createEmbeddedDocuments("Item", this.result.background);
    await this.actor.createEmbeddedDocuments("Item", this.result.deity);
    await this.actor.createEmbeddedDocuments("Item", this.result.class);
    await this.actor.createEmbeddedDocuments("Item", this.result.feats);
    await this.actor.createEmbeddedDocuments("Item", this.result.lores);
    await this.actor.createEmbeddedDocuments("Item", this.result.casters, { keepId: true });
    await this.actor.createEmbeddedDocuments("Item", this.result.spells);
    await this.actor.createEmbeddedDocuments("Item", this.result.equipment);
    await this.actor.createEmbeddedDocuments("Item", this.result.weapons);
    await this.actor.createEmbeddedDocuments("Item", this.result.armor);
    await this.actor.createEmbeddedDocuments("Item", this.result.treasure);
    await this.actor.createEmbeddedDocuments("Item", this.result.money);
  }
}
