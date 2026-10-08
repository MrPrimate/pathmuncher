// Finding compendium entries by slug, as the import does for every feat, item and spell.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CompendiumMatcher } from "../../src/app/CompendiumMatcher.js";

/** A matcher over in-memory indexes: { packName: [entries] }, searched in that order. */
function matcher(indexes) {
  const m = new CompendiumMatcher({ type: "feats", mappings: { feats: [] } });
  for (const [name, index] of Object.entries(indexes)) {
    m.indexes[name] = index;
    m.packs[name] = { collection: name };
  }
  return m;
}

const entry = (_id, name, system = {}) => ({ _id, name, type: "feat", system: { slug: null, ...system } });

describe("CompendiumMatcher slug lookups", () => {
  const first = matcher({
    "a.feats": [
      entry("a1", "Power Attack", { slug: "power-attack" }),
      entry("a2", "Weapon Expertise (Wizard)"),
      entry("a3", "Weapon Expertise"),
    ],
    "b.feats": [entry("b1", "Shield Block", { slug: "shield-block" }), entry("b2", "Power Attack", { slug: "power-attack" })],
  });

  it("matches an entry's own slug, or its name's when it has none", () => {
    assert.equal(first.getSlugMatch("Power Attack", "Power Attack").i._id, "a1");
    assert.equal(first.getSlugMatch("Weapon Expertise", "Weapon Expertise").i._id, "a3");
  });

  it("prefers the Foundry name, then the Pathbuilder name, then the next pack", () => {
    assert.equal(first.getSlugMatch("Shield Block", "Power Attack").i._id, "a1");
    assert.equal(first.getSlugMatch("Power Attack", "Not There").i._id, "a1");
    const match = first.getSlugMatch("Shield Block", "Shield Block");
    assert.equal(match.i._id, "b1");
    assert.equal(match.pack.collection, "b.feats");
    assert.equal(first.getSlugMatch("Nothing", "Nothing"), undefined);
  });

  it("takes the first entry in index order of those matching any of the slugs", () => {
    assert.equal(first.findBySlugs("a.feats", ["weapon-expertise", "weapon-expertise-wizard"])._id, "a2");
    assert.equal(first.findBySlugs("a.feats", ["missing", "weapon-expertise"])._id, "a3");
    assert.equal(first.findBySlugs("a.feats", ["missing"]), undefined);
  });

  it("filters by value or by a test of the value", () => {
    const rituals = matcher({
      "a.spells": [
        entry("s1", "Animate Dead", { slug: "animate-dead", ritual: null }),
        entry("s2", "Animate Dead", { slug: "animate-dead", ritual: { primary: {} } }),
      ],
    });
    const ritual = rituals.getNameMatchWithFilter("Animate Dead", "Animate Dead", { "system.ritual": (value) => !!value });
    assert.equal(ritual.i._id, "s2");
    assert.equal(rituals.getNameMatchWithFilter("Animate Dead", "Animate Dead", { type: "feat" }).i._id, "s1");
    assert.equal(rituals.getNameMatchWithFilter("Animate Dead", "Animate Dead", { type: "spell" }), undefined);
  });

  it("rebuilds its lookup when the compendiums are loaded again", async () => {
    const m = matcher({});
    m.packs["c.feats"] = { getIndex: async () => [entry("c1", "Toughness", { slug: "toughness" })] };
    await m.loadCompendiums();
    assert.equal(m.getSlugMatch("Toughness", "Toughness").i._id, "c1");
    m.packs["c.feats"] = { getIndex: async () => [entry("c2", "Toughness", { slug: "toughness" })] };
    await m.loadCompendiums();
    assert.equal(m.getSlugMatch("Toughness", "Toughness").i._id, "c2");
  });
});
