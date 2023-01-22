import CONSTANTS from "../constants.js";

async function resetSettings() {
  for (const [name, data] of Object.entries(CONSTANTS.GET_DEFAULT_SETTINGS())) {
    // eslint-disable-next-line no-await-in-loop
    await game.settings.set(CONSTANTS.MODULE_NAME, name, data.default);
  }
  window.location.reload();
}

class ResetSettingsDialog extends FormApplication {
  constructor(...args) {
    super(...args);
    // eslint-disable-next-line no-constructor-return
    return new Dialog({
      title: game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.ResetSettings.Title`),
      content: `<p class="${CONSTANTS.FLAG_NAME}-dialog-important">${game.i18n.localize(
        `${CONSTANTS.FLAG_NAME}.Dialogs.ResetSettings.Content`
      )}</p>`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.ResetSettings.Confirm`),
          callback: () => {
            resetSettings();
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.ResetSettings.Cancel`),
        },
      },
      default: "cancel",
    });
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

}
