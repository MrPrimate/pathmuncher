import { EQUIPMENT_RENAME_MAP, RESTRICTED_EQUIPMENT, IGNORED_EQUIPMENT, IGNORED_EQUIPMENT_DISPLAY, GRANTED_ITEMS_LIST } from "../data/equipment.js";
import { FEAT_RENAME_MAP, IGNORED_FEATS, IGNORED_SPECIALS } from "../data/features.js";
import { FEAT_SPELLCASTING } from "../data/spells.js";

/**
 * This class acts as a wrapper around the renaming data,
 * and the changing of names for foundry
 *
 * When Munching we refer to this as Seasoning the data to taste.
 *
 * It's split out just to make it more manageable
 */
export class Seasoning {

  // sluggify
  static slug(name) {
    if (!name) return undefined;
    return game.pf2e.system.sluggify(name);
  }

  // sluggify with dromedary casing
  static slugD(name) {
    if (!name) return undefined;
    return game.pf2e.system.sluggify(name, { camel: "dromedary" });
  }

  static FEAT_RENAME_MAP(name) {
    return FEAT_RENAME_MAP(name);
  }

  /** Plain text of description HTML, keeping the labels of enrichers such as @UUID[...]{label}. */
  static descriptionText(html) {
    return html
      .replace(/@\w+\[(?:[^[\]]|\[[^\]]*\])*\](?:\{([^}]*)\})?/g, (_, label) => label ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * The sections of an item description that a heading or a bold lead-in names, as { term, text }.
   * Basic Undead Benefits' "<p><strong>Void Healing:</strong> You are damaged by ...</p>" is
   * { term: "Void Healing", text: "You are damaged by ..." }. A heading's section runs to the next
   * heading. Bold text later in a paragraph is emphasis, not a section, so it is left out.
   */
  static describedSections(html = "") {
    const sections = [];
    for (const match of html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
      const rest = html.slice(match.index + match[0].length);
      const end = rest.search(/<h[1-6][\s>]/i);
      sections.push({ term: Seasoning.descriptionText(match[2]), text: Seasoning.descriptionText(end === -1 ? rest : rest.slice(0, end)) });
    }
    for (const match of html.matchAll(/<(p|li)(?:\s[^>]*)?>\s*<(strong|b)>([\s\S]*?)<\/\2>([\s\S]*?)<\/\1>/gi)) {
      const term = Seasoning.descriptionText(match[3]).replace(/[:.]$/, "").trim();
      const text = Seasoning.descriptionText(match[4]).replace(/^[:.]\s*/, "");
      sections.push({ term, text });
      // a step and its name ("Transcendence (17th)—Angelic Mercy", an eidolon's abilities) is also known by the name
      const named = term.split("—").at(-1).trim();
      if (named && named !== term) sections.push({ term: named, text });
    }
    return sections.filter((section) => section.term);
  }

  static EQUIPMENT_RENAME_MAP(name) {
    return EQUIPMENT_RENAME_MAP(name);
  }

  static getSpellCastingFeatureAdjustment(name) {
    return FEAT_SPELLCASTING.find((f) => f.name === name);
  }

  static getFoundryEquipment(pbName) {
    return Seasoning.EQUIPMENT_RENAME_MAP(pbName).find((map) => map.pbName == pbName);
  }

  static getFoundryEquipmentName(pbName) {
    return Seasoning.getFoundryEquipment(pbName)?.foundryName ?? pbName;
  }

  static RESTRICTED_EQUIPMENT() {
    return RESTRICTED_EQUIPMENT;
  }

  // specials that are handled by Foundry and shouldn't be added
  static IGNORED_FEATS() {
    return IGNORED_FEATS();
  };

  static IGNORED_SPECIALS() {
    return IGNORED_SPECIALS();
  }

  static IGNORED_EQUIPMENT() {
    return IGNORED_EQUIPMENT;
  };

  static IGNORED_EQUIPMENT_DISPLAY(pbName) {
    return IGNORED_EQUIPMENT_DISPLAY(pbName);
  }

  static GRANTED_ITEMS_LIST() {
    return GRANTED_ITEMS_LIST;
  }

  static getSizeValue(size) {
    switch (size) {
      case 0:
        return "tiny";
      case 1:
        return "sm";
      case 3:
        return "lg";
      default:
        return "med";
    }
  }

  static PHYSICAL_ITEM_TYPES = new Set([
    "armor",
    "backpack",
    "book",
    "consumable",
    "equipment",
    "treasure",
    "weapon",
  ]);

  static isPhysicalItemType(type) {
    return Seasoning.PHYSICAL_ITEM_TYPES.has(type);
  }

  static getMaterialGrade(material) {
    if (material.toLowerCase().includes("high-grade")) {
      return "high";
    } else if (material.toLowerCase().includes("standard-grade")) {
      return "standard";
    }
    return "low";
  }

  /**
   * The feat slot (system.location) for a Pathbuilder feat, or null when it has none (bonus feats,
   * feats granted by another choice). Pathbuilder's slot label (feat[4], parsed as featChoiceRef)
   * says where the feat was taken: "Fighter Feat 4" (class), "Elf Feat 1" (ancestry, named for the
   * ancestry or a versatile heritage), "Skill Feat 2", "General Feat 3", "Free Archetype 2", or a UUID
   * for a Custom Feat Choice. Older exports have no labels, so the feat's type is used instead.
   * Archetype feats only use archetype slots when the Free Archetype variant is on.
   */
  static getFoundryFeatLocation(feature, { className = null, freeArchetype = false } = {}) {
    const { type, level, isChild } = feature;
    const label = String(feature.featChoiceRef ?? "");
    if (!type || !level || isChild) return null;
    // a Kineticist's impulse a gate or threshold chooses ("Single Gate Element Impulse Feat 0"): no slot of its own
    if (type === "Kineticist Feat") return null;
    if ((/^[0-9a-f]{8}-[0-9a-f]{4}-/i).test(label)) return null;
    return Seasoning.#featLocationFromLabel(label, type, { className, freeArchetype })
      ?? Seasoning.#featLocationFromType(type, level, { freeArchetype });
  }

  static #featLocationFromLabel(label, type, { className, freeArchetype }) {
    const match = label.match(/^(.+?) (?:Feat )?(\d+)$/);
    if (!match) return null;
    const [, kind, slotLevel] = match;
    if (kind === "Free Archetype") return `${freeArchetype ? "archetype" : "class"}-${slotLevel}`;
    if (["Mythic Feat", "Destiny Mythic Feat"].includes(type)) return `mythic-${slotLevel}`;
    const group = {
      Skill: "skill",
      General: "general",
      Class: "class",
      Archetype: "class",
    }[kind] ?? (kind === className ? "class" : "ancestry");
    return `${group}-${slotLevel}`;
  }

  static #featLocationFromType(type, level, { freeArchetype }) {
    const byType = {
      "Ancestry Feat": "ancestry",
      "Skill Feat": "skill",
      "Background Feat": "skill",
      "General Feat": "general",
      "Mythic Feat": "mythic",
      "Destiny Mythic Feat": "mythic",
      "Archetype Feat": freeArchetype ? "archetype" : "class",
      "Awarded Feat": null,
      "Heritage": null,
      "Kineticist Feat": null,
    };
    // anything else named "<X> Feat" is a class feat: "Class Feat", "Wizard Feat", "Cleric Feat"
    const group = type in byType ? byType[type] : ((/^[\w' -]+ Feat$/).test(type) ? "class" : null);
    return group ? `${group}-${level}` : null;
  }

  static getClassAdjustedSpecialNameLowerCase(name, className) {
    return `${name} (${className})`.toLowerCase();
  }

  static getAncestryAdjustedSpecialNameLowerCase(name, ancestryName) {
    return `${name} (${ancestryName})`.toLowerCase();
  }

  static getHeritageAdjustedSpecialNameLowerCase(name, heritageName) {
    return `${name} (${heritageName})`.toLowerCase();
  }

  static getChampionType(alignment) {
    if (alignment == "LG") return "Paladin";
    else if (alignment == "CG") return "Liberator";
    else if (alignment == "NG") return "Redeemer";
    else if (alignment == "LE") return "Tyrant";
    else if (alignment == "CE") return "Antipaladin";
    else if (alignment == "NE") return "Desecrator";
    return "Unknown";
  }


}
