// these are features which are named differently in pathbuilder to foundry

export const IGNORE_MULTISELECT = [
  "Gate Junction",
];

const SKILL_LOOKUP = {
  "acrobatics": "acr",
  "arcana": "arc",
  "athletics": "ath",
  "crafting": "cra",
  "deception": "dec",
  "diplomacy": "dip",
  "intimidation": "itm",
  "medicine": "med",
  "nature": "nat",
  "occultism": "occ",
  "performance": "prf",
  "religion": "rel",
  "society": "soc",
  "stealth": "ste",
  "survival": "sur",
  "thievery": "thi",
};

const POSTFIX_PB_REMOVALS = [
  /(.*) (Racket)$/,
  /(.*) (Style)$/,
  /(.*) (Initiate Benefit)$/,
  /(.*) Mystery$/,
  // Cleric +
  /(.*) (Doctrine)$/,
  /(.*) (Element)$/,
  /(.*) (Impulse Junction)$/,
  /(.*) (Gate Junction:).*$/,
  /(.*) (Patron)$/,
  // Necromancer's Grim Fascination: Pathbuilder's "Bone Fascination" is pf2e's "Bone"
  /(.*) (Fascination)$/,
  // a sorcerer's bloodline with its kind: "Bloodline: Draconic (Divine)" is pf2e's "Bloodline: Draconic"
  /^(Bloodline: [^(]+?) \((.*)\)$/,
  // Champion's cause: "Desecration Cause (Unholy)" and "Justice Cause" are pf2e's "Desecration" and "Justice"
  /(.*) (Cause)(?: \((?:Holy|Unholy)\))?$/,
  // a witch's lessons: "Major Lesson I" is pf2e's "Major Lesson"
  /^((?:Basic|Greater|Major) Lesson) (I|II|III)$/,
  // /(Fork) the Path/,
  // /(Expand) the Portal/,
];

const PREFIX_PB_REMOVALS = [
  /^(Arcane Thesis): (.*)/,
  /^(Arcane School): (.*)/,
  /^(The) (.*)/,
  // Cleric +
  /^(Blessing): (.*)/,
  /^(Empiricism) Selected Skill: (.*)/,
];

const POSTFIX_PB_SPLIT_AND_KEEP = [
  /(\w+) (Impulse) Junction/,
  /(\w+) Gate Junction: (\w+) /,
  /(\w+) Gate Junction: (.*)$/,
];

const POSTFIX_PB_SPLIT_AND_KEEP_2 = [
  // /\w+ (Gate Junction): (\w+ \w+)$/,
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
  /^(Moderate) (.*)/,
  /^(Standard) (.*)/,

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
  { pbName: "Last Survivor", foundryName: "Lastwall Survivor" },
  { pbName: "Liberator [Chaotic Good]", foundryName: "Liberator" },
  { pbName: "Lumberjack Dedication", foundryName: "Turpin Rowe Lumberjack Dedication" },
  { pbName: "Lumberjack", foundryName: "Lumber Consortium Laborer" },
  { pbName: "Maestro", foundryName: "Maestro Muse" },
  { pbName: "Mercenary", foundryName: "Molthuni Mercenary" },
  { pbName: "Major Lesson I", foundryName: "Major Lesson" },
  { pbName: "Major Lesson II", foundryName: "Major Lesson" },
  { pbName: "Major Lesson III", foundryName: "Major Lesson" },
  { pbName: "Mantis God's Grip", foundryName: "Achaekek's Grip" },
  { pbName: "Marked for Death", foundryName: "Mark for Death" },
  { pbName: "Miraculous Spells", foundryName: "Miraculous Spell" },
  { pbName: "Multifarious", foundryName: "Multifarious Muse" },
  { pbName: "Mystic", foundryName: "Nexian Mystic" },
  { pbName: "Outlaw", foundryName: "Alkenstar Outlaw" },
  { pbName: "Paladin [Lawful Good]", foundryName: "Paladin" },
  { pbName: "Parry", foundryName: "Aldori Parry" },
  { pbName: "Polymath", foundryName: "Polymath Muse" },
  { pbName: "Precise Debilitation", foundryName: "Precise Debilitations" },
  { pbName: "Prodigy", foundryName: "Merabite Prodigy" },
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
  { pbName: "Slayer", foundryName: "Belkzen Slayer" },
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

  // remaster
  { pbName: "Lightning Reflexes", foundryName: "Reflex Expertise" },
  { pbName: "Great Fortitude", foundryName: "Fortitude Expertise" },
  { pbName: "Iron Will", foundryName: "Will Expertise" },
  { pbName: "Alertness", foundryName: "Perception Expertise" },
  { pbName: "Incredible Senses", foundryName: "Perception Legend" },
  { pbName: "Vigilant Senses", foundryName: "Perception Mastery" },
  { pbName: "Versatile Heritage", foundryName: "Versatile Human" },
  { pbName: "Divine Ally (Shield)", foundryName: "Shield Ally" },
  { pbName: "Divine Ally (Steed)", foundryName: "Steed Ally" },
  { pbName: "Divine Ally (Blade)", foundryName: "Blade Ally" },
  { pbName: "Skilled Heritage", foundryName: "Skilled Human" },

  // kinetisct
  { pbName: "Air Element", foundryName: "Air Gate" },
  { pbName: "Earth Element", foundryName: "Earth Gate" },
  { pbName: "Fire Element", foundryName: "Fire Gate" },
  { pbName: "Metal Element", foundryName: "Metal Gate" },
  { pbName: "Water Element", foundryName: "Water Gate" },
  { pbName: "Wood Element", foundryName: "Wood Gate" },

  // semi-official
  { pbName: "Ifrit", foundryName: "Naari" },

  { pbName: "Superstitious Instinct", foundryName: "Superstition Instinct" },
  { pbName: "Harbinger's Claw", foundryName: "Harbinger's Caw" },
  { pbName: "Premonition's Reflexes", foundryName: "Premonition Reflexes" },
  // a class's weapon expertise, which pf2e calls plain "Weapon Expertise" for these classes
  { pbName: "Thaumaturge Weapon Expertise", foundryName: "Weapon Expertise" },
  { pbName: "Wizard Weapon Expertise", foundryName: "Weapon Expertise" },

  // Advanced Player's Guide versatile heritages Pathbuilder still offers; the remaster's Nephilim replaced both
  { pbName: "Aasimar", foundryName: "Nephilim" },
  { pbName: "Tiefling", foundryName: "Nephilim" },

  // dragonblood
  { pbName: "Adamantine", foundryName: "Adamantine Dragon" },
  { pbName: "Conspirator", foundryName: "Conspirator Dragon" },
  { pbName: "Diabolical", foundryName: "Diabolical Dragon" },
  { pbName: "Empyreal", foundryName: "Empyreal Dragon" },
  { pbName: "Fortune", foundryName: "Fortune Dragon" },
  { pbName: "Horned", foundryName: "Horned Dragon" },
  { pbName: "Mirage", foundryName: "Mirage Dragon" },
  { pbName: "Omen", foundryName: "Omen Dragon" },
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
      const parsed = { pbName, foundryName: match[2], details: match[1] };
      parsed.foundryValue = SKILL_LOOKUP[parsed.foundryName.toLowerCase()];
      result.push(parsed);
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
  "Titan Mauler", // not needed
  "Energy Emanation", // pathbuilder does not pass through a type for this
  "Imprecise Sense", // this gets picked up and added by granted features
  "Imprecise Scent", // this gets picked up and added by granted features
  "Sanctification", // choose on import
  "No special vision", // Pathbuilder label for an ancestry without darkvision or low-light vision
  "Neither", // a cleric's sanctification when it is neither holy nor unholy
  "Master Rogue", // the rogue's class DC becoming master at 19, which the class item applies
  "Deity Skill", // the skill a cleric's or champion's deity trains, which the deity item applies
  "Holy Aura", // the sanctification of Champion's Aura, which pathmuncher imports as Champion's Aura
  "Unholy Aura",
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

  "Reincarnation Feat",
];

const IGNORED_SPECIALS_LIST = [
  "Low-Light Vision", "Darkvision",
];

export function IGNORED_FEATS() {
  return IGNORED_FEATS_LIST.concat(SHARED_IGNORE_LIST);
}

export function IGNORED_SPECIALS() {
  return IGNORED_SPECIALS_LIST;
}

export function specialOnlyNameLookup(name) {
  for (const [key, value] of Object.entries(SKILL_LOOKUP)) {
    if (key === name.toLowerCase()) {
      return { pbName: name, foundryName: name, foundryValue: value };
    }
  }
  return undefined;
}


// the remaster's names for the genies Pathbuilder still names the old way
const GENIE_NAMES = { Djinni: "Jaathoom", Efreeti: "Ifrit", Marid: "Faydhaan", Shaitan: "Jabali", Janni: "Janni" };

/**
 * The option a sorcerer's bloodline choice takes, as pf2e labels it: "Draconic (Requiem)" is the
 * "Requiem Dragon", "Bloodline: Draconic (Divine)" the "Divine Dragon" when no particular dragon is
 * named, "Bloodline: Elemental (Air)" is "Air" and "Bloodline: Genie (Djinni)" the "Jaathoom".
 */
function bloodlineChoices(specials) {
  const dragon = specials.map((s) => s.match(/^Draconic \((.*)\)$/)?.[1]).find(Boolean);
  return specials.flatMap((special) => {
    const [, bloodline, kind] = special.match(/^Bloodline: ([^(]+?) \((.*)\)$/) ?? [];
    if (bloodline === "Draconic") return [`${dragon ?? kind} Dragon`];
    if (bloodline === "Elemental") return [kind];
    if (bloodline === "Genie") return [GENIE_NAMES[kind] ?? kind];
    return [];
  });
}

export function SPECIAL_NAME_ADDITIONS(specials) {
  const newSpecials = bloodlineChoices(specials);

  for (const special of specials) {
    for (const reg of POSTFIX_PB_SPLIT_AND_KEEP) {
      const match = special.match(reg);
      if (match) {
        newSpecials.push(match[2]);
      }
    }
    for (const reg of POSTFIX_PB_SPLIT_AND_KEEP_2) {
      const match = special.match(reg);
      if (match) {
        newSpecials.push(`${match[1]} (${match[2]})`);
      }
    }
  }
  return newSpecials;
}

// a Kineticist's gate junctions as Pathbuilder names them: "Earth Gate Junction: Critical Blast", "Water Impulse Junction"
const GATE_JUNCTION = /^(\w+) Gate Junction: (.+)$/;
const IMPULSE_JUNCTION = /^(\w+) Impulse Junction$/;

/**
 * A Kineticist's gate thresholds, from Pathbuilder's specials, which list them in level order:
 * each "Expand the Portal" or "Fork the Path", and for an expansion the junction special that
 * follows it. [{ threshold, path, element, junction, special, additions }]: threshold counts from 1,
 * path is "expand" or "fork", element is lower case ("earth"), junction is the option's name as pf2e
 * labels it ("Critical Blast", "Skill"), special is Pathbuilder's name for it, and additions the
 * other entries that special adds (SPECIAL_NAME_ADDITIONS). An expansion without a junction special
 * has no element or junction.
 */
export function kineticGatePlan(specials = []) {
  const plan = [];
  for (const special of specials) {
    const expansion = plan.at(-1);
    const junction = special.match(GATE_JUNCTION) ?? special.match(IMPULSE_JUNCTION);
    if (special === "Expand the Portal" || special === "Fork the Path") {
      plan.push({ threshold: plan.length + 1, path: special === "Expand the Portal" ? "expand" : "fork" });
    } else if (junction && expansion?.path === "expand" && !expansion.special) {
      // the junction special that follows an expansion; a single gate's own first Impulse junction comes before any
      Object.assign(expansion, {
        element: junction[1].toLowerCase(),
        junction: (junction[2] ?? "Impulse").replace(/ Junction$/, ""),
        special,
        additions: SPECIAL_NAME_ADDITIONS([special]),
      });
    }
  }
  return plan;
}

/**
 * Which kinetic gate choice a Pathbuilder impulse slot is, from the slot label it exports an impulse
 * feat under: { gate: "single", index } for a single gate's two ("Single Gate Element Impulse Feat 1"),
 * { gate: "dual", element } for a dual gate's first or second element ("Dual Gate Element 2 Impulse Feat
 * 0"), { threshold: level, path: "fork" } for the new element of a Fork the Path ("Gate's Threshold
 * (Level 5) Element Choice Impulse Feat 0"), and { threshold: level, path: "expand" } for an Expand the
 * Portal ("Gate's Threshold (Level 9) Impulse Feat"). Null for any other label.
 */
export function kineticImpulseSlot(label) {
  const text = String(label ?? "");
  const single = text.match(/^Single Gate Element Impulse Feat (\d+)$/);
  if (single) return { gate: "single", index: Number(single[1]) };
  const dual = text.match(/^Dual Gate Element (\d+) Impulse Feat \d+$/);
  if (dual) return { gate: "dual", element: Number(dual[1]) };
  const threshold = text.match(/^Gate's Threshold \(Level (\d+)\) (Element Choice )?Impulse Feat/);
  if (threshold) return { threshold: Number(threshold[1]), path: threshold[2] ? "fork" : "expand" };
  return null;
}

/**
 * The Impulse junction a single gate comes with, which Pathbuilder lists as a special ("Air Impulse
 * Junction") before any threshold: [{ special, additions }], additions being the other entries that
 * special adds (SPECIAL_NAME_ADDITIONS).
 */
export function kineticGateOwnJunctions(specials = []) {
  const firstThreshold = specials.findIndex((s) => s === "Expand the Portal" || s === "Fork the Path");
  return specials.slice(0, firstThreshold === -1 ? specials.length : firstThreshold)
    .filter((special) => IMPULSE_JUNCTION.test(special))
    .map((special) => ({ special, additions: SPECIAL_NAME_ADDITIONS([special]) }));
}

// rules terms the remaster renamed, which Pathbuilder still uses in feature names
const REMASTER_TERMS = [
  [/\bNegative\b/g, "Void"],
  [/\bPositive\b/g, "Vitality"],
];

/** The name and its remastered form, if it has one: ["Negative Healing", "Void Healing"]. */
export function remasterTermNames(name) {
  const remastered = REMASTER_TERMS.reduce((result, [term, replacement]) => result.replace(term, replacement), name);
  return remastered === name ? [name] : [name, remastered];
}

const NO_AUTO_CHOICE_LIST = [
  // "Elemental Evolution",
];

export function NO_AUTO_CHOICE() {
  return NO_AUTO_CHOICE_LIST;
}

const BAD_IGNORE_FEATURES_LIST = [
  // "Impulse Juntion",
];

const BAD_IGNORE_POSTFIX_PB_REMOVALS = [
  // /(.*) (Impulse Junction)$/,
];

export function BAD_IGNORE_FEATURES(name) {
  if (BAD_IGNORE_FEATURES_LIST.some((f) => f === name)) return true;

  for (const reg of BAD_IGNORE_POSTFIX_PB_REMOVALS) {
    const match = name.match(reg);
    if (match) {
      return true;
    }
  }
  return false;
};
