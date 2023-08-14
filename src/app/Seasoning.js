import { EQUIPMENT_RENAME_MAP, RESTRICTED_EQUIPMENT, IGNORED_EQUIPMENT } from "../data/equipment.js";
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
    return game.pf2e.system.sluggify(name);
  }

  // sluggify with dromedary casing
  static slugD(name) {
    return game.pf2e.system.sluggify(name, { camel: "dromedary" });
  }

  static FEAT_RENAME_MAP(name) {
    return FEAT_RENAME_MAP(name);
  }

  static EQUIPMENT_RENAME_MAP(name) {
    return EQUIPMENT_RENAME_MAP(name);
  }

  static getSpellCastingFeatureAdjustment(name) {
    return FEAT_SPELLCASTING.find((f) => f.name === name);
  }

  static getFoundryEquipmentName(pbName) {
    return Seasoning.EQUIPMENT_RENAME_MAP(pbName).find((map) => map.pbName == pbName)?.foundryName ?? pbName;
  }

  // static getFoundryFeatureName(pbName) {
  //   const match = Seasoning.FEAT_RENAME_MAP(pbName).find((map) => map.pbName == pbName);
  //   return match ?? { pbName, foundryName: pbName, details: undefined };
  // }

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
    "weapon"
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

  static getFoundryFeatLocation(pathbuilderFeatType, pathbuilderFeatLevel) {
    if (pathbuilderFeatType === "Ancestry Feat") {
      return `ancestry-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "Class Feat") {
      return `class-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "Skill Feat") {
      return `skill-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "General Feat") {
      return `general-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "Background Feat") {
      return `skill-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "Archetype Feat") {
      return `archetype-${pathbuilderFeatLevel}`;
    } else if (pathbuilderFeatType === "Kineticist Feat") { // return as null for now
      return null;
    } else {
      return null;
    }
  }

  static getClassAdjustedSpecialNameLowerCase(name, className) {
    return `${name} (${className})`.toLowerCase();
  }

  static getDualClassAdjustedSpecialNameLowerCase(name, dualClassName) {
    return `${name} (${dualClassName})`.toLowerCase();
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
