// Accepting and normalising Pathbuilder exports before anything touches the actor.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Pathmuncher } from "../../src/app/Pathmuncher.js";
import { fixture } from "./helpers.mjs";

describe("Pathmuncher.getBuildFromJson", () => {
  const exportJson = fixture("314710-gunslinger1");

  it("takes the build from a full Pathbuilder export", () => {
    assert.equal(Pathmuncher.getBuildFromJson(exportJson), exportJson.build);
  });

  it("takes a bare build object pasted without the { success, build } wrapper", () => {
    assert.equal(Pathmuncher.getBuildFromJson(exportJson.build), exportJson.build);
  });

  it("rejects a failed export", () => {
    assert.equal(Pathmuncher.getBuildFromJson({ success: false }), null);
    assert.equal(Pathmuncher.getBuildFromJson({ success: false, build: exportJson.build }), null);
  });

  it("rejects JSON that is not a Pathbuilder build", () => {
    for (const value of [null, undefined, "text", 42, [], {}, { hello: "world" }, { build: {} }]) {
      assert.equal(Pathmuncher.getBuildFromJson(value), null, JSON.stringify(value));
    }
  });

  it("rejects a build missing the fields the import relies on", () => {
    for (const key of ["name", "class", "feats", "abilities"]) {
      const build = structuredClone(exportJson.build);
      delete build[key];
      assert.equal(Pathmuncher.getBuildFromJson(build), null, `without ${key}`);
    }
  });
});

describe("Pathmuncher.normaliseSource", () => {
  it("fills in what a 2020-era export leaves out", () => {
    const build = fixture("142926-wizard20").build;
    assert.equal(build.equipmentContainers, undefined, "fixture premise");
    assert.equal(build.spellCasters[0].blendedSpells, undefined, "fixture premise");

    Pathmuncher.normaliseSource(build);

    assert.deepEqual(build.equipmentContainers, {});
    assert.deepEqual(build.focus, {});
    assert.deepEqual(build.rituals, []);
    assert.deepEqual(build.familiars, []);
    assert.deepEqual(build.inventorMods, []);
    for (const caster of build.spellCasters) {
      assert.deepEqual(caster.blendedSpells, []);
      assert.ok(Array.isArray(caster.prepared));
      assert.equal(caster.perDay.length, 11);
      assert.equal(caster.innate, false);
    }
  });

  it("leaves a current export's data as it was", () => {
    const original = fixture("315329-magus9").build;
    const build = Pathmuncher.normaliseSource(structuredClone(original));
    assert.deepEqual(build, original);
  });

  it("pads short perDay arrays and missing coins with zeroes", () => {
    const build = structuredClone(fixture("315329-magus9").build);
    build.spellCasters[0].perDay = [5, 4];
    delete build.money.pp;
    Pathmuncher.normaliseSource(build);
    assert.deepEqual(build.spellCasters[0].perDay, [5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.equal(build.money.pp, 0);
  });

  it("replaces wrongly typed collections rather than throwing later", () => {
    const build = structuredClone(fixture("314710-gunslinger1").build);
    build.equipmentContainers = null;
    build.specials = "nope";
    build.formula = [{ type: "other" }];
    Pathmuncher.normaliseSource(build);
    assert.deepEqual(build.equipmentContainers, {});
    assert.deepEqual(build.specials, []);
    assert.deepEqual(build.formula[0].known, []);
  });

  it("does not invent a focus pool for exports without one", () => {
    const build = fixture("142926-wizard20").build;
    Pathmuncher.normaliseSource(build);
    assert.equal(build.focusPoints, undefined);
  });
});
