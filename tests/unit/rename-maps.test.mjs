// Pathbuilder names that differ from the pf2e and sf2e compendiums': licensing (Pathbuilder can't use
// Paizo's gods, places and peoples), spelling, and naming patterns.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import CONSTANTS from "../../src/constants.js";
import { EQUIPMENT_RENAME_MAP, EQUIPMENT_RENAME_STATIC_MAP } from "../../src/data/equipment.js";
import { CHOICE_VALUE_RENAMES, FEAT_RENAME_MAP, FEAT_RENAME_STATIC_MAP } from "../../src/data/features.js";
import { PATHBUILDER_SPELLINGS, REMASTER_NAMES, spellRename } from "../../src/data/spells.js";

// the name each is looked up under first, as the importer does
const equipment = (pbName) => EQUIPMENT_RENAME_MAP(pbName).find((e) => e.pbName === pbName)?.foundryName ?? pbName;
const feature = (pbName) => FEAT_RENAME_MAP(pbName).find((e) => e.pbName === pbName)?.foundryName ?? pbName;

describe("rename maps", () => {
  it("name Pathfinder and Starfinder content after its god, place or people", () => {
    assert.equal(feature("Sword Duelist Dedication"), "Aldori Duelist Dedication");
    assert.equal(feature("Starstone's Valor"), "Iomedae's Valor");
    assert.equal(feature("Revolutionary"), "Bachuan Revolutionary");
    assert.equal(feature("Anti-Tyrant Saboteur (Thievery)"), "Anti-Thrune Saboteur");
    assert.equal(feature("Station Local"), "Absalom Local");
    assert.equal(feature("Conqueror's Claw"), "Damoritosh's Claw");
    assert.equal(equipment("Mantis God's Kiss"), "Achaekek's Kiss");
    assert.equal(equipment("Holy Barrier (Superior)"), "Lissalan Barrier (Superior)");
    assert.equal(spellRename("Summon Oliphaunt of Chaos"), "Summon Oliphaunt of Jandelay");
  });

  it("drop the [Placeholder] Pathbuilder gives unfinished content", () => {
    assert.equal(feature("Disciple [Placeholder]"), "Disciple");
    assert.equal(feature("Raised by Belief [PlaceHolder]"), "Raised by Belief");
  });

  it("rewrite items whose names follow a pattern the compendiums name differently", () => {
    assert.equal(equipment("Wand of Hawthorn (2nd-rank Spell)"), "Wand of Hawthorn (2nd-Rank)");
    assert.equal(equipment("Arboreal Wand (4th-rank Spell)"), "Arboreal Wand (Rank 4)");
    assert.equal(equipment("Spell Gem (1st-Rank)"), "Spell Gem (1st-Rank Spell)");
    assert.equal(equipment("Spacious Pouch III"), "Spacious Pouch (Type III)");
    assert.equal(equipment("Medal of the Wolf Pack"), "Magical Medal (Wolf Pack)");
    assert.equal(equipment("Elemental Ammunition - Acid (Greater)"), "Elemental Ammunition (Greater, Acid)");
    assert.equal(equipment("Cable Line, Tactical (50 Feet)"), "Cable Line (50 Feet, Tactical)");
    assert.equal(equipment("Graviton  (Tactical)"), "Graviton Crystal (Tactical)");
    assert.equal(equipment("Spell Ampoule (Commercial Glow Up)"), "Glow Up Spell Amp (Commercial)");
    assert.equal(equipment("Spell Ampoule (Haste)"), "Haste Spell Amp");
    assert.equal(equipment("Miasmatic Grenade Grenade (Elite)"), "Miasmatic Grenade (Elite)");
  });

  it("leave alone names that already match, which a suffix rule would have renamed", () => {
    // pf2e and sf2e have "Life" and "Reposition" too, so dropping the suffix would find the wrong item
    assert.equal(feature("Life Connection"), "Life Connection");
    assert.equal(feature("Reposition Exocortex"), "Reposition Exocortex");
  });
});

// the tables whose targets tests/foundry/rename-targets.test.js looks for in the compendiums
describe("rename tables", () => {
  const tables = {
    features: FEAT_RENAME_STATIC_MAP.concat(CHOICE_VALUE_RENAMES),
    equipment: EQUIPMENT_RENAME_STATIC_MAP,
    spells: REMASTER_NAMES.concat(PATHBUILDER_SPELLINGS),
  };
  // the modules whose packs the importer searches
  const modules = new Set(Object.values(CONSTANTS.CORE_COMPENDIUM_MAPPINGS).flat().map((pack) => pack.split(".")[0]));

  it("tag an entry only with a system and a module whose packs are searched", () => {
    for (const [name, entries] of Object.entries(tables)) {
      for (const e of entries) {
        const label = `${name}: ${e.pbName}`;
        assert.deepEqual(Object.keys(e).filter((key) => !["pbName", "foundryName", "system", "module"].includes(key)), [], label);
        if (e.system) assert.ok(["pf2e", "sf2e"].includes(e.system), `${label} system ${e.system}`);
        if (e.module) assert.ok(modules.has(e.module), `${label} module ${e.module}`);
      }
    }
  });

  it("rename each name once for each system, to another name", () => {
    for (const [name, entries] of Object.entries(tables)) {
      const seen = new Set();
      for (const e of entries) {
        const key = `${e.system ?? "pf2e"}:${e.pbName}`;
        assert.ok(!seen.has(key), `${name}: ${key} twice`);
        seen.add(key);
        assert.ok(e.foundryName && e.foundryName !== e.pbName, `${name}: ${e.pbName} to itself`);
      }
    }
  });
});
