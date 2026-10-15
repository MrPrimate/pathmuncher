// Which feat slot a Pathbuilder feat goes in, and which variant rules a build was made with.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Seasoning } from "../../src/app/Seasoning.js";
import { Pathmuncher } from "../../src/app/Pathmuncher.js";
import { fixture } from "./helpers.mjs";

// a parsed Pathbuilder feat: [name, extra, type, level, label, choice, parent]
const feat = (type, level, label = null, choice = "standardChoice") => ({
  type, level, featChoiceRef: label, isChild: choice === "childChoice",
});
const location = (f, options = {}) => Seasoning.getFoundryFeatLocation(f, { className: "Fighter", ...options });

describe("Seasoning.getFoundryFeatLocation from Pathbuilder's slot labels", () => {
  it("puts feats in the slot their label names", () => {
    assert.equal(location(feat("Class Feat", 2, "Fighter Feat 2")), "class-2");
    assert.equal(location(feat("Skill Feat", 4, "Skill Feat 4")), "skill-4");
    assert.equal(location(feat("General Feat", 3, "General Feat 3")), "general-3");
    assert.equal(location(feat("Ancestry Feat", 1, "Gnoll Feat 1")), "ancestry-1");
    assert.equal(location(feat("Ancestry Feat", 5, "Elf Feat 5")), "ancestry-5");
  });

  it("follows the label when the feat's type is another slot's", () => {
    // a skill feat taken in a general slot, an archetype feat in a class slot (no Free Archetype)
    assert.equal(location(feat("Skill Feat", 3, "General Feat 3")), "general-3");
    assert.equal(location(feat("Archetype Feat", 4, "Fighter Feat 4")), "class-4");
  });

  it("uses archetype slots for Free Archetype labels only when the variant is on", () => {
    assert.equal(location(feat("Archetype Feat", 2, "Free Archetype 2"), { freeArchetype: true }), "archetype-2");
    assert.equal(location(feat("Archetype Feat", 2, "Free Archetype 2"), { freeArchetype: false }), "class-2");
  });

  it("gives no slot to custom feat choices, granted children and awarded feats", () => {
    assert.equal(location(feat("General Feat", 1, "a5245f8a-39ef-4469-81f2-0ff8bbe323ed")), null);
    assert.equal(location(feat("Psychic Feat", 8, "Basic ThoughtformFree Archetype 8", "childChoice")), null);
    assert.equal(location(feat("Awarded Feat", 1)), null);
    assert.equal(location(feat("Heritage", 1, "Heritage Feat", "parentChoice")), null);
  });
});

describe("Seasoning.getFoundryFeatLocation for exports without labels", () => {
  it("maps the feat's type", () => {
    assert.equal(location(feat("Ancestry Feat", 5)), "ancestry-5");
    assert.equal(location(feat("Skill Feat", 2)), "skill-2");
    assert.equal(location(feat("General Feat", 3)), "general-3");
    assert.equal(location(feat("Class Feat", 4)), "class-4");
  });

  it("treats '<Class> Feat' types as class feats", () => {
    assert.equal(location(feat("Wizard Feat", 4)), "class-4");
    assert.equal(location(feat("Cleric Feat", 12)), "class-12");
  });

  it("puts archetype feats in class slots unless Free Archetype is on", () => {
    assert.equal(location(feat("Archetype Feat", 2)), "class-2");
    assert.equal(location(feat("Archetype Feat", 2), { freeArchetype: true }), "archetype-2");
  });
});

describe("Seasoning.getFeatLocationLevel", () => {
  it("reads the level from the slot", () => {
    assert.equal(Seasoning.getFeatLocationLevel("class-4"), 4);
    assert.equal(Seasoning.getFeatLocationLevel("mythic-12"), 12);
  });

  it("gives no level for the mythic calling's slot", () => {
    assert.equal(Seasoning.getFeatLocationLevel("mythic-calling"), null);
    assert.equal(Seasoning.getFeatLocationLevel(null), null);
  });
});

describe("Pathmuncher.detectVariants", () => {
  it("reads Free Archetype and gradual boosts from the export", () => {
    assert.deepEqual(Pathmuncher.detectVariants(fixture("315329-magus9").build), { freeArchetype: true, gradualBoosts: true });
    assert.deepEqual(Pathmuncher.detectVariants(fixture("422753-fighter5").build), { freeArchetype: true, gradualBoosts: false });
    assert.deepEqual(Pathmuncher.detectVariants(fixture("314710-gunslinger1").build), { freeArchetype: false, gradualBoosts: false });
  });

  it("spots Free Archetype in an export without slot labels", () => {
    // the 2020-era wizard takes a wizard feat and an archetype feat at every even level
    assert.deepEqual(Pathmuncher.detectVariants(fixture("142926-wizard20").build), { freeArchetype: true, gradualBoosts: false });
  });
});
