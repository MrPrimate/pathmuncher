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
      delete this.#slugMaps[name];
    }
  }

  /** An index entry's slug: its own, or its name's. */
  static entrySlug(i) {
    return i.system?.slug ?? Seasoning.slug(i.name);
  }

  // each pack's entries by slug, with their place in the index, built on first use
  #slugMaps = {};

  #slugMap(packName) {
    if (!this.#slugMaps[packName]) {
      const map = new Map();
      let position = 0;
      for (const i of this.indexes[packName] ?? []) {
        const slug = CompendiumMatcher.entrySlug(i);
        if (!map.has(slug)) map.set(slug, []);
        map.get(slug).push({ i, position: position++ });
      }
      this.#slugMaps[packName] = map;
    }
    return this.#slugMaps[packName];
  }

  /**
   * The pack's first entry, in index order, whose slug is one of slugs and that passes the filters
   * (see checkForFilters). A map lookup rather than a scan of the pack's index.
   */
  findBySlugs(packName, slugs, filters = {}) {
    const map = this.#slugMap(packName);
    let first = null;
    for (const slug of new Set(slugs)) {
      for (const entry of map.get(slug) ?? []) {
        if (first && entry.position > first.position) break;
        if (CompendiumMatcher.checkForFilters(entry.i, filters)) {
          first = entry;
          break;
        }
      }
    }
    return first?.i;
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
    const foundrySlug = Seasoning.slug(foundryName);
    const pbSlug = Seasoning.slug(pbName);
    for (const packName of Object.keys(this.indexes)) {
      const indexMatch = this.findBySlugs(packName, [foundrySlug]) ?? this.findBySlugs(packName, [pbSlug]);
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

  /** Whether an index entry passes every filter: a value it must equal, or a test its value must pass. */
  static checkForFilters(i, filters) {
    for (const [key, value] of Object.entries(filters)) {
      const property = foundry.utils.getProperty(i, key);
      if (typeof value === "function" ? !value(property) : property !== value) {
        return false;
      }
    }
    return true;
  }

  getNameMatchWithFilter(pbName, foundryName, filters = {}) {
    const foundrySlug = Seasoning.slug(foundryName);
    const pbSlug = Seasoning.slug(pbName);
    logger.debug(`Looking for compendium document for ${pbName} (${foundryName}) with filters`, { pbName, foundryName, filters, foundrySlug, pbSlug });
    for (const packName of Object.keys(this.indexes)) {
      const indexMatch = this.findBySlugs(packName, [foundrySlug], filters) ?? this.findBySlugs(packName, [pbSlug], filters);
      if (indexMatch) {
        logger.debug(`Found compendium document for ${pbName} (${foundryName}) in ${packName} with id ${indexMatch._id}`);
        return { i: indexMatch, pack: this.packs[packName] };
      }
    }

    return undefined;
  }

}
