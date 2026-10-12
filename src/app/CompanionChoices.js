/**
 * Answers for the choices a companion's items make (PF2e Companion Compendia) that Pathbuilder's export
 * leaves out: a companion's size, and an eidolon's key attribute, attacks, attribute boosts and
 * Transcendence increase, and the damage of an evolution feat. Each answer is the last import's where
 * the companion had one, what the build says (Energy Heart's damage type), or a default, which is noted
 * as guessed for the import notes.
 */
export class CompanionChoices {

  // the attributes in the order an eidolon boosts them, after its key attribute
  static BOOST_ORDER = ["con", "str", "dex", "wis", "cha", "int"];

  /**
   * @param {object} options
   * @param {object} [options.previous]     the eidolon's earlier answers, by "<item slug>:<flag>"
   * @param {string[]} [options.energyHeart]  the damage types the build's Energy Heart takes
   * @param {string} [options.element]        an elemental eidolon's element ("air")
   */
  constructor({ previous = {}, energyHeart = [], element = null } = {}) {
    this.previous = previous;
    this.energyHeart = energyHeart;
    this.element = element;
    // the key attribute, once chosen, which boosts and Transcendence favour
    this.keyAttribute = "str";
    // { item, choice } for each answer that was a default
    this.guessed = [];
    // the attributes each boost feature has boosted: a level's four boosts are all different
    this.boosted = {};
  }

  /** The attribute a boost choice is for, from its label ("PF2E.AbilityStr", or "Strength" once localized), or null. */
  static attribute(choice) {
    const label = String(choice.label ?? "");
    const [, short] = label.match(/Ability(Str|Dex|Con|Int|Wis|Cha)$/) ?? [];
    if (short) return short.toLowerCase();
    return ["str", "dex", "con", "int", "wis", "cha"]
      .find((a) => game.i18n.localize(`PF2E.Ability${a.charAt(0).toUpperCase()}${a.slice(1)}`) === label) ?? null;
  }

  static #same(a, b) {
    return a === b || JSON.stringify(a) === JSON.stringify(b);
  }

  /** The build's or the default answer for a choice, before the last import's is considered. */
  #fromBuild(itemSlug, flag, choices) {
    const pick = (test) => choices.find(test);
    if (flag === "companionSize") return pick((c) => c.value === "med");
    if (flag === "eidolonKAS") return pick((c) => c.value?.type === "strength");
    if (flag === "abilityIncrease") return pick((c) => c.value === this.keyAttribute);
    if ((/^abilityBoost/).test(flag ?? "")) {
      const boosted = this.boosted[itemSlug] ?? [];
      for (const attribute of [this.keyAttribute, ...CompanionChoices.BOOST_ORDER].filter((a) => !boosted.includes(a))) {
        const choice = pick((c) => CompanionChoices.attribute(c) === attribute);
        if (choice) return choice;
      }
    }
    if (flag === "element" && this.element) return { value: this.element, fromBuild: true };
    if (flag === "damageChoice" && itemSlug === "energy-heart-cc") return { value: this.energyHeart[0], fromBuild: true };
    if (flag === "damageChoice" && itemSlug === "dual-energy-heart-cc") return { value: this.energyHeart[1], fromBuild: true };
    return null;
  }

  /**
   * The choice to make for one of an item's ChoiceSets: { choice, guessed }. A choice the build or the
   * last import settles is not guessed; a default is.
   */
  answer({ itemName, itemSlug, flag, choices }) {
    const earlier = this.previous[`${itemSlug}:${flag}`];
    const previous = earlier === undefined ? null : choices.find((c) => CompanionChoices.#same(c.value, earlier));
    const settled = this.#fromBuild(itemSlug, flag, choices);
    const fromBuild = settled?.fromBuild ? choices.find((c) => c.value === settled.value) : null;
    const choice = previous ?? fromBuild ?? (settled?.fromBuild ? null : settled) ?? choices[0];
    if (flag === "eidolonKAS" && choice?.value?.type) this.keyAttribute = choice.value.type.slice(0, 3);
    if ((/^abilityBoost/).test(flag ?? "") && choice) (this.boosted[itemSlug] ??= []).push(CompanionChoices.attribute(choice));
    const guessed = !previous && !fromBuild;
    if (guessed && choice) this.guessed.push({ item: itemName, choice: game.i18n.localize(choice.label) });
    return { choice, guessed };
  }

}
