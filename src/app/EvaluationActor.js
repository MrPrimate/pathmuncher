import utils from "../utils.js";

/**
 * The unsaved actors pathmuncher works out rules on before anything is written: the character as
 * processed so far. A ChoiceSet's options and selection, the item a GrantItem grants, and the
 * predicates of both are found on one of these, as the system would find them on the real actor
 * when the item is created. Nothing here touches the world.
 */
export class EvaluationActor {

  /** The parts of the import's result an evaluation actor has: the character's core items, feats and spellcasting. */
  static ITEM_LISTS = ["deity", "ancestry", "heritage", "background", "class", "lores", "feats", "casters"];

  /** @param {Pathmuncher} pm  the import, whose result so far the actors are made from */
  constructor(pm) {
    this.pm = pm;
    this.count = 0;
  }

  /**
   * An actor with the character as processed so far, and document on it: with the rules it has kept
   * so far while its own are worked out (rules), or its own rules until it has kept any. alongside
   * are items that stand in for the result's copy of the same item (a granting item with the rules
   * it has kept), or are added if the result has none.
   */
  build(document, { rules = [], alongside = [] } = {}) {
    const character = this.pm.result.character;
    const actorData = foundry.utils.mergeObject({ type: "character", flags: { pathmuncher: { temp: true } } }, character);
    actorData._id = foundry.utils.randomID();
    actorData.name = `Mr Temp (${character.name}) ${String(++this.count).padStart(4, "0")}`;
    // Skill Training offers the skills the character is not trained in: the build's final ranks would hide them
    if (document.name.split("(")[0].trim().toLowerCase() === "skill training") delete actorData.system.skills;

    const subject = rules.length > 0 ? { ...document, system: { ...document.system, rules } } : document;
    const replacements = new Map([...alongside, subject].map((item) => [item._id, item]));
    const items = EvaluationActor.ITEM_LISTS.flatMap((list) => this.pm.result[list])
      .map((item) => {
        const replacement = replacements.get(item._id);
        replacements.delete(item._id);
        return replacement ?? item;
      })
      .concat([...replacements.values()])
      .map((item) => this.#itemSource(item));
    return new Actor.implementation({ ...actorData, items });
  }

  /**
   * A copy of an item for an evaluation actor: with the items it grants at each level, and its rules
   * as they will be on the actor (a ChoiceSet's compendium query replaced by the options it found).
   */
  #itemSource(item) {
    const source = foundry.utils.duplicate(item);
    if (source.system.items) source.system.items = foundry.utils.deepClone(this.pm.autoAddedFeatureItems[source._id] ?? []);
    if (source.system.rules) {
      source.system.rules = source.system.rules.map((rule) => {
        if ((utils.isString(rule.choices) || utils.isObject(rule.choices)) && rule.choiceQueryResults) rule.choices = rule.choiceQueryResults;
        rule.ignored = false;
        return rule;
      });
    }
    return source;
  }

}
