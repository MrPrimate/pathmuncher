// these are features which are named differently in pathbuilder to foundry

const POSTFIX_PB_REMOVALS = [
  /(.*) Racket$/
];

const FEAT_RENAME_STATIC_MAP = [
  { pbName: "Deflect Arrows", foundryName: "Deflect Arrow" },
  { pbName: "Maestro", foundryName: "Maestro Muse" },
  { pbName: "Tenets of Evil", foundryName: "The Tenets of Evil" },
  { pbName: "Antipaladin [Chaotic Evil]", foundryName: "Antipaladin" },
  { pbName: "Paladin [Lawful Good]", foundryName: "Paladin" },
  { pbName: "Redeemer [Neutral Good]", foundryName: "Redeemer" },
  { pbName: "Liberator [Chaotic Good]", foundryName: "Liberator" },
  { pbName: "Tyrant [Lawful Evil]", foundryName: "Tyrant" },
  { pbName: "Desecrator [Neutral Evil]", foundryName: "Desecrator" },
  { pbName: "Harmful Font", foundryName: "Divine Font" },
  { pbName: "Healing Font", foundryName: "Divine Font" },
  { pbName: "Deepvision", foundryName: "Deep Vision" },
  { pbName: "Wind God's Fan", foundryName: "Wind God’s Fan" },
  { pbName: "Redeemer [Neutral Good]", foundryName: "Redeemer" },
  { pbName: "Enigma", foundryName: "Enigma Muse" },
  { pbName: "Polymath", foundryName: "Polymath Muse" },
  { pbName: "Warrior", foundryName: "Warrior Muse" },
  { pbName: "Multifarious", foundryName: "Multifarious Muse" },
  { pbName: "Constructed (Android)", foundryName: "Constructed" },
  { pbName: "Wakizashi", foundryName: "Wakizashi Weapon Familiarity" },
  { pbName: "Katana", foundryName: "Katana Weapon Familiarity" },
  { pbName: "Marked for Death", foundryName: "Mark for Death" },
  { pbName: "Precise Debilitation", foundryName: "Precise Debilitations" },
  { pbName: "Major Lesson I", foundryName: "Major Lesson" },
  { pbName: "Major Lesson II", foundryName: "Major Lesson" },
  { pbName: "Major Lesson III", foundryName: "Major Lesson" },
  { pbName: "Eye of the Arcane Lords", foundryName: "Eye of the Arclords" },
  { pbName: "Aeromancer", foundryName: "Shory Aeromancer" },
  { pbName: "Heatwave", foundryName: "Heat Wave" },
  { pbName: "Bloodline: Genie (Efreeti)", foundryName: "Bloodline: Genie" },
  { pbName: "Bite (Gnoll)", foundryName: "Bite" },
  { pbName: "Cognative Mutagen (Greater)", foundryName: "Cognitive Mutagen (Greater)" },
  { pbName: "Cognative Mutagen (Lesser)", foundryName: "Cognitive Mutagen (Lesser)" },
  { pbName: "Cognative Mutagen (Major)", foundryName: "Cognitive Mutagen (Major)" },
  { pbName: "Cognative Mutagen (Moderate)", foundryName: "Cognitive Mutagen (Moderate)" },
  { pbName: "Recognise Threat", foundryName: "Recognize Threat" },
  { pbName: "Enhanced Familiar Feat", foundryName: "Enhanced Familiar" },
  { pbName: "Aquatic Eyes (Darkvision)", foundryName: "Aquatic Eyes" },
  { pbName: "Heir of the Astrologers", foundryName: "Heir of the Saoc" },
  { pbName: "Precise Debilitation", foundryName: "Precise Debilitations" },
  { pbName: "Heatwave", foundryName: "Heat Wave" },
  { pbName: "Detective Dedication", foundryName: "Edgewatch Detective Dedication" },
  { pbName: "Flip", foundryName: "Farabellus Flip" },
  { pbName: "Interrogation", foundryName: "Bolera's Interrogation" },
  { pbName: "Wind God’s Fan", foundryName: "Wind God's Fan" },
  { pbName: "Rkoan Arts", foundryName: "Rokoan Arts" },
  { pbName: "Virtue-Forged Tattooed", foundryName: "Virtue-Forged Tattoos" },
  { pbName: "Bloody Debilitations", foundryName: "Bloody Debilitation" },
  { pbName: "Cave Climber Kobold", foundryName: "Caveclimber Kobold" },
  { pbName: "Tribal Bond", foundryName: "Quah Bond" },
  { pbName: "Tongue of the Sun and Moon", foundryName: "Tongue of Sun and Moon" },
  { pbName: "Aerialist", foundryName: "Shory Aerialist" },
  { pbName: "Aeromancer", foundryName: "Shory Aeromancer" },
  { pbName: "Ganzi Gaze (Low-Light Vision)", foundryName: "Ganzi Gaze" },
  { pbName: "Saberteeth", foundryName: "Saber Teeth" },
  { pbName: "Vestigal Wings", foundryName: "Vestigial Wings" },
  { pbName: "Chosen One", foundryName: "Chosen of Lamashtu" },
  { pbName: "Ice-Witch", foundryName: "Irriseni Ice-Witch" },
  { pbName: "Construct Carver", foundryName: "Tupilaq Carver" },
  { pbName: "Deadly Hair", foundryName: "Syu Tak-nwa's Deadly Hair" },
  { pbName: "Revivification Protocall", foundryName: "Revivification Protocol" },
  { pbName: "Ember's Eyes (Darkvision)", foundryName: "Ember's Eyes" },
  { pbName: "Astrology", foundryName: "Saoc Astrology" },
  { pbName: "Ape", foundryName: "Ape Animal Instinct" },
  { pbName: "Duelist Dedication (LO)", foundryName: "Aldori Duelist Dedication" },
  { pbName: "Parry", foundryName: "Aldori Parry" },
  { pbName: "Riposte", foundryName: "Aldori Riposte" },
  { pbName: "Sentry Dedication", foundryName: "Lastwall Sentry Dedication" },
  { pbName: "Wary Eye", foundryName: "Eye of Ozem" },
  { pbName: "Warden", foundryName: "Lastwall Warden" },
  { pbName: "Heavenseeker Dedication", foundryName: "Jalmeri Heavenseeker Dedication" },
  { pbName: "Mantis God's Grip", foundryName: "Achaekek's Grip" },
  { pbName: "High Killer Training", foundryName: "Vernai Training" },
  { pbName: "Guild Agent Dedication", foundryName: "Pathfinder Agent Dedication" },
  { pbName: "Wayfinder Resonance Infiltrator", foundryName: "Westyr's Wayfinder Repository" },
  { pbName: "Collegiate Attendant Dedication", foundryName: "Magaambyan Attendant Dedication" },
  { pbName: "Scholarly Storytelling", foundryName: "Uzunjati Storytelling" },
  { pbName: "Scholarly Recollection", foundryName: "Uzunjati Recollection" },
  { pbName: "Secret Lesson", foundryName: "Janatimo's Lessons" },
  { pbName: "Lumberjack Dedication", foundryName: "Turpin Rowe Lumberjack Dedication" },
  { pbName: "Fourberie", foundryName: "Fane's Fourberie" },
  { pbName: "Incredible Beastmaster's Companion", foundryName: "Incredible Beastmaster Companion" },
  { pbName: "Polymath", foundryName: "Polymath Muse" },
  { pbName: "Escape", foundryName: "Fane's Escape" },
  { pbName: "Quick Climber", foundryName: "Quick Climb" },
  { pbName: "Stab and Snag", foundryName: "Stella's Stab and Snag" },
  { pbName: "Cognitive Crossover", foundryName: "Kreighton's Cognitive Crossover" },
  { pbName: "Heir of the Astrologers", foundryName: "Heir of the Saoc" },
  { pbName: "Astrology", foundryName: "Saoc Astrology" },
];

function generatePostfixNames(pbName) {
  const result = [];
  for (const reg of POSTFIX_PB_REMOVALS) {
    const match = pbName.match(reg);
    if (match) {
      result.push({ pbName, foundryName: match[1] });
    }
  }
  return result;
}

export function FEAT_RENAME_MAP(pbName = null) {
  const postfixNames = pbName ? generatePostfixNames(pbName) : [];
  return postfixNames.concat(FEAT_RENAME_STATIC_MAP);
}

export const IGNORED_FEATS = [
  "Unarmored"
];
