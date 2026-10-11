const SWAPS = [
  /^(Greater) (.*)/,
  /^(Lesser) (.*)/,
  /^(Major) (.*)/,
  /^(Moderate) (.*)/,
  /^(Standard) (.*)/,
];

const POSTFIX_PB_REMOVALS = [
  /(.*) (- Melee)$/,
  /(.*) (- Ranged)$/,
  /(.*) - (.*)/,
];

const PARENTHESIS = [
  /^(.*) \((.*)\)$/,
];

const SPLITS = [
  // /^(.*) - (.*)/,
];

const SPLITS_INVERT = [
  /^(.*): (.*)/,
  /^(Charm of Resistance) - (.*)/,
];

const REPLACES = [
  { pbName: "Ring of Energy Resistance", foundryName: "Charm of Resistance" },
  { pbName: "Feather Token", foundryName: "Marvelous Miniature" },
  { pbName: "Goggles of Night", foundryName: "Obsidian Goggles" },
];

// this equipment is named differently in foundry vs pathbuilder
export const EQUIPMENT_RENAME_STATIC_MAP = [
  { pbName: "Basic Corrective Lenses", foundryName: "Corrective Lenses" },
  { pbName: "Inventor Power Suit", foundryName: "Power Suit" },
  { pbName: "Inventor Power Suit (Heavy)", foundryName: "Power Suit" },
  { pbName: "Inventor Subterfuge Suit", foundryName: "Subterfuge Suit" },
  { pbName: "Chain", foundryName: "Chain (10 feet)" },
  { pbName: "Oil", foundryName: "Oil (1 pint)" },
  { pbName: "Bracelets of Dashing", foundryName: "Bracelet of Dashing" },
  { pbName: "Fingerprinting Kit", foundryName: "Fingerprint Kit" },
  { pbName: "Ladder", foundryName: "Ladder (10-foot)" },
  { pbName: "Mezmerizing Opal", foundryName: "Mesmerizing Opal" },
  // { pbName: "Explorer's Clothing", foundryName: "Clothing (Explorer's)" },
  { pbName: "Clothing (Winter)", foundryName: "Clothing (Cold-Weather)" },
  { pbName: "Flaming Star (Greater)", foundryName: "Greater Flaming Star", module: "pf2e-legacy-content" },
  { pbName: "Potion of Lesser Darkvision", foundryName: "Darkvision Elixir (Lesser)" },
  { pbName: "Potion of Greater Darkvision", foundryName: "Darkvision Elixir (Greater)" },
  { pbName: "Potion of Moderate Darkvision", foundryName: "Darkvision Elixir (Moderate)" },
  { pbName: "Bottled Sunlight", foundryName: "Formulated Sunlight" },
  { pbName: "Magazine (Repeating Hand Crossbow)", foundryName: "Repeating Hand Crossbow Magazine" },
  { pbName: "Magazine (Repeating Crossbow)", foundryName: "Repeating Crossbow Magazine" },
  { pbName: "Magazine (Air Repeater)", foundryName: "Magazine with 6 Pellets" },
  { pbName: "Magazine (Long Air Repeater)", foundryName: "Magazine with 8 Pellets" },
  { pbName: "Astrolabe (Standard)", foundryName: "Standard Astrolabe" },
  { pbName: "Skinitch Salve", foundryName: "Skinstitch Salve" },
  { pbName: "Flawless Scale", foundryName: "Abadar's Flawless Scale" },
  { pbName: "Construct Key", foundryName: "Cordelia's Construct Key" },
  { pbName: "Construct Key (Greater)", foundryName: "Cordelia's Greater Construct Key" },
  { pbName: "Lesser Swapping Stone", foundryName: "Bonmuan Swapping Stone (Lesser)" },
  { pbName: "Major Swapping Stone", foundryName: "Bonmuan Swapping Stone (Major)" },
  { pbName: "Moderate Swapping Stone", foundryName: "Bonmuan Swapping Stone (Moderate)" },
  { pbName: "Greater Swapping Stone", foundryName: "Bonmuan Swapping Stone (Greater)" },
  { pbName: "Heartstone", foundryName: "Skarja's Heartstone" },
  // { pbName: "Bullets (10 rounds)", foundryName: "Sling Bullets" },
  { pbName: "Hide", foundryName: "Hide Armor" },
  { pbName: "Soverign Glue", foundryName: "Sovereign Glue", module: "pf2e-legacy-content" },
  { pbName: "Axe Musket - Melee", foundryName: "Axe Musket" },
  { pbName: "Axe Musket - Ranged", foundryName: "Axe Musket" },
  { pbName: "Extendible Pincer", foundryName: "Extendable Pincer" },
  { pbName: "Clothing (Explorer's)", foundryName: "Explorer's Clothing" },
  { pbName: "Repair Kit", foundryName: "Repair Toolkit" },
  { pbName: "Repair Kit (Superb)", foundryName: "Repair Toolkit (Superb)" },
  { pbName: "Alchemist's Tools", foundryName: "Alchemist's Toolkit" },
  { pbName: "Healer's Tools", foundryName: "Healer's Toolkit" },
  { pbName: "Healer's Tools (Expanded)", foundryName: "Healer's Toolkit (Expanded)" },
  { pbName: "Thieves' Tools", foundryName: "Thieves' Toolkit" },
  { pbName: "Thieves' Tools (Infiltrator)", foundryName: "Thieves' Toolkit (Infiltrator)" },
  { pbName: "Thieves' Tools (Infiltrator Picks)", foundryName: "Thieves' Toolkit (Infiltrator Picks)" },
  { pbName: "Artisan's Tools", foundryName: "Artisan's Toolkit" },
  { pbName: "Artisan's Tools (Sterling)", foundryName: "Artisan's Toolkit (Sterling)" },

  { pbName: "Aeon Stone (Dull Grey)", foundryName: "Aeon Stone (Consumed)" },
  { pbName: "Aeon Stone (Clear Spindle)", foundryName: "Aeon Stone (Nourishing)" },
  { pbName: "Aeon Stone (Tourmaline Sphere)", foundryName: "Aeon Stone (Delaying)" },
  { pbName: "Aeon Stone (Orange Prism)", foundryName: "Aeon Stone (Amplifying)" },
  { pbName: "Bag of Holding", foundryName: "Spacious Pouch (Type I)" },
  { pbName: "Barkskin Potion", foundryName: "Oak Potion" },
  { pbName: "Boots of Speed", foundryName: "Propulsive Boots" },
  { pbName: "Bracers of Armor", foundryName: "Bands of Force" },
  { pbName: "Broom of Flying", foundryName: "Flying Broomstick" },
  { pbName: "Dagger of Venom", foundryName: "Serpent Dagger" },
  { pbName: "Energy Robe (Fire)", foundryName: "Energy Robe of Fire" },
  { pbName: "Energy Robe (Cold)", foundryName: "Energy Robe of Cold" },
  { pbName: "Energy Robe (Acid)", foundryName: "Energy Robe of Acid" },
  { pbName: "Energy Robe (Electricity)", foundryName: "Energy Robe of Electricity" },
  // these are actually matched to energy type witch Pathbuilder does not support
  { pbName: "Dragon's Breath Potion (Young)", foundryName: "Energy Breath Potion (Lesser)", module: "pf2e-legacy-content" },
  { pbName: "Dragon's Breath Potion (Adult)", foundryName: "Energy Breath Potion (Moderate)", module: "pf2e-legacy-content" },
  { pbName: "Dragon's Breath Potion (Wyrm)", foundryName: "Energy Breath Potion (Greater)", module: "pf2e-legacy-content" },
  { pbName: "Druid's Vestments", foundryName: "Living Mantle" },
  { pbName: "Everburning Torch", foundryName: "Everlight Crystal" },
  { pbName: "Eyes of the Eagle", foundryName: "Eyes of the Cat" },
  { pbName: "Feather Token (Chest)", foundryName: "Marvelous Miniature (Chest)" },
  { pbName: "Feather Token (Ladder)", foundryName: "Marvelous Miniature (Ladder)" },
  { pbName: "Feather Token (Swan Boat)", foundryName: "Marvelous Miniature (Boat)" },
  { pbName: "Flame Tongue", foundryName: "Searing Blade" },
  { pbName: "Gloves of Storing", foundryName: "Retrieval Belt" },
  { pbName: "Goggles of Night", foundryName: "Obsidian Goggles" },
  { pbName: "Goggles of Night (Greater)", foundryName: "Obsidian Goggles (Greater)" },
  { pbName: "Goggles of Night (Major)", foundryName: "Obsidian Goggles (Major)" },
  { pbName: "Hat of Disguise", foundryName: "Masquerade Scarf" },
  { pbName: "Hat of Disguise (Greater)", foundryName: "Masquerade Scarf (Greater)" },
  { pbName: "Horn of Fog", foundryName: "Cloud Pouch" },
  { pbName: "Horseshoes of Speed", foundryName: "Alacritous Horseshoes" },
  { pbName: "Javelin of Lightning", foundryName: "Trident of Lightning" },
  { pbName: "Potion of Expeditious Retreat", foundryName: "Potion of Emergency Escape" },
  { pbName: "Ring of Energy Resistance (Greater)", foundryName: "Charm of Resistance (Greater)" },
  { pbName: "Ring of Energy Resistance (Major)", foundryName: "Charm of Resistance (Major)" },
  { pbName: "Silversheen", foundryName: "Silver Salve" },
  { pbName: "Smokestick (Lesser)", foundryName: "Smoke Ball (Lesser)" },
  { pbName: "Smokestick (Greater)", foundryName: "Smoke Ball (Greater)" },
  { pbName: "Sunrod", foundryName: "Glow Rod" },
  { pbName: "Tanglefoot Bag (Lesser)", foundryName: "Glue Bomb (Lesser)" },
  { pbName: "Tanglefoot Bag (Moderate)", foundryName: "Glue Bomb (Moderate)" },
  { pbName: "Tanglefoot Bag (Major)", foundryName: "Glue Bomb (Major)" },
  { pbName: "Tanglefoot Bag (Greater)", foundryName: "Glue Bomb (Greater)" },
  { pbName: "Tindertwig", foundryName: "Matchstick" },
  { pbName: "Owlbear Claw", foundryName: "Predator's Claw" },
  { pbName: "Wand of Manifold Missiles", foundryName: "Wand of Shardstorm" },
  { pbName: "Wand of Manifold Missiles (1st-Level Spell)", foundryName: "Wand of Shardstorm (1st-Rank Spell)" },
  { pbName: "Wand of Manifold Missiles (3rd-Level Spell)", foundryName: "Wand of Shardstorm (3rd-Rank Spell)" },
  { pbName: "Wand of Manifold Missiles (5th-Level Spell)", foundryName: "Wand of Shardstorm (5th-Rank Spell)" },
  { pbName: "Wand of Manifold Missiles (7th-Level Spell)", foundryName: "Wand of Shardstorm (7th-Rank Spell)" },
  { pbName: "Black Powder (Dose or Round)", foundryName: "Black Powder (Dose)" },
  { pbName: "Cognative Mutagen (Greater)", foundryName: "Cognitive Mutagen (Greater)" },
  { pbName: "Cognative Mutagen (Lesser)", foundryName: "Cognitive Mutagen (Lesser)" },
  { pbName: "Cognative Mutagen (Major)", foundryName: "Cognitive Mutagen (Major)" },
  { pbName: "Cognative Mutagen (Moderate)", foundryName: "Cognitive Mutagen (Moderate)" },
  { pbName: "Weapon Striking", foundryName: "Striking" },
  { pbName: "Weapon Striking (Greater)", foundryName: "Striking (Greater)" },
  { pbName: "Weapon Striking (Major)", foundryName: "Striking (Major)" },
  { pbName: "Travel Suit", foundryName: "Abadarcorp Travel Suit", system: "sf2e" },
  { pbName: "Imperial Plate", foundryName: "Veskarium Imperial Plate", system: "sf2e" },

  // Pathfinder items Pathbuilder names without their god, place, people or maker
  { pbName: "Astonishing Ink (Minor)", foundryName: "Dr. Ushernacht's Astonishing Ink (Minor)" },
  { pbName: "Astonishing Ink (Moderate)", foundryName: "Dr. Ushernacht's Astonishing Ink (Moderate)" },
  { pbName: "Astonishing Ink (Major)", foundryName: "Dr. Ushernacht's Astonishing Ink (Major)" },
  { pbName: "Dueling Sword", foundryName: "Aldori Dueling Sword" },
  { pbName: "General's Edge", foundryName: "Draddeth's Edge" },
  { pbName: "Hornbow", foundryName: "Hongali Hornbow" },
  { pbName: "Imperium Colossus Crusher", foundryName: "Jistkan Colossus Crusher" },
  { pbName: "Imperium War Crossbow", foundryName: "Jistkan War Crossbow" },
  { pbName: "Iron Phalanx", foundryName: "Alkenstar Phalanx" },
  { pbName: "Luminescent Toadstool", foundryName: "Kimanéz Luminescent Toadstool" },
  { pbName: "Mantis God's Kiss", foundryName: "Achaekek's Kiss" },
  { pbName: "Mask of the Living God", foundryName: "Razmiri Mask" },
  { pbName: "Mask of the Living God (Silver)", foundryName: "Razmiri Mask (Silver)" },
  { pbName: "Mask of the Living God (Gold)", foundryName: "Razmiri Mask (Gold)" },
  { pbName: "Mask of the Living God (Porcelain)", foundryName: "Razmiri Mask (Porcelain)" },
  { pbName: "Orc Deadsmasher", foundryName: "Belkzen Deadsmasher" },
  { pbName: "Orc Deadsmasher (Greater)", foundryName: "Belkzen Deadsmasher (Greater)" },
  { pbName: "Rough Beast's Mud", foundryName: "Rovagug's Mud" },
  { pbName: "Rough Beast's Mud (Greater)", foundryName: "Rovagug's Mud (Greater)" },
  { pbName: "Thorn of the Everbloom (Lesser)", foundryName: "Thorn of Milani (Lesser)" },
  { pbName: "Thorn of the Everbloom (Moderate)", foundryName: "Thorn of Milani (Moderate)" },
  { pbName: "Vambrace of the Forge God", foundryName: "Vambrace of Gorum" },
  { pbName: "Viking Shieldbreaker", foundryName: "Ulfen Shieldbreaker" },
  // Pathfinder items named or graded differently
  { pbName: "Bakuwa Bony Plates", foundryName: "Bakuwa Lizardfolk Bony Plates" },
  { pbName: "Bortled Favorite", foundryName: "Bortled Favorite (Lesser)" },
  { pbName: "Bravery Baldric (Stoneskin)", foundryName: "Bravery Baldric (Stone)" },
  { pbName: "Cloak of Waves and Clouds", foundryName: "Cloak of Waves & Clouds" },
  { pbName: "Coral Plate", foundryName: "Coral Armor" },
  { pbName: "Crimson Godsblood Serum", foundryName: "Crimson Godsblood Serum (Lesser)" },
  { pbName: "Day's Breath (One Day)", foundryName: "One Day's Breath" },
  { pbName: "Day's Breath (Three Days)", foundryName: "Three Day's Breath" },
  { pbName: "Day's Breath (Ten Days)", foundryName: "Ten Day's Breath" },
  { pbName: "Elven Chain", foundryName: "Elven Chain (Standard-Grade)" },
  { pbName: "Energu Toxin Bottle", foundryName: "Energy Toxin Bottle" },
  { pbName: "Loaded Dice", foundryName: "Games (Loaded Dice)" },
  { pbName: "Loadstone Shield", foundryName: "Lodestone Shield" },
  { pbName: "Magentic Suit", foundryName: "Magnetic Suit" },
  { pbName: "Magentic Suit (Greater)", foundryName: "Magnetic Suit (Greater)" },
  { pbName: "Magentic Suit (Major)", foundryName: "Magnetic Suit (Major)" },
  { pbName: "Mantle of the Amazing Health", foundryName: "Mantle of Amazing Health" },
  { pbName: "Mariner's Mien (Moderate)", foundryName: "Mariner’s Mien (Greater)" },
  { pbName: "Moonkeep Flowers (Hyacinth)", foundryName: "Moonkeep Hyacinth" },
  { pbName: "Moonkeep Flowers (Lily)", foundryName: "Moonkeep Lily" },
  { pbName: "Moonkeep Flowers (Orchid)", foundryName: "Moonkeep Orchid" },
  { pbName: "Musket Staff of the Void", foundryName: "Musket Staff of Void" },
  { pbName: "Portable Weapon Mount (Tripod, Shielded)", foundryName: "Portable Weapon Mount (Shielded Tripod)" },
  { pbName: "Potion of Flying", foundryName: "Potion of Flying (Standard)" },
  { pbName: "Practice Targets", foundryName: "Practice Target" },
  { pbName: "Roc-Shaft Arrow", foundryName: "Roc-Shaft Arrow (Lesser)" },
  { pbName: "Surki Hardshell", foundryName: "Hardshell Surki Carapace" },
  { pbName: "Surprise Doll", foundryName: "Doll (Surprise)" },
  { pbName: "Surprise Doll, Exquisite", foundryName: "Doll (Exquisite surprise)" },
  { pbName: "Waterproof Carrying Case", foundryName: "Waterproof Firearm Carrying Case" },
  { pbName: "Windlass Bolas", foundryName: "Windlass Bola" },
  { pbName: "Wooden Nickle", foundryName: "Wooden Nickel" },

  // Starfinder items Pathbuilder names without their place, people or god
  { pbName: "Holy Barrier (Tactical)", foundryName: "Lissalan Barrier (Tactical)", system: "sf2e" },
  { pbName: "Holy Barrier (Superior)", foundryName: "Lissalan Barrier (Superior)", system: "sf2e" },
  { pbName: "Holy Barrier (Ultimate)", foundryName: "Lissalan Barrier (Ultimate)", system: "sf2e" },
  { pbName: "Replica Microphone", foundryName: "Replica Zo! Microphone", system: "sf2e" },
  { pbName: "Vesk Brigandine", foundryName: "Veskarium Brigandine", system: "sf2e" },
  // Starfinder items named differently, including the armor an ancestry's heritage grants
  { pbName: "Containing Aeon Stone", foundryName: "Aeon Stone (Containing)", system: "sf2e" },
  { pbName: "Copaxi Exoskeleton", foundryName: "Armored Copi Exoskeleton", system: "sf2e" },
  { pbName: "Hellforged Android Plates", foundryName: "Hellforged Plates", system: "sf2e" },
  { pbName: "Khizar Bark", foundryName: "Petrified Bark", system: "sf2e" },
  { pbName: "Mobility Enhancer (Advanced)", foundryName: "Mobility Enhancer (Augmentation, Advanced)", system: "sf2e" },
  { pbName: "Myrmidon Siegebreaker Plate", foundryName: "Myrmidon Siegebreaker", system: "sf2e" },
  { pbName: "Rugged Barathu Shell", foundryName: "Barathu Shell", system: "sf2e" },
  { pbName: "Trox Chitinous Plates", foundryName: "Chitinous Plates", system: "sf2e" },
  { pbName: "Urog Crystal Carapace", foundryName: "Urog Shell", system: "sf2e" },
  // weapon crystals, which sf2e names "... Crystal"
  { pbName: "Cycling", foundryName: "Cycling Crystal", system: "sf2e" },
  { pbName: "Quasar", foundryName: "Quasar Crystal", system: "sf2e" },
];

// Pathbuilder names that follow a pattern Foundry names differently, tried before the other rules
const REWRITES = [
  // "Wand of Hawthorn (2nd-rank Spell)" is "Wand of Hawthorn (2nd-Rank)"
  [/^(Wand of .*) \((\d+(?:st|nd|rd|th))-rank Spell\)$/i, "$1 ($2-Rank)"],
  [/^(Arboreal Wand) \((\d+)(?:st|nd|rd|th)-rank Spell\)$/i, "$1 (Rank $2)"],
  // Starfinder's "Spell Gem (1st-Rank)" is "Spell Gem (1st-Rank Spell)"
  [/^(Spell (?:Gem|Chip)) \((\d+(?:st|nd|rd|th))-Rank\)$/i, "$1 ($2-Rank Spell)"],
  // "Spacious Pouch II" is "Spacious Pouch (Type II)"
  [/^(Spacious Pouch|Box of Unspoiling|Assassin's Bracers) (I|II|III|IV)$/, "$1 (Type $2)"],
  // "Medal of the Wolf Pack" is "Magical Medal (Wolf Pack)"
  [/^Medal of (?:the )?(.+)$/, "Magical Medal ($1)"],
  // "Elemental Ammunition - Acid (Greater)" is "Elemental Ammunition (Greater, Acid)"
  [/^(Elemental Ammunition) - (\w+) \((\w+)\)$/, "$1 ($3, $2)"],
  // "Awakened Metal Shot (Awakened Silver Shot)" is "Awakened Silver Shot"
  [/^Awakened Metal Shot \((.+)\)$/, "$1"],
  // Starfinder's "Cable Line, Tactical (50 Feet)" is "Cable Line (50 Feet, Tactical)"
  [/^(.+), (Commercial|Tactical|Advanced|Superior|Elite|Ultimate|Paragon) \((.+)\)$/, "$1 ($3, $2)"],
  // weapon crystals: "Photon (Tactical)" is "Photon Crystal (Tactical)"
  [/^(Gluon|Graviton|Photon)\s+\((\w+)\)$/, "$1 Crystal ($2)"],
  // an armor upgrade's energy type is a choice on the item: "Energy Shielding - Cold (Commercial)"
  [/^(Energy Shielding) - \w+ \((\w+)\)$/, "$1 ($2)"],
  // "Spell Ampoule (Commercial Glow Up)" is "Glow Up Spell Amp (Commercial)"
  [/^Spell Ampoule \((Commercial|Tactical|Advanced) (.+)\)$/, "$2 Spell Amp ($1)"],
  [/^Spell Ampoule \((.+)\)$/, "$1 Spell Amp"],
  [/^(.+) Grenade Grenade(.*)$/, "$1 Grenade$2"],
  // sf2e spells it "Corossive"
  [/^Corrosive Grenade(.*)$/, "Corossive Grenade$1"],
];

// function ammunitionMatch(pbName) {
//   const ammoRegex = /^(.*) Ammunition( (\d+) Shots)?/;
//   const match = pbName.match(ammoRegex);
//   if (!match) return [];
//   const results = [];
//   results.push({
//     pbName,
//     foundryName: `Rounds (${match[1]})`,
//     details: match[1],
//     amount: match[3] ? parseInt(match[3]) : 10,
//   });
// }

// ammunition Pathbuilder lists once where Foundry has a kind for each weapon (every firearm takes its
// own rounds): left unmatched, it becomes the ammunition of the build's weapons whose ammunition slug
// starts with ammoPrefix
export const PER_WEAPON_AMMUNITION = [
  { pattern: /^(?:Bullets|Rounds)\b/i, ammoPrefix: "rounds-" },
];

// magazines Pathbuilder lists one to an entry, with the charges (or chem) left in it as the entry's
// quantity: ["Battery, Commercial", 10] is one full battery, which Foundry has as one item with uses
export const CHARGED_MAGAZINES = [
  /^Battery, /i,
  /^Chem Tank, /i,
];

function dynamicNamesSteps(pbName) {
  const result = [];
  for (const reg of POSTFIX_PB_REMOVALS) {
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
  for (const reg of SPLITS) {
    const match = pbName.match(reg);
    if (match) {
      result.push({ pbName, foundryName: match[2], details: match[1] });
    }
  }
  for (const reg of SPLITS_INVERT) {
    const match = pbName.match(reg);
    if (match) {
      result.push({ pbName, foundryName: match[1], details: match[2] });
    }
  }
  for (const reg of PARENTHESIS) {
    const match = pbName.match(reg);
    if (match) {
      result.push({ pbName, foundryName: match[1], details: match[2] });
    }
  }
  return result;
}

function generateDynamicNames(pbName) {
  const result = [];
  // if we have a hardcoded map, don't return here
  const basicResults = EQUIPMENT_RENAME_STATIC_MAP.filter((e) => e.pbName === pbName);
  if (basicResults.length > 0) {
    result.push(...basicResults);
  }

  for (const [pattern, replacement] of REWRITES) {
    if (pattern.test(pbName)) result.push({ pbName, foundryName: pbName.replace(pattern, replacement) });
  }

  for (const replace of REPLACES) {
    if (pbName.includes(replace.pbName)) {
      const replaced = pbName.replace(replace.pbName, replace.foundryName);
      result.push(...dynamicNamesSteps(replaced));
      result.push({ pbName, foundryName: replaced });
    }
  }

  if (result.length > 0) {
    return result;
  }

  result.push(...dynamicNamesSteps(pbName));
  return result;
}


export function EQUIPMENT_RENAME_MAP(pbName = null) {
  const postfixNames = pbName ? generateDynamicNames(pbName) : [];
  return postfixNames.concat(EQUIPMENT_RENAME_STATIC_MAP);
}


// this is equipment is special and shouldn't have the transformations applied to it
export const RESTRICTED_EQUIPMENT = [
  "Bracers of Armor",
];

export const IGNORED_EQUIPMENT = [
  "Unarmored",
  "Inventor Power Suit",
  "Inventor Power Suit (Heavy)",
  "Inventor Subterfuge Suit",
];

const IGNORED_DISPLAY_POSTFIX = [
  /(.*) - Melee$/,
  /(.*) - Ranged$/,
];

export function IGNORED_EQUIPMENT_DISPLAY(pbName) {
  for (const reg of IGNORED_DISPLAY_POSTFIX) {
    const match = reg.test(pbName);
    if (match === true) return true;
  }
  return false;
}

export const GRANTED_ITEMS_LIST = [
  "Inventor Power Suit",
  "Inventor Power Suit (Heavy)",
  "Inventor Subterfuge Suit",
];

export const RUNE_ITEM_MAP = {
  "Clan Dagger Blessing": "Bolka's Blessing",
  "Clan Dagger Blessing (Greater)": "Bolka's Blessing (Greater)",
  "Clan Dagger Oath": "Kols's Oath",
  "Clan Dagger Oath (Greater)": "Kols's Oath (Greater)",
  "Clan Dagger Strength": "Trudd's Strength",
  "Clan Dagger Strength (Greater)": "Trudd's Strength (Greater)",
};
