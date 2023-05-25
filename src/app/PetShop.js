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
      && a.system.master.id === this.parent._id
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
    setProperty(petData, "system.attributes.value", this.parent.system.details.level.value * 5);
    return petData;
  }

  async #generatePetFeatures(pet, json) {
    const compendium = game.packs.get("pf2e.familiar-abilities");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });
    this.result.features[pet._id] = [];
    this.bad[pet._id] = [];

    for (const featureName of json.abilities) {
      const indexMatch = index.find((i) => i.system.slug === game.pf2e.system.sluggify(featureName));
      if (!indexMatch) {
        logger.warn(`Unable to match pet feature ${featureName}`, { pet, json, name: featureName });
        this.bad[pet._id].push({ pbName: featureName, type: "feature", details: { pet, json, name: featureName } });
        continue;
      }
      const doc = (await compendium.getDocument(indexMatch._id)).toObject();
      doc._id = foundry.utils.randomID();
      this.result.features[pet._id].push(doc);
    }
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
    await this.ensureFolder(utils.capitalize(this.type));
    for (const petJson of petData) {
      await this.buildPet(petJson);
    }

    await this.updatePets();

    logger.debug("Pets", {
      results: this.results,
      bad: this.bad,
    });
  }

  async addPetEffects() {
    const features = [];
    for (const petData of this.result.pets) {
      for (const feature of this.result.features[petData._id].filter((f) => f.system.rules?.some((r) => r.key === "ActiveEffectLike"))) {
        if (!this.parent.items.some((i) => i.type === "effect" && i.system.slug === feature.system.slug)) {
          features.push(feature);
        }
      }
    }
    await this.parent.createEmbeddedDocuments("Item", features);
  }

}
