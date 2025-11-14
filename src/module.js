import { registerAPI } from "./hooks/api.js";
import { registerSettings, processActiveGM } from "./hooks/settings.js";
import { registerSheetButton } from "./hooks/sheets.js";
import { autoCreateFolders } from "./hooks/folder.js";
import utils from "./utils.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", async () => {
  await processActiveGM();
  registerSheetButton();
  registerAPI();
  autoCreateFolders();
  // cleanup temp actors on startup, but only for the active GM
  if (utils.setting("ACTIVE_GM") === game.user.id) {
    await utils.removeTempActors();
  }
});
