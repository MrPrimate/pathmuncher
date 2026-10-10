/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */

import CONSTANTS from "../constants.js";
import logger from "../logger.js";
import utils from "../utils.js";

/**
 * The PetShop class looks for familiars in a Pathmunch data set and creates/updates as appropriate.
 */
export class PetShop {


  constructor ({ type = "familiar", parent, pathbuilderJson } = {}) {
    this.parent = parent;
    this.pathbuilderJson = pathbuilderJson;
    this.type = type;

    this.result = {
      pets: [],
      features: {},
    };

    this.bad = {};
    this.folders = {};
  }


  async ensureFolder(type) {
    const folderName = game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Folders.${type}`);
    this.folders[type] = await utils.getOrCreateFolder(this.parent.folder, "Actor", folderName);
  }

  async #existingPetCheck(petName, type) {
    const existingPet = game.actors.find((a) =>
      a.type === type.toLowerCase()
      && a.name === petName
      && a.system.master.id === this.parent._id,
    );

    if (existingPet) return existingPet.toObject();

    const actorData = {
      type: type.toLowerCase(),
      name: petName,
      system: {
        master: {
          id: this.parent._id,
          ability: this.parent.system.details.keyability.value,
        },
      },
      prototypeToken: {
        name: petName,
      },
      folder: this.folders[type].id,
    };
    const actor = await Actor.create(actorData);
    return actor.toObject();

  }

  #buildCore(petData) {
    foundry.utils.setProperty(petData, "system.attributes.value", this.parent.system.details.level.value * 5);
    return petData;
  }

  /**
   * The compendium entry for a Pathbuilder familiar ability, and the choice its name makes. Pathbuilder
   * names an ability with a choice by the option taken ("Damage Avoidance (Reflex)"), where pf2e has
   * one ability whose ChoiceSet takes it: { indexMatch, choice } with choice the option's slug, or null.
   */
  static abilityMatch(index, abilityName) {
    const sluggify = game.pf2e.system.sluggify;
    const exact = index.find((i) => i.system?.slug === sluggify(abilityName));
    if (exact) return { indexMatch: exact, choice: null };
    const [, baseName, option] = abilityName.match(/^(.+?)\s*\(([^)]+)\)$/) ?? [];
    const base = baseName ? index.find((i) => i.system?.slug === sluggify(baseName)) : undefined;
    return base ? { indexMatch: base, choice: sluggify(option) } : { indexMatch: undefined, choice: null };
  }

  /** Sets the option an ability's name chose on the ChoiceSet that offers it. Whether one did. */
  static applyAbilityChoice(doc, choice) {
    const rule = (doc.system.rules ?? []).find((r) => r.key === "ChoiceSet"
      && Array.isArray(r.choices) && r.choices.some((c) => c.value === choice));
    if (!rule) return false;
    rule.selection = choice;
    if (rule.flag) foundry.utils.setProperty(doc, `flags.${game.system.id}.rulesSelections.${rule.flag}`, choice);
    return true;
  }

  async #generatePetFeatures(pet, json) {
    const compendium = game.packs.get("pf2e.familiar-abilities") ?? game.packs.get("sf2e.familiar-abilities");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });
    this.result.features[pet._id] = [];
    this.bad[pet._id] = [];

    for (const featureName of json.abilities) {
      const { indexMatch, choice } = PetShop.abilityMatch(index, featureName);
      if (!indexMatch) {
        logger.warn(`Unable to match pet feature ${featureName}`, { pet, json, name: featureName });
        this.bad[pet._id].push({ pbName: featureName, type: "feature", details: { pet, json, name: featureName } });
        continue;
      }
      const doc = (await compendium.getDocument(indexMatch._id)).toObject();
      doc._id = foundry.utils.randomID();
      // an option the ability doesn't offer is left for the system to ask
      if (choice) PetShop.applyAbilityChoice(doc, choice);
      this.result.features[pet._id].push(doc);
    }
  }

  /** The abilities no compendium item matched, for the import report: [{ pbName: "<ability> (<pet>)", type: "familiar" }]. */
  get unmatched() {
    return this.result.pets.flatMap((pet) => (this.bad[pet._id] ?? [])
      .map((b) => ({ pbName: `${b.pbName} (${pet.name})`, type: "familiar", details: b.details })));
  }

  async buildPet(json) {
    const name = json.name === json.type || !json.name.includes("(")
      ? `${this.parent.name}'s ${json.type}`
      : json.name.split("(")[1].split(")")[0];
    const petData = await this.#existingPetCheck(name, json.type);
    const pet = this.#buildCore(petData);
    await this.#generatePetFeatures(pet, json);
    this.result.pets.push(pet);
  }

  async updatePets() {
    for (const petData of this.result.pets) {
      const actor = game.actors.get(petData._id);
      await actor.deleteEmbeddedDocuments("Item", [], { deleteAll: true });
      await actor.update(petData);
      await actor.createEmbeddedDocuments("Item", this.result.features[petData._id], { keepId: true });
    }
  }

  async processPets() {
    const petData = this.type === "familiar" && this.pathbuilderJson.familiars
      ? this.pathbuilderJson.familiars
      : this.pathbuilderJson.pets.filter((p) => this.type === p.type.toLowerCase());
    if (!petData || petData.length === 0) {
      logger.debug(`No ${this.type} data found in Pathbuilder JSON`, { pathbuilderJson: this.pathbuilderJson });
      return;
    }
    await this.ensureFolder(utils.capitalize(this.type));
    for (const petJson of petData) {
      await this.buildPet(petJson);
    }

    await this.updatePets();

    logger.debug("Pets", {
      results: this.result,
      bad: this.bad,
    });
  }

  async addPetEffects() {
    const features = [];
    for (const petData of this.result.pets) {
      for (const feature of this.result.features[petData._id].filter((f) => f.system.rules?.some((r) => r.key === "ActiveEffectLike"))) {
        if (!this.parent.items.some((i) => i.type === feature.type && i.system.slug === feature.system.slug)) {
          // copied onto the master as an imported item, so a re-import replaces it rather than asking
          features.push(foundry.utils.mergeObject(feature, { flags: { [CONSTANTS.FLAG_NAME]: { imported: true } } }, { inplace: false }));
        }
      }
    }
    await this.parent.createEmbeddedDocuments("Item", features);
  }

}
