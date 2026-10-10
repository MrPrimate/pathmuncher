// Checking the system still has the rule element internals pathmuncher uses.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Pf2eRules } from "../../src/app/Pf2eRules.js";

class RuleElement {
  resolveInjectedProperties() {}

  test() {}
}
class ChoiceSet extends RuleElement {
  inflateChoices() {}

  preCreate() {}

  queryCompendium() {}
}
class GrantItem extends RuleElement {
  preCreate() {}

  resolveValue() {}
}

const original = game.pf2e;
afterEach(() => {
  game.pf2e = original;
});

describe("Pf2eRules.missing", () => {
  it("finds everything in a system that has it, inherited methods included", () => {
    game.pf2e = { ...original, RuleElements: { all: { ChoiceSet, GrantItem } } };
    assert.deepEqual(Pf2eRules.missing(), []);
  });

  it("names the methods and rule elements a system no longer has", () => {
    class OldChoiceSet extends RuleElement {
      preCreate() {}
    }
    game.pf2e = { ...original, RuleElements: { all: { ChoiceSet: OldChoiceSet } } };
    assert.deepEqual(Pf2eRules.missing(), ["ChoiceSet.inflateChoices", "ChoiceSet.queryCompendium", "GrantItem"]);
  });

  it("names them all when there are no rule elements at all", () => {
    game.pf2e = { ...original };
    assert.deepEqual(Pf2eRules.missing(), ["ChoiceSet", "GrantItem"]);
  });
});
