import { Pathmuncher } from "../app/Pathmuncher.js";
import { PathmuncherImporter } from "../app/PathmuncherImporter.js";
import CONSTANTS from "../constants.js";
import { PredicatePF2e } from "../lib/PredicatePF2e.js";
import { EQUIPMENT_RENAME_MAP, RESTRICTED_EQUIPMENT } from "../data/equipment.js";
import { FEAT_RENAME_MAP } from "../data/features.js";
import utils from "../utils.js";

export function registerAPI() {
  game.modules.get(CONSTANTS.MODULE_NAME).api = {
    PredicateMuncher: PredicatePF2e,
    Pathmuncher,
    PathmuncherImporter,
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
