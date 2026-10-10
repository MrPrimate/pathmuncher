// Which feats the import can create together, and which need the feats before them on the actor first.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ActorWriter } from "../../src/app/ActorWriter.js";

const feat = (name, rules = []) => ({ name, type: "feat", system: { rules } });

describe("ActorWriter.dependsOnActor", () => {
  it("is false for a feat without ChoiceSets or GrantItems, or with fixed ones", () => {
    assert.equal(ActorWriter.dependsOnActor(feat("Toughness", [{ key: "FlatModifier", predicate: ["self:effect:x"] }])), false);
    assert.equal(ActorWriter.dependsOnActor(feat("Gate", [{ key: "ChoiceSet", choices: [{ value: "expand" }, { value: "fork" }] }])), false);
    assert.equal(ActorWriter.dependsOnActor(feat("Granter", [{ key: "GrantItem", uuid: "Compendium.pf2e.feats-srd.Item.x" }])), false);
  });

  it("is false for a compendium filter on the item alone", () => {
    const filter = ["item:level:1", { or: ["item:trait:wizard", "item:trait:spellshape"] }, { lte: ["item:level", "parent:granter:level"] }];
    assert.equal(ActorWriter.dependsOnActor(feat("Arcane Thesis", [{ key: "ChoiceSet", choices: { filter } }])), false);
  });

  it("is true when the options come from the actor", () => {
    // Psi Development: the psi cantrips are a flag The Tangible Dream sets on the actor
    assert.equal(ActorWriter.dependsOnActor(feat("Psi Development", [{ key: "ChoiceSet", choices: "flags.system.psychic.dedication.psiCantrips" }])), true);
    assert.equal(ActorWriter.dependsOnActor(feat("Weapon pick", [{ key: "ChoiceSet", choices: { ownedItems: true, types: ["weapon"] } }])), true);
    assert.equal(ActorWriter.dependsOnActor(feat("Strike pick", [{ key: "ChoiceSet", choices: { attacks: true } }])), true);
    assert.equal(ActorWriter.dependsOnActor(feat("Filtered", [{ key: "ChoiceSet", choices: { filter: ["item:trait:impulse", "feature:air-gate"] } }])), true);
  });

  it("is true when a ChoiceSet, a choice or a GrantItem has a predicate", () => {
    assert.equal(ActorWriter.dependsOnActor(feat("Threshold", [{ key: "GrantItem", uuid: "x", predicate: ["kinetic-gate:first-threshold:expand"] }])), true);
    assert.equal(ActorWriter.dependsOnActor(feat("Choice", [{ key: "ChoiceSet", choices: [{ value: "a", predicate: ["feat:b"] }] }])), true);
  });
});

describe("ActorWriter.featBatches", () => {
  it("keeps the feats in order, starting a new batch at each feat that depends on the actor", () => {
    const dream = feat("The Tangible Dream");
    const psi = feat("Psi Development", [{ key: "ChoiceSet", choices: "flags.system.psychic.dedication.psiCantrips" }]);
    const batches = ActorWriter.featBatches([feat("A"), dream, psi, feat("B"), feat("C")]);
    assert.deepEqual(batches.map((b) => b.map((f) => f.name)), [["A", "The Tangible Dream"], ["Psi Development", "B", "C"]]);
  });

  it("makes one batch when nothing depends on the actor, and none for no feats", () => {
    assert.equal(ActorWriter.featBatches([feat("A"), feat("B")]).length, 1);
    assert.deepEqual(ActorWriter.featBatches([]), []);
  });
});
