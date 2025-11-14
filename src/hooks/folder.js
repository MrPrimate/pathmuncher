import CONSTANTS from "../constants.js";
import utils from "../utils.js";

export function autoCreateFolders() {
  if (!utils.setting("AUTO_CREATE_TEMP_FOLDER")) return;
  if (!game.user.isGM) return;

  utils.getOrCreateFolder(null, "Actor", game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Folders.Familiars`));

  if (utils.setting("USE_TEMP_FOLDER")) {
    utils.getOrCreateFolder(null, "Actor", game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Folders.PathmuncherTemp`));
  }

}
