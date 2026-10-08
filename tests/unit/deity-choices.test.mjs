// Finding the choices a build made that its deity does not allow (Pathbuilder allows any).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDeityChoices,
  choiceSpecial,
  deityConflicts,
  deitySanctifications,
  replaceSpecials,
} from "../../src/app/DeityChoices.js";
import { fixture } from "./helpers.mjs";

// as in the pf2e deities compendium
const SARENRAE = {
  name: "Sarenrae",
  system: {
    domains: { primary: ["fire", "healing", "sun", "truth"], alternate: ["repose"] },
    font: ["heal"],
    sanctification: { modal: "can", what: ["holy"] },
  },
};
const GOZREH = {
  name: "Gozreh",
  system: { domains: { primary: ["air", "nature", "travel", "water"], alternate: [] }, font: ["heal"], sanctification: null },
};
const DESNA = {
  name: "Desna",
  system: { domains: { primary: ["dreams", "luck", "moon", "travel"], alternate: [] }, font: ["heal"], sanctification: { modal: "can", what: ["holy"] } },
};
const ASMODEUS = {
  name: "Asmodeus",
  system: { domains: { primary: ["confidence", "fire", "trickery", "tyranny"], alternate: [] }, font: ["harm"], sanctification: { modal: "must", what: ["unholy"] } },
};

const conflictsFor = (name, deity) => {
  const { build } = fixture(`generated/${name}`);
  return deityConflicts(deity, buildDeityChoices(build.specials, build.feats));
};

describe("buildDeityChoices", () => {
  it("reads a cleric's domain, font and sanctification", () => {
    const choices = buildDeityChoices(fixture("generated/cleric-01").build.specials);
    assert.deepEqual(choices.domains, [{ special: "Domain: Death", slug: "death" }]);
    assert.deepEqual(choices.font, { special: "Healing Font", value: "heal" });
    assert.deepEqual(choices.sanctification, { special: "Neither", value: "none" });
    assert.equal(choices.cause, null);
  });

  it("reads the sanctification a champion's cause needs", () => {
    assert.deepEqual(buildDeityChoices(fixture("generated/champion-01").build.specials).cause,
      { special: "Desecration Cause (Unholy)", name: "Desecration", value: "unholy" });
    assert.deepEqual(buildDeityChoices(["Justice Cause"]).cause, { special: "Justice Cause", name: "Justice", value: null });
  });

  it("reads Pathbuilder's Dragon domain as pf2e's Wyrmkin", () => {
    assert.deepEqual(buildDeityChoices(["Domain: Dragon"]).domains, [{ special: "Domain: Dragon", slug: "wyrmkin" }]);
  });
});

describe("deityConflicts", () => {
  it("finds a domain the deity does not grant", () => {
    assert.deepEqual(conflictsFor("cleric-01", SARENRAE), [{ kind: "domain", special: "Domain: Death", value: "death" }]);
  });

  it("finds a font the deity does not grant", () => {
    assert.deepEqual(conflictsFor("cleric-04", DESNA), [{ kind: "font", special: "Harmful Font", value: "harm" }]);
    assert.deepEqual(conflictsFor("cleric-03", GOZREH).map((c) => c.kind), ["domain", "font"]);
  });

  it("finds a cause whose sanctification the deity does not allow", () => {
    assert.deepEqual(conflictsFor("champion-01", SARENRAE).map((c) => c.special), ["Desecration Cause (Unholy)"]);
    assert.deepEqual(conflictsFor("champion-03", GOZREH).map((c) => c.special), ["Iniquity Cause (Unholy)"]);
  });

  it("allows no sanctification only when the deity does not demand one", () => {
    assert.deepEqual(deitySanctifications(SARENRAE), ["holy", "none"]);
    assert.deepEqual(deitySanctifications(ASMODEUS), ["unholy"]);
    assert.deepEqual(deityConflicts(ASMODEUS, buildDeityChoices(["Neither", "Harmful Font"])).map((c) => c.kind), ["sanctification"]);
  });

  it("allows a cause that needs no sanctification under any deity", () => {
    assert.deepEqual(deityConflicts(ASMODEUS, buildDeityChoices(["Obedience Cause"])), []);
  });

  it("allows an alternate domain only with Expanded Domain Initiate", () => {
    assert.equal(deityConflicts(SARENRAE, buildDeityChoices(["Domain: Repose"])).length, 1);
    assert.deepEqual(deityConflicts(SARENRAE, buildDeityChoices(["Domain: Repose"], [["Expanded Domain Initiate", null, "Class Feat", 4]])), []);
  });

  it("finds nothing for a build its deity allows", () => {
    assert.deepEqual(conflictsFor("champion-05", { system: { ...DESNA.system, domains: { primary: ["fate"] } } }), []);
    assert.deepEqual(conflictsFor("cleric-02", { system: { domains: { primary: [] }, font: ["heal"], sanctification: null } }), []);
  });
});

describe("choiceSpecial", () => {
  it("writes a replacement as Pathbuilder names it", () => {
    assert.equal(choiceSpecial("domain", "fire"), "Domain: Fire");
    assert.equal(choiceSpecial("font", "heal"), "Healing Font");
    assert.equal(choiceSpecial("sanctification", "none"), "Neither");
    assert.equal(choiceSpecial("cause", "holy", "Grandeur"), "Grandeur Cause (Holy)");
    assert.equal(choiceSpecial("cause", null, "Justice"), "Justice Cause");
  });

  it("replaces the conflicting specials and leaves the rest", () => {
    assert.deepEqual(replaceSpecials(["Deity", "Domain: Death", "Healing Font"], { "Domain: Death": "Domain: Fire" }),
      ["Deity", "Domain: Fire", "Healing Font"]);
  });
});
