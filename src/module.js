import { Pf2eRules } from "./app/Pf2eRules.js";
import { registerAPI } from "./hooks/api.js";
import { registerSettings, processActiveGM } from "./hooks/settings.js";
import { registerSheetButton } from "./hooks/sheets.js";
import utils from "./utils.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", async () => {
  await processActiveGM();
  registerSheetButton();
  registerAPI();
  // pathmuncher works out choices with pf2e internals; say so if a system update has changed them
  const missing = Pf2eRules.missing();
  if (missing.length > 0 && game.user.isGM) {
    console.warn("pathmuncher | the system no longer has", missing); // eslint-disable-line no-console
    ui.notifications.warn(game.i18n.format("pathmuncher.Notifications.SystemChanged", { version: game.system.version }), { permanent: true });
  }
  // remove temporary actors left by versions before 1.7, which evaluated choices on world actors
  if (utils.setting("ACTIVE_GM") === game.user.id) {
    await utils.removeTempActors();
  }
});
