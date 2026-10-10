// A Kineticist's gate thresholds, read from the order of Pathbuilder's specials.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BuildParser } from "../../src/app/BuildParser.js";
import { FeatureNames } from "../../src/app/FeatureNames.js";
import { ParsedEntry } from "../../src/app/ParsedEntry.js";
import { Seasoning } from "../../src/app/Seasoning.js";
import { kineticGateOwnJunctions, kineticGatePlan, kineticImpulseSlot } from "../../src/data/features.js";
import { fixture } from "./helpers.mjs";

const summary = (plan) => plan.map((e) => (e.path === "fork" ? "fork" : `${e.element} ${e.junction}`));

describe("kineticGatePlan", () => {
  it("reads each threshold, and each expansion's element and junction, in level order", () => {
    const expected = {
      "kineticist-01": ["air Skill", "fork", "earth Critical Blast", "fork"],
      "kineticist-02": ["fork", "earth Skill", "fork", "fire Aura"],
      "kineticist-03": ["fire Critical Blast", "fork", "fire Skill", "fork"],
      "kineticist-04": ["fork", "water Impulse", "fork", "water Aura"],
      "kineticist-05": ["water Skill", "fork", "water Aura", "fork"],
      "kineticist-06": ["fork", "air Aura", "fork", "wood Elemental Resistance"],
    };
    for (const [name, plan] of Object.entries(expected)) {
      assert.deepEqual(summary(kineticGatePlan(fixture(`edge/${name}`).build.specials)), plan, name);
    }
  });

  it("leaves out a single gate's first Impulse junction, which comes before any threshold", () => {
    const plan = kineticGatePlan(["Single Gate", "Air Impulse Junction", "Expand the Portal", "Air Gate Junction: Skill Junction"]);
    assert.deepEqual(plan.map((e) => [e.threshold, e.element, e.junction, e.special]), [[1, "air", "Skill", "Air Gate Junction: Skill Junction"]]);
    assert.deepEqual(plan[0].additions, ["Skill", "Skill Junction"]);
  });

  it("has no element or junction for an expansion Pathbuilder gives no junction special", () => {
    assert.deepEqual(kineticGatePlan(["Expand the Portal", "Fork the Path"]), [
      { threshold: 1, path: "expand" },
      { threshold: 2, path: "fork" },
    ]);
  });

  it("is empty for a build that is not a Kineticist", () => {
    assert.deepEqual(kineticGatePlan(fixture("142926-wizard20").build.specials), []);
  });
});

describe("kineticGateOwnJunctions", () => {
  it("is a single gate's Impulse junction, listed before any threshold", () => {
    assert.deepEqual(kineticGateOwnJunctions(fixture("edge/kineticist-01").build.specials), [
      { special: "Air Impulse Junction", additions: ["Impulse"] },
    ]);
  });

  it("is nothing for a dual gate, whose Impulse junction is an expansion's choice", () => {
    assert.deepEqual(kineticGateOwnJunctions(fixture("edge/kineticist-04").build.specials), []);
  });

  it("is settled with the gate when the build is read, so it is not reported as unmatched", () => {
    const source = BuildParser.normaliseSource(fixture("edge/kineticist-01").build);
    const names = new FeatureNames({ className: source.class, ancestry: source.ancestry, heritage: source.heritage });
    const pm = {
      source,
      parsed: { specials: [], feats: [], equipment: [], armor: [], weapons: [] },
      getFoundryFeatureName: (pbName) => names.foundryName(pbName),
    };
    const parser = new BuildParser(pm);
    parser.nameMap();
    parser.fixUps();
    for (const name of ["Air Impulse Junction", "Impulse"]) {
      assert.equal(pm.parsed.specials.find((e) => e.originalName === name)?.status, ParsedEntry.STATUS.INCLUDED, name);
    }
  });
});

describe("kineticImpulseSlot", () => {
  it("reads which gate or threshold choice took an impulse from Pathbuilder's slot label", () => {
    assert.deepEqual(kineticImpulseSlot("Single Gate Element Impulse Feat 1"), { gate: "single", index: 1 });
    assert.deepEqual(kineticImpulseSlot("Dual Gate Element 2 Impulse Feat 0"), { gate: "dual", element: 2 });
    assert.deepEqual(kineticImpulseSlot("Gate's Threshold (Level 5) Element Choice Impulse Feat 0"), { threshold: 5, path: "fork" });
    assert.deepEqual(kineticImpulseSlot("Gate's Threshold (Level 9) Impulse Feat"), { threshold: 9, path: "expand" });
  });

  it("is null for any other slot", () => {
    for (const label of ["Kineticist Feat 4", "Skill Feat 2", null, undefined]) assert.equal(kineticImpulseSlot(label), null, String(label));
  });

  it("gives an impulse a gate or threshold chooses no feat slot of its own", () => {
    const feature = { type: "Kineticist Feat", level: 1, featChoiceRef: "Single Gate Element Impulse Feat 0" };
    assert.equal(Seasoning.getFoundryFeatLocation(feature, { className: "Kineticist" }), null);
    const classFeat = { type: "Class Feat", level: 4, featChoiceRef: "Kineticist Feat 4" };
    assert.equal(Seasoning.getFoundryFeatLocation(classFeat, { className: "Kineticist" }), "class-4");
  });
});
