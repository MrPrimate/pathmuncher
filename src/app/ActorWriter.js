/* eslint-disable no-await-in-loop */
import CONSTANTS from "../constants.js";
import logger from "../logger.js";
import utils from "../utils.js";

/**
 * Writing a processed import to the actor: which of its items the import replaces (and which were
 * added by hand), creating the new items with the rules pathmuncher has already worked out, and
 * restoring those rules afterwards.
 */
export class ActorWriter {

  /** @param {Pathmuncher} pm  the import this works for, whose state it reads and adds to */
  constructor(pm) {
    this.pm = pm;
  }

  // the import's state, which this reads and adds to

  get actor() {
    return this.pm.actor;
  }

  get autoAddedFeatureItems() {
    return this.pm.autoAddedFeatureItems;
  }

  get boosts() {
    return this.pm.boosts;
  }

  get options() {
    return this.pm.options;
  }

  get processed() {
    return this.pm.processed;
  }

  get result() {
    return this.pm.result;
  }

  static COIN_SLUGS = ["platinum-pieces", "gold-pieces", "silver-pieces", "copper-pieces", "upb", "credstick"];

  /**
   * The import option that replaces this kind of item, or null for items an import never touches
   * (effects, conditions and any other type pathmuncher does not create).
   */
  static IMPORT_OPTION_BY_ITEM_TYPE = {
    treasure: "addTreasure",
    class: "addClass",
    deity: "addDeity",
    background: "addBackground",
    heritage: "addHeritage",
    ancestry: "addAncestry",
    feat: "addFeats",
    action: "addFeats",
    equipment: "addEquipment",
    backpack: "addEquipment",
    consumable: "addEquipment",
    book: "addEquipment",
    weapon: "addWeapons",
    armor: "addArmor",
    shield: "addArmor",
    lore: "addLores",
    spell: "addSpells",
    spellcastingEntry: "addSpells",
  };

  static importOptionForItem(item) {
    if (item.type === "treasure" && ActorWriter.COIN_SLUGS.includes(item.system?.slug)) return "addMoney";
    return ActorWriter.IMPORT_OPTION_BY_ITEM_TYPE[item.type] ?? null;
  }

  /** Items this import will replace: those whose import option is ticked. */
  #replaceableItems() {
    return this.actor.items.filter((i) => {
      const option = ActorWriter.importOptionForItem(i);
      return option !== null && this.options[option];
    });
  }

  /**
   * Items the import would replace that pathmuncher did not create: added by hand after an import
   * (homebrew, loot) or present before the first import. Items granted by one of these count with it.
   * Actors imported before pathmuncher flagged its items have no flagged items; for those, everything
   * in an imported category is treated as imported, as it always was.
   */
  findHandAddedItems() {
    const isImported = (item) => foundry.utils.getProperty(item, `flags.${CONSTANTS.FLAG_NAME}.imported`) === true;
    const legacyImport = !this.actor.items.some(isImported)
      && foundry.utils.hasProperty(this.actor, `flags.${CONSTANTS.FLAG_NAME}.addFeats`);
    if (legacyImport) return [];

    const ownedByImport = (item, seen = new Set()) => {
      if (isImported(item)) return true;
      const grantedBy = this.actor.items.get(item.flags[game.system.id]?.grantedBy?.id);
      if (!grantedBy || seen.has(grantedBy.id)) return false;
      seen.add(grantedBy.id);
      return ownedByImport(grantedBy, seen);
    };
    return this.#replaceableItems().filter((i) => !ownedByImport(i));
  }

  async #removeDocumentsToBeUpdated(keepItemIds) {
    const keep = new Set(keepItemIds);
    const deleteIds = this.#replaceableItems()
      .filter((i) => !keep.has(i.id))
      .map((i) => i.id);
    logger.debug("Removing items before import", { deleteIds, keepItemIds });
    await this.actor.deleteEmbeddedDocuments("Item", deleteIds);
  }

  async #createAndUpdateItemsWithRuleRestore(items) {
    const ruleUpdates = [];

    const newItems = foundry.utils.deepClone(items);

    for (const item of newItems) {
      // marks the item as pathmuncher's, so a re-import can tell it from items added by hand
      foundry.utils.setProperty(item, `flags.${CONSTANTS.FLAG_NAME}.imported`, true);
      if (item.system.rules?.length > 0) {
        ruleUpdates.push({
          _id: item._id,
          system: {
            rules: foundry.utils.deepClone(item.system.rules).map((r) => {
              delete r.choiceQueryResults;
              return r;
            }),
          },
        });
        item.system.rules = item.system.rules
          .filter((r) => {
            const excludedKeys = ["ActiveEffectLike", "AdjustModifier", "Resistance", "Strike"].includes(r.key);
            const grantItemWithFlags = ["GrantItem"].includes(r.key)
              && (foundry.utils.hasProperty(r, "flag") || foundry.utils.getProperty(r, "pathmuncherImport"));
            const objectSelection = ["ChoiceSet"].includes(r.key) && utils.isObject(r.selection);
            return !excludedKeys && !grantItemWithFlags && !objectSelection;
          })
          .map((r) => {
            if (r.key === "ChoiceSet") {
              if ((utils.isString(r.choices) || utils.isObject(r.choices)) && r.choiceQueryResults) {
                r.choices = r.choiceQueryResults;
              }
              if (Array.isArray(r.choices)) {
                r.choices = r.choices.map((c) => {
                  delete c.predicate;
                  return c;
                });
              }
            }
            if (r.pathmuncherImport) r.pathmuncherImport = undefined;
            return r;
          });
      }
    }

    logger.debug(`Creating items ${newItems.map((i) => i.name).join(", ")}`, newItems);
    await this.actor.createEmbeddedDocuments("Item", newItems, { keepId: true });
    logger.debug("Rule updates", ruleUpdates);
    await this.actor.updateEmbeddedDocuments("Item", ruleUpdates);
  }

  async #updateItems(type) {
    logger.debug(`Updating ${type}`, this.result[type]);
    await this.actor.updateEmbeddedDocuments("Item", this.result[type]);
  }

  async #createActorEmbeddedDocuments() {
    this.pm.statusUpdate(1, 12, "Character", "Eating");
    if (this.options.addDeity) await this.#createAndUpdateItemsWithRuleRestore(this.result.deity);
    if (this.options.addAncestry) await this.#createAndUpdateItemsWithRuleRestore(this.result.ancestry);
    if (this.options.addHeritage) await this.#createAndUpdateItemsWithRuleRestore(this.result.heritage);
    if (this.options.addBackground) await this.#createAndUpdateItemsWithRuleRestore(this.result.background);
    if (this.options.addClass) await this.#createAndUpdateItemsWithRuleRestore(this.result.class);
    if (this.options.addLores) await this.#createAndUpdateItemsWithRuleRestore(this.result.lores);

    if (this.options.addFeats) {
      // one at a time, in order: the system evaluates a feat's choices against the items already on
      // the actor (Psi Development's psi cantrip depends on The Tangible Dream), so a single batch
      // makes it prompt with no options
      const featCount = this.result.feats.length;
      for (const [i, feat] of this.result.feats.entries()) {
        this.pm.statusUpdate(i, featCount, "Feats", "Eating");
        await this.#createAndUpdateItemsWithRuleRestore([feat]);
      }
    }
    if (this.options.addSpells) {
      this.pm.statusUpdate(3, 12, "Spells", "Eating");
      await this.#createAndUpdateItemsWithRuleRestore(this.result.casters);
      await this.#createAndUpdateItemsWithRuleRestore(this.result.spells);
    }
    this.pm.statusUpdate(4, 12, "Equipment", "Eating");
    if (this.options.addEquipment) {
      await this.#createAndUpdateItemsWithRuleRestore(this.result.equipment);
      await this.#updateItems("equipment");
    }
    if (this.options.addWeapons) await this.#createAndUpdateItemsWithRuleRestore(this.result.weapons);
    if (this.options.addArmor) {
      await this.#createAndUpdateItemsWithRuleRestore(this.result.armor);
      await this.#updateItems("armor");
    }
    if (this.options.addTreasure) await this.#createAndUpdateItemsWithRuleRestore(this.result.treasure);
    if (this.options.addMoney) await this.#createAndUpdateItemsWithRuleRestore(this.result.money);
  }

  async #restoreEmbeddedRuleLogic() {
    const importedItems = this.actor.items.map((i) => i._id);
    // Loop back over items and add rule and item progression data back in.
    logger.debug("Restoring logic", () => ({ currentActor: foundry.utils.duplicate(this.actor) }));
    const itemUpdates = [];
    for (const [key, value] of Object.entries(this.autoAddedFeatureItems)) {
      if (importedItems.includes(key)) {
        itemUpdates.push({
          _id: `${key}`,
          system: {
            items: foundry.utils.deepClone(value),
          },
        });
      }
    }
    this.pm.statusUpdate(1, 12, "Feats", "Clearing");
    logger.debug("Restoring granted item logic", itemUpdates);
    await this.actor.updateEmbeddedDocuments("Item", itemUpdates);

    const focus = foundry.utils.getProperty(this.result.character, "system.resources.focus");
    if (focus) await this.actor.update({ "system.resources.focus": focus });
  }

  /**
   * Replaces the actor's imported items with the processed result.
   * keepItemIds: items in replaced categories to keep anyway; defaults to every item added by hand
   * (findHandAddedItems), so nothing pathmuncher did not create is removed unless asked.
   */
  async updateActor({ keepItemIds = this.findHandAddedItems().map((i) => i.id) } = {}) {
    // removing the actor's items is only safe once a complete result has been built
    if (!this.processed) {
      throw new Error("Pathmuncher: updateActor called before processCharacter completed");
    }
    await this.#removeDocumentsToBeUpdated(keepItemIds);

    if (!this.options.addName) {
      delete this.result.character.name;
      delete this.result.character.prototypeToken.name;
    }
    if (!this.options.addFormulas) {
      delete this.result.character.system.crafting?.formulas;
    }

    if (!this.boosts.custom) {
      foundry.utils.setProperty(this.result.character, `system.abilities`, null);
    }

    logger.debug("Generated result", this.result);
    await this.actor.update(this.result.character);
    await this.#createActorEmbeddedDocuments();
    await this.#restoreEmbeddedRuleLogic();
  }


}
