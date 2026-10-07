import { CompendiumSelector } from "../app/CompendiumSelector.js";
import CONSTANTS from "../constants.js";
import utils from "../utils.js";

async function resetSettings() {
  for (const [name, data] of Object.entries(CONSTANTS.GET_DEFAULT_SETTINGS())) {
    // eslint-disable-next-line no-await-in-loop
    await game.settings.set(CONSTANTS.MODULE_NAME, name, data.default);
  }
  window.location.reload();
}

/** The settings menu entry: asks, then resets every Pathmuncher setting to its default. */
class ResetSettingsDialog extends foundry.applications.api.ApplicationV2 {
  async render() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${CONSTANTS.FLAG_NAME}.Dialogs.ResetSettings.Title`, icon: "fas fa-refresh" },
      classes: ["pathmuncher"],
      content: `<p>${game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.ResetSettings.Content`)}</p>`,
      yes: { label: `${CONSTANTS.FLAG_NAME}.Dialogs.ResetSettings.Confirm`, icon: "fas fa-check" },
      no: { label: `${CONSTANTS.FLAG_NAME}.Dialogs.ResetSettings.Cancel`, icon: "fas fa-times", default: true },
      rejectClose: false,
    });
    if (confirmed) await resetSettings();
    return this;
  }
}

export async function processActiveGM() {
  // determine if this user is the active gm/first active in current session
  if (game.user.isGM) {
    const currentGMUser = game.users.get(utils.setting("ACTIVE_GM"));
    if ((currentGMUser && !currentGMUser.active) || !currentGMUser) {
      await utils.updateSetting("ACTIVE_GM", game.user.id);
    }
  }
}

export function registerSettings() {
  game.settings.registerMenu(CONSTANTS.MODULE_NAME, "resetToDefaults", {
    name: `${CONSTANTS.FLAG_NAME}.Settings.Reset.Title`,
    label: `${CONSTANTS.FLAG_NAME}.Settings.Reset.Label`,
    hint: `${CONSTANTS.FLAG_NAME}.Settings.Reset.Hint`,
    icon: "fas fa-refresh",
    type: ResetSettingsDialog,
    restricted: true,
  });

  for (const [name, data] of Object.entries(CONSTANTS.GET_DEFAULT_SETTINGS())) {
    game.settings.register(CONSTANTS.MODULE_NAME, name, data);
  }

  game.settings.registerMenu(CONSTANTS.MODULE_NAME, "selectCustomCompendiums", {
    name: `${CONSTANTS.FLAG_NAME}.Settings.UseCustomCompendiumMappings.Title`,
    label: `${CONSTANTS.FLAG_NAME}.Settings.UseCustomCompendiumMappings.Label`,
    hint: `${CONSTANTS.FLAG_NAME}.Settings.UseCustomCompendiumMappings.Hint`,
    icon: "fas fa-book",
    type: CompendiumSelector,
    restricted: true,
  });

}
