import CONSTANTS from "../constants.js";

const path = (file) => `${CONSTANTS.PATH}/templates/${file}`;

/** The dialogs' templates, by name. */
export const TEMPLATES = {
  ammunition: path("dialogs/ammunition.hbs"),
  ammoStack: path("partials/ammo-stack.hbs"),
  choiceTile: path("partials/choice-tile.hbs"),
  companion: path("dialogs/companion.hbs"),
  deityConflict: path("dialogs/deity-conflict.hbs"),
  importReport: path("dialogs/import-report.hbs"),
  keepItems: path("dialogs/keep-items.hbs"),
  missingCore: path("dialogs/missing-core.hbs"),
  tooltip: path("partials/tooltip.hbs"),
  unansweredChoices: path("dialogs/unanswered-choices.hbs"),
};

/** The partials templates include, by the name they include them by. */
const PARTIALS = {
  "pathmuncher.ammo-stack": TEMPLATES.ammoStack,
  "pathmuncher.choice-tile": TEMPLATES.choiceTile,
};

/** Loads the partials, so templates can include them. Run once, at init. */
export function registerTemplates() {
  return foundry.applications.handlebars.loadTemplates(PARTIALS);
}

/** A template rendered with the data, as HTML. */
export function render(name, data = {}) {
  return foundry.applications.handlebars.renderTemplate(TEMPLATES[name], data);
}

/** Plain text of a description, cut down to a tooltip. */
export function clip(html, length = 400) {
  const text = String(html ?? "").replace(/@\w+\[[^\]]*\](?:\{([^}]*)\})?/g, (_, label) => label ?? "")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
