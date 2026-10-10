/**
 * The pf2e rule element internals pathmuncher uses to work out an item's choices and grants before
 * the system would: the only place that makes ChoiceSet and GrantItem rule elements or calls their
 * methods. pf2e does not offer these as an API, so when a system update changes them only this file
 * should need to follow. missing() lists what is no longer there; the module warns about it at start.
 */
export class Pf2eRules {

  /** The rule elements and methods this file relies on, by rule key. */
  static REQUIRED = {
    ChoiceSet: ["inflateChoices", "preCreate", "queryCompendium", "resolveInjectedProperties"],
    GrantItem: ["preCreate", "resolveInjectedProperties", "resolveValue", "test"],
  };

  /** What pathmuncher needs from the system and cannot find, as "ChoiceSet.inflateChoices": none when all is there. */
  static missing() {
    const all = game.pf2e?.RuleElements?.all ?? {};
    return Object.entries(Pf2eRules.REQUIRED).flatMap(([key, methods]) => (all[key]
      ? methods.filter((method) => typeof all[key].prototype[method] !== "function").map((method) => `${key}.${method}`)
      : [key]));
  }

  /**
   * The rule element for a rule (a ChoiceSet or GrantItem source) on an item of an actor. Given a
   * CompendiumQueries, a ChoiceSet's compendium options come from it rather than the system's own query.
   */
  static ruleElement(rule, item, { queries = null } = {}) {
    const RuleElement = game.pf2e.RuleElements.all[rule.key];
    const ruleElement = new RuleElement(rule, { parent: item, suppressWarnings: true });
    if (queries && rule.key === "ChoiceSet") {
      ruleElement.queryCompendium = (choices, rollOptions, pendingItems) => queries.query(ruleElement, choices, rollOptions, pendingItems);
    }
    return ruleElement;
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

/**
 * A ChoiceSet's options from a compendium filter ("any 1st-level wizard feat"), as the system's
 * ChoiceSet.queryCompendium finds them, for one import. The system makes an item of every entry of
 * every pack it searches on each query, about a second each time; an import asks for the options of
 * a ChoiceSet more than once and of many ChoiceSets, so here each pack's items, and their roll
 * options, are made once and kept for the import's later queries.
 */
export class CompendiumQueries {

  // the index fields the system's query reads, so its items have everything its filters test
  static INDEX_FIELDS = [
    "flags", "system.ancestry", "system.baseItem", "system.category", "system.damage.damageType",
    "system.group", "system.level", "system.maxTakable", "system.range", "system.runes",
    "system.sanctification", "system.slug", "system.traits", "system.usage",
  ];

  // "<pack>|<item type>" -> [{ item, options }]
  #candidates = new Map();

  async #packCandidates(pack, itemType) {
    const key = `${pack.collection}|${itemType}`;
    if (!this.#candidates.has(key)) {
      const index = await pack.getIndex({ fields: CompendiumQueries.INDEX_FIELDS });
      this.#candidates.set(key, index.contents
        .filter((entry) => entry.type === itemType)
        .map((entry) => {
          const item = new CONFIG.Item.documentClass(foundry.utils.deepClone(entry), { pack: pack.collection });
          return { item, options: item.getRollOptions("item") };
        }));
    }
    return this.#candidates.get(key);
  }

  /** The options for a ChoiceSet's compendium choices, as { value, label, img }, like ChoiceSet.queryCompendium. */
  async query(choiceSet, choices, rollOptions = [], pendingItems = []) {
    const filter = Array.isArray(choices.filter)
      ? new game.pf2e.Predicate(choiceSet.resolveInjectedProperties(choices.filter))
      : null;
    // an unusable filter: the system's own query reports it
    if (!filter?.isValid || filter.length === 0) {
      return Object.getPrototypeOf(choiceSet).queryCompendium.call(choiceSet, choices, rollOptions, pendingItems);
    }

    const itemType = Object.hasOwn(CONFIG.PF2E.Item.documentClasses, choices.itemType) ? choices.itemType : "feat";
    const packs = typeof choices.pack === "string"
      ? [game.packs.get(choices.pack)].filter(Boolean)
      : game.packs.filter((p) => p.metadata.type === "Item" && p.index.some((e) => e.type === itemType));
    const candidates = (await Promise.all(packs.map((pack) => this.#packCandidates(pack, itemType)))).flat();
    // world items can change during an import, so they are not kept
    candidates.push(...game.items.filter((i) => i.type === itemType).map((item) => ({ item, options: item.getRollOptions("item") })));

    const parentOptions = choiceSet.item.getRollOptions("parent");
    const matching = candidates
      .filter(({ options }) => filter.test([...options, ...parentOptions, ...rollOptions]))
      .map(({ item }) => item);

    // feats taken as often as they can be, on the actor or about to be created with the item, are left out
    const slug = (i) => i.slug ?? game.pf2e.system.sluggify(i.name);
    const taken = new Map();
    for (const feat of [...choiceSet.actor.itemTypes.feat, ...pendingItems.filter((i) => i.type === "feat")]) {
      taken.set(slug(feat), (taken.get(slug(feat)) ?? 0) + 1);
    }
    const actorHeritages = choiceSet.actor.itemTypes.heritage.map(slug);
    return matching
      .filter((i) => (i.isOfType("feat")
        ? (taken.get(slug(i)) ?? 0) < i.maxTakable
        : !i.isOfType("heritage") || !actorHeritages.includes(slug(i))))
      .map((i) => ({
        value: choices.slugsAsValues ? slug(i) : i.uuid,
        label: i.name,
        img: i.img,
      }));
  }

}
