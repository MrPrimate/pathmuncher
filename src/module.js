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
  // remove temporary actors left by versions before 1.7, which evaluated choices on world actors
  if (utils.setting("ACTIVE_GM") === game.user.id) {
    await utils.removeTempActors();
  }
});
