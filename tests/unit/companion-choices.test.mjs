// The answers BFFBuilder gives the choices a companion's items ask for (CompanionChoices).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CompanionChoices } from "../../src/app/CompanionChoices.js";

const attributes = ["Str", "Dex", "Con", "Int", "Wis", "Cha"].map((a) => ({ label: `PF2E.Ability${a}`, value: `uuid-${a.toLowerCase()}` }));
const boost = (choices, flag) => choices.answer({ itemName: "Eidolon Ability Boosts (5th)", itemSlug: "eidolon-ability-boosts-5th", flag, choices: attributes });

describe("CompanionChoices", () => {
  it("boosts the key attribute, then Constitution and the rest, never one twice at a level", () => {
    const choices = new CompanionChoices();
    choices.answer({ itemName: "Eidolon", itemSlug: "eidolon", flag: "eidolonKAS", choices: [
      { label: "PF2E.AbilityStr", value: { type: "strength" } }, { label: "PF2E.AbilityDex", value: { type: "dexterity" } },
    ] });
    const picked = ["abilityBoostOne", "abilityBoostTwo", "abilityBoostThree", "abilityBoostFour"]
      .map((flag) => boost(choices, flag).choice.value);
    assert.deepEqual(picked, ["uuid-str", "uuid-con", "uuid-dex", "uuid-wis"]);
  });

  it("gives the last import's answer, and the build's, without noting them as guessed", () => {
    const choices = new CompanionChoices({ previous: { "eidolon-ability-boosts-5th:abilityBoostOne": "uuid-cha" }, energyHeart: ["cold"] });
    assert.equal(boost(choices, "abilityBoostOne").choice.value, "uuid-cha");
    const heart = choices.answer({ itemName: "Energy Heart (CC)", itemSlug: "energy-heart-cc", flag: "damageChoice", choices: [
      { label: "Acid", value: "acid" }, { label: "Cold", value: "cold" },
    ] });
    assert.equal(heart.choice.value, "cold");
    assert.deepEqual(choices.guessed, []);
  });

  it("notes a default as guessed", () => {
    const choices = new CompanionChoices();
    const { choice, guessed } = choices.answer({ itemName: "Horse", itemSlug: "horse", flag: "companionSize", choices: [
      { label: "Small", value: "sm" }, { label: "Medium", value: "med" },
    ] });
    assert.equal(choice.value, "med");
    assert.ok(guessed);
    assert.deepEqual(choices.guessed, [{ item: "Horse", choice: "Medium" }]);
  });
});
