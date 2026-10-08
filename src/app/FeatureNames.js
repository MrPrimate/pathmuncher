import { FEAT_RENAME_MAP } from "../data/features.js";
import { Seasoning } from "./Seasoning.js";

/**
 * The names a feature (feat, special, class or ancestry feature) goes by, in one place: the Foundry
 * names a Pathbuilder name maps to, the slugs a compendium entry for a name can have, and the names a
 * Foundry item can be listed under in a Pathbuilder export. Matching in either direction, a
 * Pathbuilder entry to a compendium item or a granted item back to its Pathbuilder entry, goes
 * through here.
 */
export class FeatureNames {

  /**
   * @param {object} build
   * @param {string} [build.className]          the build's class
   * @param {string} [build.ancestry]           its ancestry
   * @param {string} [build.heritage]           its heritage
   * @param {object[]} [build.buildRenames]     renames that depend on the build: { pbName, foundryName }
   */
  constructor({ className = null, ancestry = null, heritage = null, buildRenames = [] } = {}) {
    this.className = className;
    this.ancestry = ancestry;
    this.heritage = heritage;
    this.buildRenames = buildRenames;
    this.#variants = new Map();
    this.#entrySlugs = new WeakMap();
  }

  #variants;

  #entrySlugs;

  /**
   * The Foundry names a Pathbuilder name may have, most likely first: the rename rules and map
   * (data/features.js), then the build's own renames. Each is { pbName, foundryName, details,
   * foundryValue }. Just the name itself when nothing renames it.
   */
  candidates(pbName) {
    const renames = FEAT_RENAME_MAP(pbName).concat(this.buildRenames).filter((map) => map.pbName === pbName);
    return renames.length > 0 ? renames : [{ pbName, foundryName: pbName, details: undefined }];
  }

  /** The Foundry name a Pathbuilder name is looked up under: its most likely candidate. */
  foundryName(pbName) {
    return this.candidates(pbName)[0];
  }

  /**
   * The slugs a compendium entry for a name can have: the name's own, then with the class, ancestry
   * or heritage in brackets, as pf2e names features shared between them ("Weapon Expertise (Wizard)").
   */
  slugVariants(name) {
    if (!name) return [];
    if (!this.#variants.has(name)) {
      this.#variants.set(name, [
        Seasoning.slug(name),
        Seasoning.slug(Seasoning.getClassAdjustedSpecialNameLowerCase(name, this.className)),
        Seasoning.slug(Seasoning.getAncestryAdjustedSpecialNameLowerCase(name, this.ancestry)),
        Seasoning.slug(Seasoning.getHeritageAdjustedSpecialNameLowerCase(name, this.heritage)),
      ]);
    }
    return this.#variants.get(name);
  }

  /**
   * The slugs a Pathbuilder entry answers to: the variants of its Foundry name and of its Pathbuilder
   * name, and its value (the skill a "Selected Skill" special names).
   */
  entrySlugs(entry) {
    const key = `${entry.name}\u0000${entry.originalName}\u0000${entry.foundryValue}`;
    const cached = this.#entrySlugs.get(entry);
    if (cached?.key === key) return cached.slugs;
    const slugs = new Set([
      ...this.slugVariants(entry.name),
      Seasoning.slug(entry.foundryValue),
      ...this.slugVariants(entry.originalName),
    ].filter(Boolean));
    this.#entrySlugs.set(entry, { key, slugs });
    return slugs;
  }

  /** Whether a Pathbuilder entry answers to a slug. */
  entryMatches(entry, slug) {
    return this.entrySlugs(entry).has(slug);
  }

  /**
   * The slugs a Foundry item may be listed under in a Pathbuilder export, most likely first: its own
   * slug, its name without a bracketed choice, the name the feature granting it lists it under
   * (grantedAs: the Champion's "Weapon Mastery" is Martial Weapon Mastery), and its name without the
   * class's (the Psychic's "Psychic Weapon Specialization" is "Weapon Specialization").
   */
  itemSlugs(document, { grantedAs = null } = {}) {
    const slugs = [document.system.slug ?? Seasoning.slug(document.name)];
    if (document.name.includes("(")) slugs.push(Seasoning.slug(document.name.split("(")[0].trim()));
    if (grantedAs && grantedAs !== document.name) slugs.push(Seasoning.slug(grantedAs));
    const classPrefix = this.className ? `${this.className} ` : null;
    if (classPrefix && document.name.startsWith(classPrefix)) slugs.push(Seasoning.slug(document.name.slice(classPrefix.length)));
    return slugs;
  }

}
