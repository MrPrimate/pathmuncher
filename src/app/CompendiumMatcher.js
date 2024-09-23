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
      const indexMatch = index.find((i) => i.name === foundryName)
        ?? index.find((i) => i.name === pbName);

      if (indexMatch) {
        logger.debug(`Found name only compendium document for ${pbName} (${foundryName}) in ${packName} with id ${indexMatch._id}`);
        return { i: indexMatch, pack: this.packs[packName] };
      }
    }
    return undefined;
  }

  getSlugMatch(pbName, foundryName) {
    for (const [packName, index] of Object.entries(this.indexes)) {
      logger.debug(`Checking for compendium documents for ${pbName} (${foundryName}) in ${packName}`, {
        pbName,
        foundryName,
        packName,
        // index,
        // foundrySlug: Seasoning.slug(foundryName),
        // pbSlug: Seasoning.slug(pbName),
        // foundryMatch: index.find((i) => (i.system.slug ?? Seasoning.slug(i.name)) === Seasoning.slug(foundryName)),
        // pbMatch: index.find((i) => (i.system.slug ?? Seasoning.slug(i.name)) === Seasoning.slug(pbName)),
        // pbSlugMatch: (null ?? Seasoning.slug("Phase Bolt (Psychic)")) === Seasoning.slug("Phase Bolt (Psychic)"),
      });
      const indexMatch = index.find((i) => (i.system.slug ?? Seasoning.slug(i.name)) === Seasoning.slug(foundryName))
        ?? index.find((i) => (i.system.slug ?? Seasoning.slug(i.name)) === Seasoning.slug(pbName));

      if (indexMatch) {
        logger.debug(`Found slug based compendium document for ${pbName} (${foundryName}) in ${packName} with id ${indexMatch._id}`);
        return { i: indexMatch, pack: this.packs[packName] };
      }
    }
    return undefined;
  }

  getMatch(pbName, foundryName, forceName = false) {

    if (forceName) {
      const nameOnlyMatch = this.getNameMatch(pbName, foundryName);
      if (nameOnlyMatch) return nameOnlyMatch;
    }

    const slugMatch = this.getSlugMatch(pbName, foundryName);
    if (slugMatch) return slugMatch;

    return undefined;
  }

  static checkForFilters(i, filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (foundry.utils.getProperty(i, key) !== value) {
        return false;
      }
    }
    return true;
  }

  getNameMatchWithFilter(pbName, foundryName, filters = {}) {
    for (const [packName, index] of Object.entries(this.indexes)) {
      logger.debug(`Checking for compendium documents for ${pbName} (${foundryName}) in ${packName}`, {
        pbName,
        foundryName,
        filters,
        packName,
        // index,
      });
      const indexMatch = index.find((i) =>
        ((i.system.slug ?? Seasoning.slug(i.name)) === Seasoning.slug(foundryName))
          && CompendiumMatcher.checkForFilters(i, filters))
        ?? index.find((i) =>
          ((i.system.slug ?? Seasoning.slug(i.name)) === Seasoning.slug(pbName)
          && CompendiumMatcher.checkForFilters(i, filters)),
        );

      if (indexMatch) {
        logger.debug(`Found compendium document for ${pbName} (${foundryName}) in ${packName} with id ${indexMatch._id}`);
        return { i: indexMatch, pack: this.packs[packName] };
      }
    }

    return undefined;
  }


}
