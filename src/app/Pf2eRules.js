/**
 * The pf2e rule element internals pathmuncher uses to work out an item's choices and grants before
 * the system would: the only place that makes ChoiceSet and GrantItem rule elements or calls their
 * methods. pf2e does not offer these as an API, so when a system update changes them only this file
 * should need to follow. missing() lists what is no longer there; the module warns about it at start.
 */
export class Pf2eRules {

  /** The rule elements and methods this file relies on, by rule key. */
  static REQUIRED = {
    ChoiceSet: ["inflateChoices", "preCreate", "resolveInjectedProperties"],
    GrantItem: ["preCreate", "resolveInjectedProperties", "resolveValue", "test"],
  };

  /** What pathmuncher needs from the system and cannot find, as "ChoiceSet.inflateChoices": none when all is there. */
  static missing() {
    const all = game.pf2e?.RuleElements?.all ?? {};
    return Object.entries(Pf2eRules.REQUIRED).flatMap(([key, methods]) => (all[key]
      ? methods.filter((method) => typeof all[key].prototype[method] !== "function").map((method) => `${key}.${method}`)
      : [key]));
  }

  /** The rule element for a rule (a ChoiceSet or GrantItem source) on an item of an actor. */
  static ruleElement(rule, item) {
    const RuleElement = game.pf2e.RuleElements.all[rule.key];
    return new RuleElement(rule, { parent: item, suppressWarnings: true });
  }

  /** The roll options a rule on the item is tested against: the actor's, and the item's as a parent. */
  static rollOptions(actor, item) {
    return [actor.getRollOptions(), item.getRollOptions("parent")].flat();
  }

  /** Whether a rule element's predicate passes for the roll options, once its injected properties are resolved. */
  static predicatePasses(ruleElement, rollOptions) {
    return ruleElement.resolveInjectedProperties(ruleElement.predicate).test(rollOptions);
  }

  /** A ChoiceSet's options for the roll options, leaving out those the items already take. */
  static async choices(choiceSet, rollOptions, items = []) {
    return choiceSet.inflateChoices(rollOptions, items);
  }

  /**
   * Has the system make a ChoiceSet's selection as it would on creating the item: its preselection,
   * or the prompt it shows the user. The selection is written to ruleSource.selection.
   */
  static async makeSelection(choiceSet, { item, actor, ruleSource }) {
    await choiceSet.preCreate({
      itemSource: item,
      ruleSource,
      pendingItems: [item],
      tempItems: [],
      operation: { keepId: 1, parent: actor },
      reevaluation: true,
    });
  }

  /** The uuid a GrantItem grants, with its injected properties ("{item|flags...}") resolved. */
  static grantedUuid(grantItem) {
    return grantItem.resolveInjectedProperties(grantItem.uuid, { warn: false });
  }

  /** The items a GrantItem would create, as the system works them out on creating its item. */
  static async grantedItems(grantItem, { item, actor, ruleSource }) {
    const tempItems = [];
    await grantItem.preCreate({
      itemSource: item,
      ruleSource,
      pendingItems: [item],
      tempItems,
      context: { parent: actor, render: false },
      reevaluation: true,
      operation: { keepId: 0 },
      itemUpdates: [],
    });
    return tempItems;
  }

  /** A GrantItem's resolved value. */
  static resolvedValue(grantItem) {
    return grantItem.resolveValue();
  }

  /** Whether a GrantItem applies for the roll options. */
  static applies(grantItem, rollOptions) {
    return grantItem.test(rollOptions);
  }

}
