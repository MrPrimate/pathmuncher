import { PathmuncherImporter } from "../app/PathmuncherImporter.js";
import CONSTANTS from "../constants.js";
import utils from "../utils.js";

export function autoCreateFolders() {

  const autoCreateEnabled = utils.setting("AUTO_CREATE_TEMP_FOLDER");
  if (!autoCreateEnabled) return;
  if (!game.user.isGM) return;

  utils.getOrCreateFolder(null, "Actor", game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Folders.Familiars`));
  
  if (foundry.utils.isNewerVersion(game.version, CONSTANTS.TEMP_FOLDER_FOUNDRY_MIN_VERSION))
  {
    utils.getOrCreateFolder(null, "Actor", game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Folders.PathmuncherTemp`));
  }

}
