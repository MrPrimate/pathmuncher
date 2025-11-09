import { registerAPI } from "./hooks/api.js";
import { registerSettings } from "./hooks/settings.js";
import { registerSheetButton } from "./hooks/sheets.js";
import { autoCreateFolders } from "./hooks/folder.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  registerSheetButton();
  registerAPI();
  autoCreateFolders();
});
