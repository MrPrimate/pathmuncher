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
  /(Charm of Resistance .*) - (.*)/,
];

const PARENTHESIS = [
  /^(.*) \((.*)\)$/,
];

const SPLITS = [
  // /^(.*) - (.*)/,
];

const SPLITS_INVERT = [
  /^(.*): (.*)/,
];

const REPLACES = [
  { pbName: "Ring of Energy Resistance", foundryName: "Charm of Resistance" },
  { pbName: "Feather Token", foundryName: "Marvelous Miniatures" },
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
  { pbName: "Flaming Star (Greater)", foundryName: "Greater Flaming Star" },
  { pbName: "Potion of Lesser Darkvision", foundryName: "Darkvision Elixir (Lesser)" },
  { pbName: "Potion of Greater Darkvision", foundryName: "Darkvision Elixir (Greater)" },
  { pbName: "Potion of Moderate Darkvision", foundryName: "Darkvision Elixir (Moderate)" },
  { pbName: "Bottled Sunlight", foundryName: "Formulated Sunlight" },
  { pbName: "Magazine (Repeating Hand Crossbow)", foundryName: "Magazine with 5 Bolts" },
  { pbName: "Astrolabe (Standard)", foundryName: "Standard Astrolabe" },
  { pbName: "Skinitch Salve", foundryName: "Skinstitch Salve" },
  { pbName: "Flawless Scale", foundryName: "Abadar's Flawless Scale" },
  { pbName: "Construct Key", foundryName: "Cordelia's Construct Key" },
  { pbName: "Construct Key (Greater)", foundryName: "Cordelia's Greater Construct Key" },
  { pbName: "Lesser Swapping Stone", foundryName: "Lesser Bonmuan Swapping Stone" },
  { pbName: "Major Swapping Stone", foundryName: "Major Bonmuan Swapping Stone" },
  { pbName: "Moderate Swapping Stone", foundryName: "Moderate Bonmuan Swapping Stone" },
  { pbName: "Greater Swapping Stone", foundryName: "Greater Bonmuan Swapping Stone" },
  { pbName: "Heartstone", foundryName: "Skarja's Heartstone" },
  { pbName: "Bullets (10 rounds)", foundryName: "Sling Bullets" },
  { pbName: "Hide", foundryName: "Hide Armor" },
  { pbName: "Soverign Glue", foundryName: "Sovereign Glue" },
  { pbName: "Axe Musket - Melee", foundryName: "Axe Musket" },
  { pbName: "Axe Musket - Ranged", foundryName: "Axe Musket" },
  { pbName: "Extendible Pincer", foundryName: "Extendable Pincer" },
  { pbName: "Clothing (Explorer's)", foundryName: "Explorer's Clothing" },
  { pbName: "Street Preacher [Placeholder]", foundryName: "Street Preacher" },
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
  { pbName: "Bag of Holding", foundryName: "Spacious Pouch" },
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
  { pbName: "Dragon's Breath Potion (Young)", foundryName: "Energy Breath Potion (Lesser)" },
  { pbName: "Dragon's Breath Potion (Adult)", foundryName: "Energy Breath Potion (Moderate)" },
  { pbName: "Dragon's Breath Potion (Wyrm)", foundryName: "Energy Breath Potion (Greater)" },
  { pbName: "Druid's Vestments", foundryName: "Living Mantle" },
  { pbName: "Everburning Torch", foundryName: "Everlight Crystal" },
  { pbName: "Eyes of the Eagle", foundryName: "Eyes of the Cat" },
  { pbName: "Feather Token (Chest)", foundryName: "Marvelous Miniatures (Chest)" },
  { pbName: "Feather Token (Ladder)", foundryName: "Marvelous Miniatures (Ladder)" },
  { pbName: "Feather Token (Swan Boat)", foundryName: "Marvelous Miniatures (Boat)" },
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
