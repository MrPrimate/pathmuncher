export const FEAT_SPELLCASTING = [
  { name: "Kitsune Spell Familiarity", showSlotless: false, knownSpells: ["Daze", "Forbidding Ward", "Ghost Sound"], preparePBSpells: true, },
  { name: "Kitsune Spell Expertise", showSlotless: false, knownSpells: ["Confusion", "Death Ward", "Illusory Scene"], preparePBSpells: true, },
  { name: "Kitsune Spell Mysteries", showSlotless: false, knownSpells: ["Bane", "Illusory Object", "Sanctuary"], preparePBSpells: true, },
  { name: "Nagaji Spell Familiarity", showSlotless: false, knownSpells: ["Daze", "Detect Magic", "Mage Hand"], preparePBSpells: true, },
  { name: "Nagaji Spell Expertise", showSlotless: false, knownSpells: ["Blink", "Control Water", "Subconscious Suggestion"], preparePBSpells: true, },
  { name: "Nagaji Spell Mysteries", showSlotless: false, knownSpells: ["Charm", "Fleet Step", "Heal"], preparePBSpells: true, },
  { name: "Rat Magic", showSlotless: false, knownSpells: [], preparePBSpells: true, },
];

const REMASTER_NAMES = [
  { pbName: "Scorching Ray", foundryName: "Blazing Bolt" },
  { pbName: "Burning Hands", foundryName: "Breathe Fire" },
  { pbName: "Calm Emotions", foundryName: "Calm" },
  { pbName: "Comprehend Languages", foundryName: "Translate" },
  { pbName: "Purify Food and Drink", foundryName: "Cleanse Cuisine" },
  { pbName: "Entangle", foundryName: "Entangling Flora" },
  { pbName: "Endure Elements", foundryName: "Environmental Endurance" },
  { pbName: "Meteor Swarm", foundryName: "Falling Stars" },
  { pbName: "Plane Shift", foundryName: "Interplanar Teleport" },
  { pbName: "Know Direction", foundryName: "Know the Way" },
  { pbName: "Stoneskin", foundryName: "Mountain Resilience" },
  { pbName: "Mage Armor", foundryName: "Mystic Armor" },
  { pbName: "Tree Stride", foundryName: "Nature's Pathway" },
  { pbName: "Barkskin", foundryName: "Oaken Resilience" },
  { pbName: "Tree Shape", foundryName: "One with Plants" },
  { pbName: "Meld into Stone", foundryName: "One with Stone" },
  { pbName: "Gentle Repose", foundryName: "Peaceful Rest" },
  { pbName: "Flesh to Stone", foundryName: "Petrify" },
  { pbName: "Dimensional Lock", foundryName: "Planar Seal" },
  { pbName: "Magic Fang", foundryName: "Runic Body" },
  { pbName: "Magic Weapon", foundryName: "Runic Weapon" },
  { pbName: "See Invisibility", foundryName: "See the Unseen" },
  { pbName: "Longstrider", foundryName: "Tailwind" },
  { pbName: "Tanglefoot", foundryName: "Tangle Vine" },
  { pbName: "Mage Hand", foundryName: "Telekinetic Hand" },
  { pbName: "Dimension Door", foundryName: "Translocate" },
  { pbName: "Tongues", foundryName: "Truespeech" },
  { pbName: "Gaseous Form", foundryName: "Vapor Form" },
];

export function spellRename(spellName) {
  if (foundry.utils.isNewerVersion(game.system.version, "5.3.0")) {
    const remasterName = REMASTER_NAMES.find((remaster) => remaster.pbName === spellName);
    if (remasterName) {
      return remasterName.foundryName;
    }
  }
  return spellName;
}
