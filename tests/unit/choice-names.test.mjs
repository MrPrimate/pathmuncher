// Names Pathbuilder gives a choice's option, or a class feature, that pf2e names otherwise.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bareDragonName, choiceAliases, classFeatureRenames, remasterTermNames } from "../../src/data/features.js";

describe("choice option names", () => {
  it("knows Lesser Augmentation's additional resistances as Pathbuilder's Extra Resistances", () => {
    assert.deepEqual(choiceAliases("Lesser Augmentation", { value: "all" }), ["Extra Resistances"]);
    assert.deepEqual(choiceAliases("Lesser Augmentation", { value: "increase" }), []);
    assert.deepEqual(choiceAliases("Toughness", { value: "all" }), []);
  });

  it("names Dragonblood's dragon on its own, and only Dragonblood's", () => {
    assert.equal(bareDragonName("Dragonblood", "Executor Dragon"), "Executor");
    assert.equal(bareDragonName("Bloodline: Draconic", "Executor Dragon"), null);
    assert.equal(bareDragonName("Dragonblood", "Something Else"), null);
  });
});

describe("class feature names", () => {
  it("reads a thaumaturge's Perception Expertise as Perception Mastery, and no other class's", () => {
    assert.deepEqual(classFeatureRenames("Thaumaturge"), [{ pbName: "Perception Expertise", foundryName: "Perception Mastery" }]);
    assert.deepEqual(classFeatureRenames("Fighter"), []);
  });

  it("finds the psychopomp eidolon's Shepherd's Touch as Spirit Touch", () => {
    assert.deepEqual(remasterTermNames("Shepherd's Touch"), ["Shepherd's Touch", "Spirit Touch"]);
  });
});
