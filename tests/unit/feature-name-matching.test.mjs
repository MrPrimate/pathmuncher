// Matching names both ways (FeatureNames), and the record of what happened to each entry (ParsedEntry).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FeatureNames } from "../../src/app/FeatureNames.js";
import { ParsedEntry } from "../../src/app/ParsedEntry.js";

const names = new FeatureNames({
  className: "Psychic",
  ancestry: "Elf",
  heritage: "Ancient Elf",
  buildRenames: [{ pbName: "Counterspell", foundryName: "Counterspell (Spontaneous)" }],
});

describe("FeatureNames.candidates", () => {
  it("lists the Foundry names a Pathbuilder name may have, most likely first", () => {
    assert.deepEqual(names.candidates("Bone Fascination").map((c) => c.foundryName), ["Bone"]);
    assert.deepEqual(names.candidates("Aasimar").map((c) => c.foundryName), ["Nephilim"]);
  });

  it("includes the build's own renames", () => {
    assert.equal(names.foundryName("Counterspell").foundryName, "Counterspell (Spontaneous)");
  });

  it("is the name itself when nothing renames it", () => {
    assert.deepEqual(names.candidates("Toughness"), [{ pbName: "Toughness", foundryName: "Toughness", details: undefined }]);
  });
});

describe("FeatureNames.slugVariants", () => {
  it("adds the class, ancestry and heritage, as pf2e names shared features", () => {
    assert.deepEqual(names.slugVariants("Weapon Expertise"), [
      "weapon-expertise", "weapon-expertise-psychic", "weapon-expertise-elf", "weapon-expertise-ancient-elf",
    ]);
  });

  it("has none for a missing name", () => {
    assert.deepEqual(names.slugVariants(undefined), []);
  });
});

describe("FeatureNames.entryMatches", () => {
  it("matches an entry by its Foundry name, its Pathbuilder name, their variants, or its value", () => {
    const entry = new ParsedEntry({ name: "Arcana", originalName: "Empiricism Selected Skill: Arcana", foundryValue: "arc" });
    for (const slug of ["arcana", "arcana-psychic", "empiricism-selected-skill-arcana", "arc"]) {
      assert.ok(names.entryMatches(entry, slug), slug);
    }
    assert.ok(!names.entryMatches(entry, "athletics"));
    assert.ok(!names.entryMatches(entry, undefined), "a missing slug matches nothing");
  });

  it("follows a change to the entry's name", () => {
    const entry = new ParsedEntry({ name: "Old Name", originalName: "Old Name" });
    assert.ok(names.entryMatches(entry, "old-name"));
    entry.name = "New Name";
    assert.ok(names.entryMatches(entry, "new-name"));
  });
});

describe("FeatureNames.itemSlugs", () => {
  const item = (name, slug = null) => ({ name, system: { slug } });

  it("lists the names a Foundry item may be listed under in Pathbuilder, most likely first", () => {
    assert.deepEqual(names.itemSlugs(item("Psychic Weapon Specialization", "psychic-weapon-specialization")), [
      "psychic-weapon-specialization", "weapon-specialization",
    ]);
    assert.deepEqual(names.itemSlugs(item("Weapon Mastery (Champion)"), { grantedAs: "Martial Weapon Mastery" }), [
      "weapon-mastery-champion", "weapon-mastery", "martial-weapon-mastery",
    ]);
  });
});

describe("ParsedEntry", () => {
  it("starts pending, and is not added until settled", () => {
    const entry = new ParsedEntry({ name: "Toughness" });
    assert.equal(entry.status, ParsedEntry.STATUS.PENDING);
    assert.equal(entry.added, false);
    assert.equal(entry.addedId, null);
  });

  it("records what settled it", () => {
    const entry = new ParsedEntry({ name: "Train Animal" }).settle(ParsedEntry.STATUS.GRANTED, { itemId: "abc", reason: "granted by Beast Trainer" });
    assert.equal(entry.added, true);
    assert.equal(entry.addedId, "abc");
    assert.equal(entry.reason, "granted by Beast Trainer");
  });

  it("stays open to later passes when unmatched", () => {
    const entry = new ParsedEntry({ name: "Odd Feat" }).unmatched("no feats compendium entry");
    assert.equal(entry.added, false);
    assert.equal(entry.status, ParsedEntry.STATUS.UNMATCHED);
    entry.settle(ParsedEntry.STATUS.CREATED, { itemId: "def" });
    assert.equal(entry.added, true);
  });

  it("can start settled", () => {
    const entry = new ParsedEntry({ name: "Ancient Elf", status: ParsedEntry.STATUS.INCLUDED, reason: "the heritage" });
    assert.equal(entry.added, true);
    assert.equal(entry.name, "Ancient Elf");
    assert.equal(Object.hasOwn(entry, "status"), true);
  });
});
