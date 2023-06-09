import { CompendiumMatcher } from "../app/CompendiumMatcher.js";
import { CompendiumSelector } from "../app/CompendiumSelector.js";
import { Pathmuncher } from "../app/Pathmuncher.js";
import { PathmuncherImporter } from "../app/PathmuncherImporter.js";
import { PetShop } from "../app/PetShop.js";
import { Seasoning } from "../app/Seasoning.js";
import CONSTANTS from "../constants.js";
import { EQUIPMENT_RENAME_MAP, RESTRICTED_EQUIPMENT } from "../data/equipment.js";
import { FEAT_RENAME_MAP } from "../data/features.js";
import utils from "../utils.js";

export function registerAPI() {
  game.modules.get(CONSTANTS.MODULE_NAME).api = {
    Pathmuncher,
    PathmuncherImporter,
    PetShop,
    CompendiumMatcher,
    Seasoning,
    CompendiumSelector,
    data: {
      generateFeatMap: FEAT_RENAME_MAP,
      equipment: EQUIPMENT_RENAME_MAP,
      restrictedEquipment: RESTRICTED_EQUIPMENT,
      feats: FEAT_RENAME_MAP(),
    },
    utils: utils,
    CONSTANTS,
  };
}
