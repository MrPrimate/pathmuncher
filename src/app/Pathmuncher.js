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

  constructor(actor, { addFeats = true, addEquipment = true, addSpells = true, addMoney = true } = {}) {
    this.actor = actor;
    this.options = {
      addMoney: addMoney,
      addFeats: addFeats,
      addSpells: addSpells,
      addEquipment: addEquipment,
    };
    this.source = null;
    this.parsed = {
      specials: [],
      feats: [],
      equipment: [],
    };
    this.result = {
      character: {
        _id: this.actor.id,
        prototypeToken: {},
      },
      items: {},
    };
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
        const item = [newName?.new ?? name, e[2]];
        this.parsed.equipment.push(item);
      });
    logger.debug("Finished Equipment Rename");

    logger.debug("Starting Special Rename");
    this.source.specials
      .filter((special) => special !== "undefined" && special !== this.source.heritage)
      .forEach((special) => {
        const newName = this.SPECIAL_MAP.find((map) => map.name == special);
        if (!this.#processSpecialData(special)) this.parsed.specials.push(newName?.new ?? special);
      });
    logger.debug("Finished Special Rename");

    logger.debug("Starting Feat Rename");
    this.source.feats
      .filter((f) => f[0] && f[0] !== "undefined" && f[0] !== this.source.heritage)
      .forEach((f) => {
        const name = f[0];
        const newName = this.SPECIAL_MAP.find((special) => special.name == name);
        if (newName?.new) f[0] = newName.new;
        this.parsed.feats.push(f[0]);
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

  async #processCore() {
    setProperty(this.result.character, "name", this.source.name);
    setProperty(this.result.character, "prototypeToken.name", this.source.name);
    setProperty(this.result.character, "system.details.level", this.source.level);
    if (this.source.age !== "Not set") setProperty(this.result.character, "system.details.age.value", this.source.age);
    if (this.source.gender !== "Not set") setProperty(this.result.character, "system.details.gender.value", this.source.gender);
    setProperty(this.result.character, "system.details.alignment.value", this.source.alignment);
    setProperty(this.result.character, "system.details.keyability.value", this.source.keyability);
    setProperty(this.result.character, "system.details.deity.value", this.source.deity);

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

  async processCharacter() {
    if (!this.source) return;
    this.#prepare();
    this.#processCore();
  }

  async updateActor() {
    await this.actor.deleteEmbeddedDocuments("Item", [], { deleteAll: true });
    await this.actor.update(this.result.character);
    await this.actor.createEmbeddedDocuments("Item", this.result.items);
  }
}
