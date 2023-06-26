// these are features which are named differently in pathbuilder to foundry

import utils from "../utils.js";

const POSTFIX_PB_REMOVALS = [
  /(.*) (Racket)$/,
  /(.*) (Style)$/,
  // Cleric +
  /(.*) (Doctrine)$/,
];

const PREFIX_PB_REMOVALS = [
  /^(Arcane Thesis): (.*)/,
  /^(Arcane School): (.*)/,
  /^(The) (.*)/,
  // Cleric +
  /^(Blessing): (.*)/,
];

const PARENTHESIS = [
  /^(.*) \((.*)\)$/,
];

const SPLITS = [
  /^(.*): (.*)/,
];

const SWAPS = [
  /^(Greater) (.*)/,
  /^(Lesser) (.*)/,
  /^(Major) (.*)/,
];

const FEAT_RENAME_STATIC_MAP = [
  { pbName: "Academic", foundryName: "Ustalavic Academic" },
  { pbName: "Academic (Arcana)", foundryName: "Magaambya Academic" },
  { pbName: "Academic (Nature)", foundryName: "Magaambya Academic" },
  { pbName: "Aerialist", foundryName: "Shory Aerialist" },
  { pbName: "Aeromancer", foundryName: "Shory Aeromancer" },
  { pbName: "Ancient-Blooded", foundryName: "Ancient-Blooded Dwarf" },
  { pbName: "Antipaladin [Chaotic Evil]", foundryName: "Antipaladin" },
  { pbName: "Ape", foundryName: "Ape Animal Instinct" },
  { pbName: "Aquatic Eyes (Darkvision)", foundryName: "Aquatic Eyes" },
  { pbName: "Astrology", foundryName: "Saoc Astrology" },
  { pbName: "Battle Ready", foundryName: "Battle-Ready Orc" },
  { pbName: "Bite (Gnoll)", foundryName: "Bite" },
  { pbName: "Bloodline: Genie (Efreeti)", foundryName: "Bloodline: Genie" },
  { pbName: "Bloody Debilitations", foundryName: "Bloody Debilitation" },
  { pbName: "Canoneer", foundryName: "Cannoneer" },
  { pbName: "Cave Climber Kobold", foundryName: "Caveclimber Kobold" },
  { pbName: "Child of Squalor", foundryName: "Child of the Puddles" },
  { pbName: "Chosen One", foundryName: "Chosen of Lamashtu" },
  { pbName: "Cognative Mutagen (Greater)", foundryName: "Cognitive Mutagen (Greater)" },
  { pbName: "Cognative Mutagen (Lesser)", foundryName: "Cognitive Mutagen (Lesser)" },
  { pbName: "Cognative Mutagen (Major)", foundryName: "Cognitive Mutagen (Major)" },
  { pbName: "Cognative Mutagen (Moderate)", foundryName: "Cognitive Mutagen (Moderate)" },
  { pbName: "Cognitive Crossover", foundryName: "Kreighton's Cognitive Crossover" },
  { pbName: "Collegiate Attendant Dedication", foundryName: "Magaambyan Attendant Dedication" },
  { pbName: "Construct Carver", foundryName: "Tupilaq Carver" },
  { pbName: "Cunning Stance", foundryName: "Devrin's Cunning Stance" },
  { pbName: "Constructed (Android)", foundryName: "Constructed" },
  { pbName: "Dazzling Diversion", foundryName: "Devrin's Dazzling Diversion" },
  { pbName: "Deadly Hair", foundryName: "Syu Tak-nwa's Deadly Hair" },
  { pbName: "Deepvision", foundryName: "Deep Vision" },
  { pbName: "Deflect Arrows", foundryName: "Deflect Arrow" },
  { pbName: "Desecrator [Neutral Evil]", foundryName: "Desecrator" },
  { pbName: "Detective Dedication", foundryName: "Edgewatch Detective Dedication" },
  { pbName: "Duelist Dedication (LO)", foundryName: "Aldori Duelist Dedication" },
  { pbName: "Dwarven Hold Education", foundryName: "Dongun Education" },
  { pbName: "Ember's Eyes (Darkvision)", foundryName: "Ember's Eyes" },
  { pbName: "Enhanced Familiar Feat", foundryName: "Enhanced Familiar" },
  { pbName: "Enhanced Fire", foundryName: "Artokus's Fire" },
  { pbName: "Enigma", foundryName: "Enigma Muse" },
  { pbName: "Escape", foundryName: "Fane's Escape" },
  { pbName: "Eye of the Arcane Lords", foundryName: "Eye of the Arclords" },
  { pbName: "Flip", foundryName: "Farabellus Flip" },
  { pbName: "Fourberie", foundryName: "Fane's Fourberie" },
  { pbName: "Ganzi Gaze (Low-Light Vision)", foundryName: "Ganzi Gaze" },
  { pbName: "Guild Agent Dedication", foundryName: "Pathfinder Agent Dedication" },
  { pbName: "Harmful Font", foundryName: "Divine Font" },
  { pbName: "Green Watcher", foundryName: "Greenwatcher" },
  { pbName: "Green Watch Initiate", foundryName: "Greenwatch Initiate" },
  { pbName: "Green Watch Veteran", foundryName: "Greenwatch Veteran" },
  { pbName: "Healing Font", foundryName: "Divine Font" },
  { pbName: "Heatwave", foundryName: "Heat Wave" },
  { pbName: "Heavenseeker Dedication", foundryName: "Jalmeri Heavenseeker Dedication" },
  { pbName: "Heir of the Astrologers", foundryName: "Heir of the Saoc" },
  { pbName: "High Killer Training", foundryName: "Vernai Training" },
  { pbName: "Ice-Witch", foundryName: "Irriseni Ice-Witch" },
  { pbName: "Impeccable Crafter", foundryName: "Impeccable Crafting" },
  { pbName: "Incredible Beastmaster's Companion", foundryName: "Incredible Beastmaster Companion" },
  { pbName: "Interrogation", foundryName: "Bolera's Interrogation" },
  { pbName: "Katana", foundryName: "Katana Weapon Familiarity" },
  { pbName: "Liberator [Chaotic Good]", foundryName: "Liberator" },
  { pbName: "Lumberjack Dedication", foundryName: "Turpin Rowe Lumberjack Dedication" },
  { pbName: "Maestro", foundryName: "Maestro Muse" },
  { pbName: "Major Lesson I", foundryName: "Major Lesson" },
  { pbName: "Major Lesson II", foundryName: "Major Lesson" },
  { pbName: "Major Lesson III", foundryName: "Major Lesson" },
  { pbName: "Mantis God's Grip", foundryName: "Achaekek's Grip" },
  { pbName: "Marked for Death", foundryName: "Mark for Death" },
  { pbName: "Miraculous Spells", foundryName: "Miraculous Spell" },
  { pbName: "Multifarious", foundryName: "Multifarious Muse" },
  { pbName: "Mystic", foundryName: "Nexian Mystic" },
  { pbName: "Paladin [Lawful Good]", foundryName: "Paladin" },
  { pbName: "Parry", foundryName: "Aldori Parry" },
  { pbName: "Polymath", foundryName: "Polymath Muse" },
  { pbName: "Precise Debilitation", foundryName: "Precise Debilitations" },
  { pbName: "Quick Climber", foundryName: "Quick Climb" },
  { pbName: "Raider", foundryName: "Ulfen Raider" },
  { pbName: "Recognise Threat", foundryName: "Recognize Threat" },
  { pbName: "Redeemer [Neutral Good]", foundryName: "Redeemer" },
  { pbName: "Revivification Protocall", foundryName: "Revivification Protocol" },
  { pbName: "Riposte", foundryName: "Aldori Riposte" },
  { pbName: "Rkoan Arts", foundryName: "Rokoan Arts" },
  { pbName: "Saberteeth", foundryName: "Saber Teeth" },
  { pbName: "Scholarly Recollection", foundryName: "Uzunjati Recollection" },
  { pbName: "Scholarly Storytelling", foundryName: "Uzunjati Storytelling" },
  { pbName: "Shamanic Adherent", foundryName: "Rivethun Adherent" },
  { pbName: "Shamanic Disciple", foundryName: "Rivethun Disciple" },
  { pbName: "Shamanic Spiritual Attunement", foundryName: "Rivethun Spiritual Attunement" },
  { pbName: "Skysage Dedication", foundryName: "Oatia Skysage Dedication" },
  { pbName: "Secret Lesson", foundryName: "Janatimo's Lessons" },
  { pbName: "Sentry Dedication", foundryName: "Lastwall Sentry Dedication" },
  { pbName: "Stab and Snag", foundryName: "Stella's Stab and Snag" },
  { pbName: "Tenets of Evil", foundryName: "The Tenets of Evil" },
  { pbName: "Tenets of Good", foundryName: "The Tenets of Good" },
  { pbName: "Tongue of the Sun and Moon", foundryName: "Tongue of Sun and Moon" },
  { pbName: "Tribal Bond", foundryName: "Quah Bond" },
  { pbName: "Tyrant [Lawful Evil]", foundryName: "Tyrant" },
  { pbName: "Vestigal Wings", foundryName: "Vestigial Wings" },
  { pbName: "Virtue-Forged Tattooed", foundryName: "Virtue-Forged Tattoos" },
  { pbName: "Wakizashi", foundryName: "Wakizashi Weapon Familiarity" },
  { pbName: "Warden", foundryName: "Lastwall Warden" },
  { pbName: "Warrior", foundryName: "Warrior Muse" },
  { pbName: "Wary Eye", foundryName: "Eye of Ozem" },
  { pbName: "Wayfinder Resonance Infiltrator", foundryName: "Westyr's Wayfinder Repository" },
  { pbName: "Wind God's Fan", foundryName: "Wind God’s Fan" },
  { pbName: "Wind God’s Fan", foundryName: "Wind God's Fan" },
  // dragons
  { pbName: "Black", foundryName: "Black Dragon" },
  { pbName: "Brine", foundryName: "Brine Dragon" },
  { pbName: "Copper", foundryName: "Copper Dragon" },
  { pbName: "Blue", foundryName: "Blue Dragon" },
  { pbName: "Bronze", foundryName: "Bronze Dragon" },
  { pbName: "Cloud", foundryName: "Cloud Dragon" },
  { pbName: "Sky", foundryName: "Sky Dragon" },
  { pbName: "Brass", foundryName: "Brass Dragon" },
  { pbName: "Underworld", foundryName: "Underworld Dragon" },
  { pbName: "Crystal", foundryName: "Crystal Dragon" },
  { pbName: "Forest", foundryName: "Forest Dragon" },
  { pbName: "Green", foundryName: "Green Dragon" },
  { pbName: "Sea", foundryName: "Sea Dragon" },
  { pbName: "Silver", foundryName: "Silver Dragon" },
  { pbName: "White", foundryName: "White Dragon" },
  { pbName: "Sovereign", foundryName: "Sovereign Dragon" },
  { pbName: "Umbral", foundryName: "Umbral Dragon" },
  { pbName: "Red", foundryName: "Red Dragon" },
  { pbName: "Gold", foundryName: "Gold Dragon" },
  { pbName: "Magma", foundryName: "Magma Dragon" },
  // sizes for fleshwarp
  { pbName: "Medium", foundryName: "med" },
  { pbName: "Small", foundryName: "sm" },
  // Cleric +
  { pbName: "Decree of the Warsworn Ecstacy", foundryName: "Decree of Warsworn Ecstacy" },
  { pbName: "Decree of Warsworn Ecstacy", foundryName: "Decree of the Warsworn Ecstacy" },
];

function generateDynamicNames(pbName) {
  const result = [];
  // if we have a hardcoded map, don't return here
  if (FEAT_RENAME_STATIC_MAP.some((e) => e.pbName === pbName)) return result;
  for (const reg of POSTFIX_PB_REMOVALS) {
    const match = pbName.match(reg);
    if (match) {
      result.push({ pbName, foundryName: match[1], details: match[2] });
    }
  }
  for (const reg of PREFIX_PB_REMOVALS) {
    const match = pbName.match(reg);
    if (match) {
      result.push({ pbName, foundryName: match[2], details: match[1] });
    }
  }
  for (const reg of SPLITS) {
    const match = pbName.match(reg);
    if (match) {
      result.push({ pbName, foundryName: match[2], details: match[1] });
    }
  }
  for (const reg of PARENTHESIS) {
    const match = pbName.match(reg);
    if (match) {
      result.push({ pbName, foundryName: match[1], details: match[2] });
    }
  }
  for (const reg of SWAPS) {
    const match = pbName.match(reg);
    if (match) {
      result.push({ pbName, foundryName: `${match[2]} (${match[1]})`, details: match[2] });
    }
  }
  return result;
}

export function FEAT_RENAME_MAP(pbName = null) {
  const postfixNames = pbName ? generateDynamicNames(pbName) : [];
  return postfixNames.concat(FEAT_RENAME_STATIC_MAP);
}

const SHARED_IGNORE_LIST = [
  "Draconic Rage", // just handled by effects on Draconic Instinct
  "Mirror Initiate Benefit",
  "Spellstrike Specifics",
  "Unarmored",
  "Simple Weapon Expertise",
  "Spellbook",
  "Energy Emanation", // pathbuilder does not pass through a type for this
  "Imprecise Sense", // this gets picked up and added by granted features
];

const IGNORED_FEATS_LIST = [
  // ignore skills listed as feats
  "Acrobatics",
  "Athletics",
  "Deception",
  "Intimidation",
  "Nature",
  "Performance",
  "Society",
  "Survival",
  "Arcana",
  "Crafting",
  "Diplomacy",
  "Medicine",
  "Occultism",
  "Religion",
  "Stealth",
  "Thievery",

  // sizes
  // "Medium",
  // "Small",
];

const IGNORED_SPECIALS_LIST = [

];

export function IGNORED_FEATS() {
  // const visionFeats = utils.setting("ADD_VISION_FEATS") ? [] : ["Low-Light Vision", "Darkvision"];
  return IGNORED_FEATS_LIST.concat(SHARED_IGNORE_LIST);
}

export function IGNORED_SPECIALS() {
  const visionFeats = utils.setting("ADD_VISION_FEATS") ? [] : ["Low-Light Vision", "Darkvision"];
  return IGNORED_SPECIALS_LIST.concat(SHARED_IGNORE_LIST, visionFeats);
}
