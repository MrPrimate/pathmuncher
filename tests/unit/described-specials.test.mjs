// Finding Pathbuilder specials in the sections of another feature's description.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Seasoning } from "../../src/app/Seasoning.js";
import { remasterTermNames } from "../../src/data/features.js";

describe("Seasoning.describedSections", () => {
  it("reads a bold lead-in as a section, up to the end of its paragraph or list item", () => {
    const html = `<p>You are an undead creature.</p>
      <p><strong>Void Healing:</strong> You are damaged by vitality damage.</p>
      <ul><li><b>Undead Hunger</b>. While you don't eat, you can.</li></ul>`;
    assert.deepEqual(Seasoning.describedSections(html), [
      { term: "Void Healing", text: "You are damaged by vitality damage." },
      { term: "Undead Hunger", text: "While you don't eat, you can." },
    ]);
  });

  it("reads a heading as a section, up to the next heading", () => {
    const html = "<p>Intro</p><h3>Dirge</h3><p>Your dirge holds</p><p>five cantrips.</p><h3>Thralls</h3><p>Expendable.</p>";
    assert.deepEqual(Seasoning.describedSections(html), [
      { term: "Dirge", text: "Your dirge holds five cantrips." },
      { term: "Thralls", text: "Expendable." },
    ]);
  });

  it("leaves out bold text in the middle of a paragraph", () => {
    assert.deepEqual(Seasoning.describedSections("<p>You gain a <strong>+1 circumstance bonus</strong>.</p>"), []);
  });

  it("keeps the labels of enrichers and drops their syntax", () => {
    const html = "<p><strong>Immunity to Death Effects:</strong> See @UUID[Compendium.pf2e.x.Item.y]{Death} and @Damage[(2d6)[fire]].</p>";
    assert.deepEqual(Seasoning.describedSections(html), [
      { term: "Immunity to Death Effects", text: "See Death and ." },
    ]);
  });
});

describe("remasterTermNames", () => {
  it("adds the remastered name of a renamed rules term", () => {
    assert.deepEqual(remasterTermNames("Negative Healing"), ["Negative Healing", "Void Healing"]);
    assert.deepEqual(remasterTermNames("Positive Energy Resistance"), ["Positive Energy Resistance", "Vitality Energy Resistance"]);
  });

  it("leaves other names alone", () => {
    assert.deepEqual(remasterTermNames("Undead Hunger"), ["Undead Hunger"]);
    assert.deepEqual(remasterTermNames("Nonnegative"), ["Nonnegative"]);
  });
});
