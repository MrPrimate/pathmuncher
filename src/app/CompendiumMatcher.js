/* eslint-disable no-await-in-loop */
import CONSTANTS from "../constants.js";
import logger from "../logger.js";
import utils from "../utils.js";
import { Seasoning } from "./Seasoning.js";

export class CompendiumMatcher {

  constructor({ type, mappings = null, indexFields = ["name", "type", "system.slug"] } = {}) {
    this.type = type;
    this.indexFields = indexFields;
    this.packs = {};

    const packMappings = mappings !== null
      ? mappings
      : utils.setting("USE_CUSTOM_COMPENDIUM_MAPPINGS")
        ? utils.setting("CUSTOM_COMPENDIUM_MAPPINGS")
        : CONSTANTS.CORE_COMPENDIUM_MAPPINGS;
    packMappings[type].forEach((name) => {
      const compendium = game.packs.get(name);
      if (compendium) {
        this.packs[name] = compendium;
      }
    });

    this.indexes = {

    };

  }

  async loadCompendiums() {
    for (const [name, compendium] of Object.entries(this.packs)) {
      this.indexes[name] = await compendium.getIndex({ fields: this.indexFields });
    }
  }


  getFoundryFeatureName(pbName) {
    const match = this.FEAT_RENAME_MAP(pbName).find((map) => map.pbName == pbName);
    return match ?? { pbName, foundryName: pbName, details: undefined };
  }

  getNameMatch(pbName, foundryName) {
    for (const [packName, index] of Object.entries(this.indexes)) {
      logger.debug(`Checking for compendium documents for ${pbName} (${foundryName}) in ${packName}`);
      const indexMatch = index.find((i) => (i.system.slug ?? Seasoning.slug(i.name)) === Seasoning.slug(foundryName))
        ?? index.find((i) => (i.system.slug ?? Seasoning.slug(i.name)) === Seasoning.slug(pbName));

      if (indexMatch) {
        logger.debug(`Found compendium document for ${pbName} (${foundryName}) in ${packName} with id ${indexMatch._id}`);
        return { i: indexMatch, pack: this.packs[packName] };
      }
    }

    return undefined;
  }

  static checkForFilters(i, filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (getProperty(i, key) !== value) {
        return false;
      }
    }
    return true;
  }

  getNameMatchWithFilter(pbName, foundryName, filters = {}) {
    for (const [packName, index] of Object.entries(this.indexes)) {
      logger.debug(`Checking for compendium documents for ${pbName} (${foundryName}) in ${packName}`);
      const indexMatch = index.find((i) =>
        ((i.system.slug ?? Seasoning.slug(i.name)) === Seasoning.slug(foundryName))
          && CompendiumMatcher.checkForFilters(i, filters))
        ?? index.find((i) =>
          ((i.system.slug ?? Seasoning.slug(i.name)) === Seasoning.slug(pbName)
          && CompendiumMatcher.checkForFilters(i, filters))
        );

      if (indexMatch) {
        logger.debug(`Found compendium document for ${pbName} (${foundryName}) in ${packName} with id ${indexMatch._id}`);
        return { i: indexMatch, pack: this.packs[packName] };
      }
    }

    return undefined;
  }


}
