import { PathmuncherImporter } from "../app/PathmuncherImporter.js";
import CONSTANTS from "../constants.js";
import utils from "../utils.js";

export function registerSheetButton() {

  const trustedUsersOnly = utils.setting(CONSTANTS.SETTINGS.RESTRICT_TO_TRUSTED);
  if (trustedUsersOnly && !game.user.isTrusted) return;

  /**
   * Character sheets
   */
  const pcSheetNames = Object.values(CONFIG.Actor.sheetClasses.character)
    .map((sheetClass) => sheetClass.cls)
    .map((sheet) => sheet.name);

  pcSheetNames.forEach((sheetName) => {
    Hooks.on("render" + sheetName, (app, html, data) => {
      // only for GMs or the owner of this character
      if (!data.owner || !data.actor) return;

      const button = $(`<a class="pathmuncher-open" title="${CONSTANTS.MODULE_FULL_NAME}"><i class="fas fa-hat-wizard"></i> ${CONSTANTS.MODULE_FULL_NAME}</a>`);

      button.click(() => {
        if (game.user.can("ACTOR_CREATE")) {
          const muncher = new PathmuncherImporter(PathmuncherImporter.defaultOptions, data.actor);
          muncher.render(true);
        } else {
          ui.notifications.warn(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Notifications.CreateActorPermission`), { permanent: true });
        }
      });

      html.closest('.app').find('.pathmuncher-open').remove();
      let titleElement = html.closest('.app').find('.window-title');
      if (!app._minimized) button.insertAfter(titleElement);
    });
  });

}
