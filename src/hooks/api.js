import { CompendiumMatcher } from "../app/CompendiumMatcher.js";
import { CompendiumSelector } from "../app/CompendiumSelector.js";
import { Pathmuncher } from "../app/Pathmuncher.js";
import { PathmuncherImporter } from "../app/PathmuncherImporter.js";
import { PetShop } from "../app/PetShop.js";
import { Pf2eRules } from "../app/Pf2eRules.js";
import { Seasoning } from "../app/Seasoning.js";
import CONSTANTS from "../constants.js";
import { EQUIPMENT_RENAME_MAP, RESTRICTED_EQUIPMENT } from "../data/equipment.js";
import { FEAT_RENAME_MAP } from "../data/features.js";
import { spellRename } from "../data/spells.js";
import utils from "../utils.js";

export function registerAPI() {
  game.modules.get(CONSTANTS.MODULE_NAME).api = {
    Pathmuncher,
    PathmuncherImporter,
    PetShop,
    Pf2eRules,
    CompendiumMatcher,
    Seasoning,
    CompendiumSelector,
    data: {
      generateFeatMap: FEAT_RENAME_MAP,
      equipment: EQUIPMENT_RENAME_MAP,
      restrictedEquipment: RESTRICTED_EQUIPMENT,
      feats: FEAT_RENAME_MAP(),
      spellRename,
    },
    utils: utils,
    CONSTANTS,
  };
}
