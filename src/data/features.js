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
  // content Pathbuilder hasn't finished: "Disciple [Placeholder]" is "Disciple"
  /(.*) (\[Placeholder\])$/i,
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

// a thaumaturge's implement benefits: Pathbuilder's "Amulet Adept Benefit" is pf2e's "Adept Benefit (Amulet)"
const IMPLEMENT_BENEFITS = /^(\w+) ((?:Adept|Paragon) Benefit)$/;

const SWAPS = [
  /^(Greater) (.*)/,
  /^(Lesser) (.*)/,
  /^(Major) (.*)/,
  /^(Moderate) (.*)/,
  /^(Standard) (.*)/,

];

export const FEAT_RENAME_STATIC_MAP = [
  { pbName: "Academic", foundryName: "Ustalavic Academic" },
  { pbName: "Academic (Arcana)", foundryName: "Magaambya Academic" },
  { pbName: "Academic (Nature)", foundryName: "Magaambya Academic" },
  { pbName: "Aerialist", foundryName: "Shory Aerialist" },
  { pbName: "Aeromancer", foundryName: "Shory Aeromancer" },
  { pbName: "Ancient-Blooded", foundryName: "Ancient-Blooded Dwarf" },
  { pbName: "Antipaladin [Chaotic Evil]", foundryName: "Antipaladin", module: "pf2e-legacy-content" },
  { pbName: "Ape", foundryName: "Ape Animal Instinct", module: "pf2e-legacy-content" },
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
  { pbName: "Cognitive Crossover", foundryName: "Kreighton's Cognitive Crossover" },
  { pbName: "Collegiate Attendant Dedication", foundryName: "Magaambyan Attendant Dedication" },
  { pbName: "Construct Carver", foundryName: "Tupilaq Carver" },
  { pbName: "Cunning Stance", foundryName: "Devrin's Cunning Stance" },
  { pbName: "Constructed (Android)", foundryName: "Constructed" },
  { pbName: "Dazzling Diversion", foundryName: "Devrin's Dazzling Diversion" },
  { pbName: "Deadly Hair", foundryName: "Syu Tak-nwa's Deadly Hair" },
  { pbName: "Deepvision", foundryName: "Deep Vision" },
  { pbName: "Deflect Arrows", foundryName: "Deflect Arrow", module: "pf2e-legacy-content" },
  { pbName: "Desecrator [Neutral Evil]", foundryName: "Desecrator", module: "pf2e-legacy-content" },
  { pbName: "Detective Dedication", foundryName: "Edgewatch Detective Dedication" },
  { pbName: "Duelist Dedication (LO)", foundryName: "Aldori Duelist Dedication" },
  { pbName: "Dwarven Hold Education", foundryName: "Dongun Education" },
  { pbName: "Ember's Eyes (Darkvision)", foundryName: "Ember's Eyes" },
  { pbName: "Enhanced Familiar Feat", foundryName: "Enhanced Familiar" },
  { pbName: "Enhanced Fire", foundryName: "Artokus's Fire" },
  { pbName: "Enigma", foundryName: "Enigma Muse", module: "pf2e-legacy-content" },
  { pbName: "Escape", foundryName: "Fane's Escape" },
  { pbName: "Eye of the Arcane Lords", foundryName: "Eye of the Arclords" },
  { pbName: "Flip", foundryName: "Farabellus Flip" },
  { pbName: "Fourberie", foundryName: "Fane's Fourberie" },
  { pbName: "Ganzi Gaze (Low-Light Vision)", foundryName: "Ganzi Gaze", module: "pf2e-legacy-content" },
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
  { pbName: "Katana", foundryName: "Katana Weapon Familiarity", module: "pf2e-legacy-content" },
  { pbName: "Last Survivor", foundryName: "Lastwall Survivor" },
  { pbName: "Liberator [Chaotic Good]", foundryName: "Liberator", module: "pf2e-legacy-content" },
  { pbName: "Lumberjack Dedication", foundryName: "Turpin Rowe Lumberjack Dedication" },
  { pbName: "Lumberjack", foundryName: "Lumber Consortium Laborer" },
  { pbName: "Maestro", foundryName: "Maestro Muse", module: "pf2e-legacy-content" },
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
  { pbName: "Paladin [Lawful Good]", foundryName: "Paladin", module: "pf2e-legacy-content" },
  { pbName: "Parry", foundryName: "Aldori Parry" },
  { pbName: "Polymath", foundryName: "Polymath Muse", module: "pf2e-legacy-content" },
  { pbName: "Precise Debilitation", foundryName: "Precise Debilitations" },
  { pbName: "Prodigy", foundryName: "Merabite Prodigy" },
  { pbName: "Quick Climber", foundryName: "Quick Climb" },
  { pbName: "Raider", foundryName: "Ulfen Raider" },
  { pbName: "Recognise Threat", foundryName: "Recognize Threat" },
  { pbName: "Redeemer [Neutral Good]", foundryName: "Redeemer", module: "pf2e-legacy-content" },
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
  { pbName: "Tenets of Evil", foundryName: "The Tenets of Evil", module: "pf2e-legacy-content" },
  { pbName: "Tenets of Good", foundryName: "The Tenets of Good", module: "pf2e-legacy-content" },
  { pbName: "Tongue of the Sun and Moon", foundryName: "Tongue of Sun and Moon" },
  { pbName: "Tribal Bond", foundryName: "Quah Bond" },
  { pbName: "Tyrant [Lawful Evil]", foundryName: "Tyrant", module: "pf2e-legacy-content" },
  { pbName: "Vestigal Wings", foundryName: "Vestigial Wings" },
  { pbName: "Virtue-Forged Tattooed", foundryName: "Virtue-Forged Tattoos" },
  { pbName: "Wakizashi", foundryName: "Wakizashi Weapon Familiarity", module: "pf2e-legacy-content" },
  { pbName: "Warden", foundryName: "Lastwall Warden" },
  { pbName: "Warrior", foundryName: "Warrior Muse", module: "pf2e-legacy-content" },
  { pbName: "Wary Eye", foundryName: "Eye of Ozem" },
  { pbName: "Wayfinder Resonance Infiltrator", foundryName: "Westyr's Wayfinder Repository" },
  { pbName: "Wind God's Fan", foundryName: "Wind God’s Fan" },
  { pbName: "Wind God’s Fan", foundryName: "Wind God's Fan" },

  // Pathfinder backgrounds Pathbuilder names without their place, people or organisation
  { pbName: "Ancient Researcher", foundryName: "Azlanti Researcher" },
  { pbName: "Anti-Tyrant Saboteur", foundryName: "Anti-Thrune Saboteur" },
  { pbName: "Anti-Tyrant Saboteur (Deception)", foundryName: "Anti-Thrune Saboteur" },
  { pbName: "Anti-Tyrant Saboteur (Thievery)", foundryName: "Anti-Thrune Saboteur" },
  { pbName: "Badlands Anthropologist", foundryName: "Belkzen Anthropologist" },
  { pbName: "Exile From Tyranny", foundryName: "Chelaxian Exile" },
  { pbName: "Gold Hand Arms Dealer", foundryName: "Goldhand Arms Dealer" },
  { pbName: "Itinerant Epicurean", foundryName: "Kartaji Epicurean" },
  { pbName: "Itinerant Epicurean (Crafting)", foundryName: "Kartaji Epicurean" },
  { pbName: "Itinerant Epicurean (Society)", foundryName: "Kartaji Epicurean" },
  { pbName: "Ocean Wanderer", foundryName: "Obari Wanderer" },
  { pbName: "Ocean Wanderer (Acrobatics)", foundryName: "Obari Wanderer" },
  { pbName: "Ocean Wanderer (Survival)", foundryName: "Obari Wanderer" },
  { pbName: "Press-Ganged", foundryName: "Press-Ganged (G&G)" },
  { pbName: "Revolutionary", foundryName: "Bachuan Revolutionary" },
  { pbName: "Society Recruiter", foundryName: "Pathfinder Recruiter" },
  { pbName: "Sojourner", foundryName: "Alkenstar Sojourner" },
  { pbName: "Tribal Reclaimer", foundryName: "Isgeri Reclaimer" },
  { pbName: "Wishes for Riches", foundryName: "Wish for Riches" },

  // Pathfinder heritages, feats and features Pathbuilder names without their god, place or people
  { pbName: "Deny Calamity", foundryName: "Deny Lady Nanbyo's Charity" },
  { pbName: "Basic Spirit Spellcasting", foundryName: "Basic Rivethun Spellcasting" },
  { pbName: "College Actor Dedication", foundryName: "Kitharodian Actor Dedication" },
  { pbName: "Diabolic Scion Dedication", foundryName: "Chelaxian Scion Dedication" },
  { pbName: "Expert Spirit Spellcasting", foundryName: "Expert Rivethun Spellcasting" },
  { pbName: "For Freedom!", foundryName: "For Talmandor! For Freedom!" },
  { pbName: "Forest Ambush", foundryName: "Verduran Ambush" },
  { pbName: "Forest Shadow Dedication", foundryName: "Verduran Shadow Dedication" },
  { pbName: "Gnomish Snare Engineering", foundryName: "Brastlewark Snare Engineering" },
  { pbName: "Horselord Dedication", foundryName: "Nidalese Horselord Dedication" },
  { pbName: "Infused With Might", foundryName: "Infused with Belkzen's Might" },
  { pbName: "Lightning Surgeon Dedication", foundryName: "Lepidstadt Surgeon Dedication" },
  { pbName: "Lust's Devotion", foundryName: "Sorshen's Devotion" },
  { pbName: "Master Spirit Spellcasting", foundryName: "Master Rivethun Spellcasting" },
  { pbName: "Naga Goddess' Light", foundryName: "Nalinivati's Light" },
  { pbName: "Priest of the Living God Dedication", foundryName: "Razmiran Priest Dedication" },
  { pbName: "Prophet of Trade Dedication", foundryName: "Prophet of Kalistrade Dedication" },
  { pbName: "Scholarly Excision", foundryName: "Vellumis Excision" },
  { pbName: "Speak for the Undead Wastelands", foundryName: "Speak for the Gravelands" },
  { pbName: "Spirit Adept", foundryName: "Rivethun Adept" },
  { pbName: "Spirit Devotion", foundryName: "Rivethun Devotion" },
  { pbName: "Spirit Emissary Dedication", foundryName: "Rivethun Emissary Dedication" },
  { pbName: "Spirit Invoker Dedication", foundryName: "Rivethun Invoker Dedication" },
  { pbName: "Spirit Involutionist Dedication", foundryName: "Rivethun Involutionist Dedication" },
  { pbName: "Starstone's Freedom", foundryName: "Cayden's Freedom" },
  { pbName: "Starstone's Innovation", foundryName: "Aroden's Innovation" },
  { pbName: "Starstone's Secret", foundryName: "Norgorber's Secret" },
  { pbName: "Starstone's Valor", foundryName: "Iomedae's Valor" },
  { pbName: "Swift Sower", foundryName: "Tiller's Drive", module: "pf2e-legacy-content" },
  { pbName: "Sword Duelist Dedication", foundryName: "Aldori Duelist Dedication" },
  { pbName: "Sword Parry", foundryName: "Aldori Parry" },
  { pbName: "Sword Riposte", foundryName: "Aldori Riposte" },
  { pbName: "Sword's Retort", foundryName: "Aldori's Retort" },
  { pbName: "Swordlord", foundryName: "Aldori Swordlord" },
  { pbName: "The Traveler", foundryName: "Cobyslarni" },
  { pbName: "Viking Guard Dedication", foundryName: "Ulfen Guard Dedication" },
  // spelled differently
  { pbName: "Curse of Living Death", foundryName: "Curse of the Living Death" },
  { pbName: "Lesson of the Elements", foundryName: "Lesson of Elements" },
  { pbName: "Lotus Above the Mud", foundryName: "Lotus Above the Wind" },
  { pbName: "Mirror's Trickery", foundryName: "Mirror-Trickery" },
  { pbName: "No Hands, No Problems", foundryName: "No Hands, No Problem" },
  { pbName: "Vermilion Threads", foundryName: "Vermillion Threads" },
  // archetype feats pf2e names after their archetype, as another archetype has one of the same
  // name; Pathbuilder has only this one
  { pbName: "Improved Familiar", foundryName: "Improved Familiar (Familiar Master)" },
  { pbName: "Rallying Charge", foundryName: "Rallying Charge (Marshal)" },
  { pbName: "Snap Out of It!", foundryName: "Snap Out of It! (Marshal)" },
  { pbName: "Startling Appearance", foundryName: "Startling Appearance (Vigilante)" },

  // Starfinder backgrounds Pathbuilder names without their place, people or organisation
  { pbName: "Acolyte", foundryName: "Acolyte (Grave World)", system: "sf2e" },
  { pbName: "Activist", foundryName: "Akitonian Activist", system: "sf2e" },
  { pbName: "Ancient Survivor", foundryName: "Ancient Elebrian", system: "sf2e" },
  { pbName: "Convict", foundryName: "Daegox Convict", system: "sf2e" },
  { pbName: "Creche Born", foundryName: "Crèche Born", system: "sf2e" },
  { pbName: "Grave World Local", foundryName: "Eoxian Local", system: "sf2e" },
  { pbName: "Lore Archivist", foundryName: "Lorespire Archivist", system: "sf2e" },
  { pbName: "Red Planet Explorer", foundryName: "Akitonian Explorer", system: "sf2e" },
  { pbName: "Star Hopeful", foundryName: "Starfinder Hopeful", system: "sf2e" },
  { pbName: "Star Hopeful (Acrobatics)", foundryName: "Starfinder Hopeful", system: "sf2e" },
  { pbName: "Star Hopeful (Athletics)", foundryName: "Starfinder Hopeful", system: "sf2e" },
  { pbName: "Star Snoop", foundryName: "Starfinder Snoop", system: "sf2e" },
  { pbName: "Station Local", foundryName: "Absalom Local", system: "sf2e" },
  { pbName: "Trapsmith", foundryName: "Starfinder Trapsmith", system: "sf2e" },

  // Starfinder heritages
  { pbName: "Battle Dancer's Chosen Pahtra", foundryName: "Meyel's Chosen Pahtra", system: "sf2e" },
  { pbName: "Creche-Raise Sarcesian", foundryName: "Crèche-Raised Sarcesian", system: "sf2e" },
  { pbName: "Deadwood Khizar", foundryName: "Deadwood", system: "sf2e" },
  { pbName: "Delver Orc", foundryName: "Apostae Delver Orc", system: "sf2e" },
  { pbName: "Diplomat Trox", foundryName: "Hylaxian Diplomat Trox", system: "sf2e" },
  { pbName: "Hall Attendant Shirren", foundryName: "Nchaki Attendant Shirren", system: "sf2e" },
  { pbName: "Home World Izalguun", foundryName: "Izalraan Izalguun", system: "sf2e" },
  { pbName: "Homeland Elf", foundryName: "Sovyrian Elf", system: "sf2e" },
  { pbName: "Homeworld Survivor Human", foundryName: "Golarion Survivor Human", system: "sf2e" },
  { pbName: "Huskworld Cutoff Shirren", foundryName: "Krethiskar Cutoff Shirren", system: "sf2e" },
  { pbName: "Inflorescent Khizar", foundryName: "Inflorescent", system: "sf2e" },
  { pbName: "Low Gravity Kasatha", foundryName: "Akitonian Kasatha", system: "sf2e" },
  { pbName: "Nomad Shobhad", foundryName: "Akitonian Nomad Shobhad", system: "sf2e" },
  { pbName: "Partyanimal and Chemistry Whiz Phasorq", foundryName: "Party Animal and Chemistry Whiz Phasorq", system: "sf2e" },
  { pbName: "Petrified Khizar", foundryName: "Petrified", system: "sf2e" },
  { pbName: "Psychic Messenger Mecenai", foundryName: "Psychic Messenger Mecenaic", system: "sf2e" },
  { pbName: "Runja Mechanic Hardor", foundryName: "Runha Mechanic Hardor", system: "sf2e" },
  { pbName: "Scrapper Ysoki", foundryName: "Akitonian Ysoki", system: "sf2e" },
  { pbName: "Song of the Ice Ord", foundryName: "Song of Ice Ord", system: "sf2e" },
  { pbName: "Subterranean Skittermander", foundryName: "Gadraveech Skittermander", system: "sf2e" },
  { pbName: "Trailblazer Orc", foundryName: "Tabori Trailblazer Orc", system: "sf2e" },
  { pbName: "Warhawk Orc", foundryName: "Marixan Warhawk Orc", system: "sf2e" },
  { pbName: "Wildseed Khizar", foundryName: "Wildseed", system: "sf2e" },

  // Starfinder feats and features
  { pbName: "Ancestral Faithful", foundryName: "Aspalasch Faithful", system: "sf2e" },
  { pbName: "Ancestral Worshipper", foundryName: "Aspalasch Worshipper", system: "sf2e" },
  { pbName: "Antennae", foundryName: "Yaraesa's Antennae", system: "sf2e" },
  { pbName: "Barrage of the Goddess", foundryName: "Iomedae's Barrage", system: "sf2e" },
  { pbName: "Battery Hack", foundryName: "Akiton Battery Hack", system: "sf2e" },
  { pbName: "Battle Dancer's Melody", foundryName: "Meyel's Melody", system: "sf2e" },
  { pbName: "Chosen", foundryName: "Chosen of Nchak", system: "sf2e" },
  { pbName: "Conqueror's Claw", foundryName: "Damoritosh's Claw", system: "sf2e" },
  { pbName: "Corp Rep Dedication", foundryName: "AbadarCorp Rep Dedication", system: "sf2e" },
  { pbName: "Durable LMAS", foundryName: "Durable IMAS", system: "sf2e" },
  { pbName: "Field Agent Dedication", foundryName: "Starfinder Field Agent Dedication", system: "sf2e" },
  { pbName: "Forge God's Protection", foundryName: "Torag's Protection", system: "sf2e" },
  { pbName: "Gatherer's Lore", foundryName: "Izalraan Gatherer's Lore", system: "sf2e" },
  { pbName: "Hardor Darkvision", foundryName: "Dorjo Darkvision", system: "sf2e" },
  { pbName: "Helm of the Goddess", foundryName: "Iomedae's Helm", system: "sf2e" },
  { pbName: "Home World Survivor", foundryName: "Rodnarth Survivor", system: "sf2e" },
  { pbName: "Hunter's Shot", foundryName: "Izalraan Hunter's Shot", system: "sf2e" },
  { pbName: "In Her Name", foundryName: "In Hylax's Name", system: "sf2e" },
  { pbName: "Knight of the Lost World Dedication", foundryName: "Knight of Golarion Dedication", system: "sf2e" },
  { pbName: "Leader's Ingenuity", foundryName: "Izalraan Leader's Ingenuity", system: "sf2e" },
  { pbName: "Legendary Grip", foundryName: "Damoritosh's Grip", system: "sf2e" },
  { pbName: "Maraquoi Athlete", foundryName: "Maratan Athlete", system: "sf2e" },
  // sf2e spells it "Men"
  { pbName: "Menacing Mien", foundryName: "Menacing Men", system: "sf2e" },
  { pbName: "Recite History", foundryName: "Recite Gap History", system: "sf2e" },
  { pbName: "Shield of the Goddess", foundryName: "Iomedae's Shield", system: "sf2e" },
  { pbName: "Society Provisions", foundryName: "Starfinder Provisions", system: "sf2e" },
  { pbName: "Softstep", foundryName: "Pulonis Softstep", system: "sf2e" },
  { pbName: "Sword of the Goddess", foundryName: "Iomedae's Sword", system: "sf2e" },
  { pbName: "Tailspin", foundryName: "Meyel's Tailspin", system: "sf2e" },
  { pbName: "Thought-Piercing Horn", foundryName: "Thought-Piercing Horns", system: "sf2e" },
  { pbName: "Vesk Logistics Specialist", foundryName: "Veskarium Logistics Specialist", system: "sf2e" },
  { pbName: "Warblood of Conquest", foundryName: "Warblood of Damoritosh", system: "sf2e" },
  // a mystic's connection and a mechanic's exocortex, which sf2e names without the word
  { pbName: "Akashic Connection", foundryName: "Akashic", system: "sf2e" },
  { pbName: "Elemental Connection", foundryName: "Elemental", system: "sf2e" },
  { pbName: "Healing Connection", foundryName: "Healing", system: "sf2e" },
  { pbName: "Rhythm Connection", foundryName: "Rhythm", system: "sf2e" },
  { pbName: "Shadow Connection", foundryName: "Shadow", system: "sf2e" },
  { pbName: "Drone Exocortex", foundryName: "Drone", system: "sf2e" },
  { pbName: "Mine Exocortex", foundryName: "Mine", system: "sf2e" },
  { pbName: "Turret Exocortex", foundryName: "Turret", system: "sf2e" },

  // Cleric +
  { pbName: "Decree of the Warsworn Ecstacy", foundryName: "Decree of Warsworn Ecstacy", module: "clerics" },
  { pbName: "Decree of Warsworn Ecstacy", foundryName: "Decree of the Warsworn Ecstacy", module: "clerics" },

  // remaster
  { pbName: "Lightning Reflexes", foundryName: "Reflex Expertise" },
  { pbName: "Great Fortitude", foundryName: "Fortitude Expertise" },
  { pbName: "Iron Will", foundryName: "Will Expertise" },
  { pbName: "Alertness", foundryName: "Perception Expertise" },
  { pbName: "Incredible Senses", foundryName: "Perception Legend" },
  { pbName: "Vigilant Senses", foundryName: "Perception Mastery" },
  { pbName: "Versatile Heritage", foundryName: "Versatile Human" },
  { pbName: "Divine Ally (Shield)", foundryName: "Shield Ally", module: "pf2e-legacy-content" },
  { pbName: "Divine Ally (Steed)", foundryName: "Steed Ally", module: "pf2e-legacy-content" },
  { pbName: "Divine Ally (Blade)", foundryName: "Blade Ally", module: "pf2e-legacy-content" },
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
];

/**
 * Pathbuilder names for the options of a choice, not compendium items: the dragon a draconic
 * bloodline, Dragonblood or a kobold takes ("Red" is the "Red Dragon" option) and a fleshwarp's size
 * ("Medium" is "med"). They are looked up with the other renames (FEAT_RENAME_MAP), but there is no
 * compendium item to check them against.
 */
export const CHOICE_VALUE_RENAMES = [
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
  if (FEAT_RENAME_STATIC_MAP.concat(CHOICE_VALUE_RENAMES).some((e) => e.pbName === pbName)) return result;
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
  const benefit = pbName.match(IMPLEMENT_BENEFITS);
  if (benefit) result.push({ pbName, foundryName: `${benefit[2]} (${benefit[1]})`, details: benefit[1] });
  return result;
}

/**
 * Class features Pathbuilder names differently for one class, by class: the thaumaturge starts expert
 * in Perception, so the step Pathbuilder calls its "Perception Expertise" (level 9) is pf2e's
 * Perception Mastery.
 */
const CLASS_FEATURE_RENAMES = {
  Thaumaturge: [
    { pbName: "Perception Expertise", foundryName: "Perception Mastery" },
  ],
};

/**
 * Options of a choice Pathbuilder records under another name, by the item making the choice: the
 * special Pathbuilder lists and the value of the option it stands for.
 */
const CHOICE_ALIASES = {
  // an automaton's Lesser Augmentation: pf2e's "Gain additional resistances"
  "Lesser Augmentation": { "Extra Resistances": "all" },
};

/** Other names Pathbuilder may record a choice's option under (CHOICE_ALIASES). */
export function choiceAliases(itemName, choice) {
  return Object.entries(CHOICE_ALIASES[itemName] ?? {})
    .filter(([, value]) => value === choice.value)
    .map(([pbName]) => pbName);
}

// items whose dragon Pathbuilder names on its own ("Executor"), where pf2e's option is "Executor Dragon"
const BARE_DRAGON_ITEMS = ["Dragonblood"];

/**
 * The name Pathbuilder gives an item's dragon option, for items that name it on its own: "Executor"
 * for Dragonblood's "Executor Dragon". Only that name counts for them, since "<X> Dragon" is what a
 * sorcerer's draconic bloodline ("Draconic (Adamantine)") is read as. null for other items.
 */
export function bareDragonName(itemName, label) {
  return BARE_DRAGON_ITEMS.includes(itemName) ? label.match(/^(.+) Dragon$/)?.[1] ?? null : null;
}

/** The renames for a class's features (CLASS_FEATURE_RENAMES): [{ pbName, foundryName }]. */
export function classFeatureRenames(className) {
  return CLASS_FEATURE_RENAMES[className] ?? [];
}

export function FEAT_RENAME_MAP(pbName = null) {
  const postfixNames = pbName ? generateDynamicNames(pbName) : [];
  return postfixNames.concat(FEAT_RENAME_STATIC_MAP, CHOICE_VALUE_RENAMES);
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
  "Low-Light Vision", "Darkvision", "Thralls",
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
  // the psychopomp eidolon's first ability
  [/^Shepherd's Touch$/, "Spirit Touch"],
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
