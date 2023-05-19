/* eslint-disable no-await-in-loop */
import logger from "../logger.js";
import utils from "../utils.js";
import { Seasoning } from "./Seasoning.js";

export class CompendiumMatcher {

  constructor({ type, indexFields = ["name", "type", "system.slug"] } = {}) {
    this.type = type;
    this.indexFields = indexFields;
    this.packs = {};

    const packMappings = utils.setting("COMPENDIUM_MAPPINGS");
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

  getNameMatch(name, foundryName) {
    for (const [packName, index] of Object.entries(this.indexes)) {
      logger.debug(`Checking for compendium documents for ${name} (${foundryName}) in ${packName}`);
      const indexMatch = index.find((i) => i.system.slug === Seasoning.slug(foundryName))
        ?? index.find((i) => i.system.slug === Seasoning.slug(name));

      if (indexMatch) {
        return { i: indexMatch, pack: this.packs[packName] };
      }
    }
    return undefined;
  }


}
