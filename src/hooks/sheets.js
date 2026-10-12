import { EidolonBuilderApp } from "../app/EidolonBuilderApp.js";
import { PathmuncherImporter } from "../app/PathmuncherImporter.js";
import CONSTANTS from "../constants.js";
import utils from "../utils.js";

/** Whether this user may import into this actor: its owner, allowed to create actors, and trusted if required. */
function canImport(actor) {
  if (actor?.type !== "character" || !actor.isOwner) return false;
  if (!game.user.can("ACTOR_CREATE")) return false;
  return !utils.setting("RESTRICT_TO_TRUSTED") || game.user.isTrusted;
}

function label() {
  return utils.setting("DISPLAY_TITLE") ? CONSTANTS.MODULE_FULL_NAME : "";
}

/**
 * Adds the Pathmuncher button to character sheet headers: the Application v1 header buttons the
 * pf2e and sf2e character sheets use, and the header controls of ApplicationV2 actor sheets.
 */
export function registerSheetButton() {
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    // an eidolon's choices, which Pathbuilder's export leaves out
    if (EidolonBuilderApp.isEidolon(sheet.actor)) {
      buttons.unshift({
        label: game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.EidolonBuilder.Open`),
        class: "pathmuncher-eidolon",
        icon: "fas fa-dragon",
        onclick: () => EidolonBuilderApp.open(sheet.actor),
      });
    }
    if (!canImport(sheet.actor)) return;
    buttons.unshift({
      label: label(),
      class: "pathmuncher-open",
      icon: "fas fa-teeth-open",
      onclick: () => PathmuncherImporter.open(sheet.actor),
    });
  });

  Hooks.on("getHeaderControlsActorSheetV2", (sheet, controls) => {
    if (EidolonBuilderApp.isEidolon(sheet.actor)) {
      controls.unshift({
        label: `${CONSTANTS.FLAG_NAME}.Dialogs.EidolonBuilder.Open`,
        icon: "fas fa-dragon",
        action: "pathmuncherEidolon",
        onClick: () => EidolonBuilderApp.open(sheet.actor),
      });
    }
    if (!canImport(sheet.actor)) return;
    controls.unshift({
      label: CONSTANTS.MODULE_FULL_NAME,
      icon: "fas fa-teeth-open",
      action: "pathmuncherOpen",
      onClick: () => PathmuncherImporter.open(sheet.actor),
    });
  });
}
