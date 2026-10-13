// Reading Pathbuilder's animal companions, eidolons and construct companions for BFFBuilder.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BFFBuilder } from "../../src/app/BFFBuilder.js";

describe("BFFBuilder", () => {
  const master = { name: "Ilsa" };

  it("names a companion as Pathbuilder does, or after its master and animal when it has no name", () => {
    assert.equal(BFFBuilder.companionName({ name: "Fang - Savage Wolf", animal: "Wolf" }, master), "Fang");
    assert.equal(BFFBuilder.companionName({ name: "Young Badger", animal: "Badger" }, master), "Ilsa's Badger");
    assert.equal(BFFBuilder.companionName({ animal: "Horse" }, master), "Ilsa's Horse");
  });

  it("names barding as pf2e does, heavy barding by the companion's size", () => {
    assert.equal(BFFBuilder.bardingName("Barding, Light", "med"), "Light Barding");
    assert.equal(BFFBuilder.bardingName("Barding, Heavy", "lg"), "Heavy Barding (Large)");
    assert.equal(BFFBuilder.bardingName("Barding, Heavy", "sm"), "Heavy Barding (Small or Medium)");
    assert.equal(BFFBuilder.bardingName("Barding of the Zephyr", "med"), "Barding of the Zephyr");
  });

  it("finds an eidolon in a summoner or a Summoner Dedication, which Pathbuilder exports no pet for", () => {
    assert.ok(BFFBuilder.hasEidolon({ class: "Summoner", feats: [] }));
    assert.ok(BFFBuilder.hasEidolon({ class: "Fighter", dualClass: "Summoner", feats: [] }));
    assert.ok(BFFBuilder.hasEidolon({ class: "Barbarian", feats: [["Summoner Dedication", null, "Class Feat", 2]] }));
    assert.ok(!BFFBuilder.hasEidolon({ class: "Barbarian", feats: [["Swipe", null, "Class Feat", 2]] }));
  });

  it("finds a construct companion in a construct innovation or Prototype Companion", () => {
    assert.ok(BFFBuilder.hasConstruct({ specials: ["Overdrive", "Construct Innovation"], feats: [] }));
    assert.ok(BFFBuilder.hasConstruct({ specials: ["Weapon Innovation"], feats: [["Prototype Companion", null, "Class Feat", 1]] }));
    assert.ok(!BFFBuilder.hasConstruct({ specials: ["Armor Innovation"], feats: [] }));
  });
});
