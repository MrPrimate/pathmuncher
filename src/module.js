import { registerSettings } from "./hooks/settings.js";
import { registerSheetButton } from "./hooks/sheets.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  registerSheetButton();
});
