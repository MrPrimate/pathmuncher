// this equipment is named differently in foundry vs pathbuilder
export const EQUIPMENT_RENAME_MAP = [
  { pbName: "Chain", foundryName: "Chain (10 feet)" },
  { pbName: "Oil", foundryName: "Oil (1 pint)" },
  { pbName: "Bracelets of Dashing", foundryName: "Bracelet of Dashing" },
  { pbName: "Fingerprinting Kit", foundryName: "Fingerprint Kit" },
  { pbName: "Greater Unmemorable Mantle", foundryName: "Unmemorable Mantle (Greater)" },
  { pbName: "Major Unmemorable Mantle", foundryName: "Unmemorable Mantle (Major)" },
  { pbName: "Ladder", foundryName: "Ladder (10-foot)" },
  { pbName: "Mezmerizing Opal", foundryName: "Mesmerizing Opal" },
  { pbName: "Explorer's Clothing", foundryName: "Clothing (Explorer's)" },
  { pbName: "Flaming Star (Greater)", foundryName: "Greater Flaming Star" },
  { pbName: "Potion of Lesser Darkvision", foundryName: "Darkvision Elixir (Lesser)" },
  { pbName: "Bottled Sunlight", foundryName: "Formulated Sunlight" },
  { pbName: "Magazine (Repeating Hand Crossbow)", foundryName: "Magazine with 5 Bolts" },
  { pbName: "Astrolabe (Standard)", foundryName: "Standard Astrolabe" },
  { pbName: "Greater Cloak of Repute", foundryName: "Cloak of Repute (Greater)" },
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
];

// this is equipment is special and shouldn't have the transformations applied to it
export const RESTRICTED_EQUIPMENT = [
  "Bracers of Armor",
];

export const IGNORED_EQUIPMENT = [
  "Unarmored"
];
