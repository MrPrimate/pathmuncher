import CONSTANTS from "../constants.js";
import { clip, render } from "./Templates.js";

/**
 * The import notes window: what an import could not match, by group (ImportReport#getImportReport),
 * from this import or kept from an earlier one (ImportMemory). A group's heading is its label, and
 * its hint, if it has one, is Dialogs.Report.Hints.<type>.
 */
export class ImportReportDialog {

  /** After an import: says it went well, or that there are notes and shows them. */
  static async postImportCheck(report) {
    if (report.length === 0) {
      ui.notifications.info(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.CompletedSuccess`));
      return;
    }
    ui.notifications.warn(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.CompletedWithNotes`));
    await ImportReportDialog.show(report);
  }

  /** A group's hint, if it has one. */
  static #hint(type) {
    const key = `${CONSTANTS.FLAG_NAME}.Dialogs.Report.Hints.${type}`;
    return game.i18n.has(key) ? game.i18n.localize(key) : null;
  }

  /** Shows import notes. importedAt, when given, says when the import was made. */
  static async show(report, { importedAt = null } = {}) {
    const { enrichHTML } = foundry.applications.ux.TextEditor.implementation;
    // specials another feature describes: a link to the feature, and each special's section on hover
    const origins = (group) => Promise.all(group.origins.map(async (origin) => ({
      link: await enrichHTML(`@UUID[${origin.uuid}]{${origin.name}}`),
      specials: origin.specials.map((s) => ({ name: s.name, text: clip(s.text) })),
    })));
    const groups = await Promise.all(report.map(async (group) => ({
      label: group.label,
      count: group.names.length,
      hint: ImportReportDialog.#hint(group.type),
      names: group.names,
      origins: group.origins ? await origins(group) : null,
    })));
    const content = await render("importReport", {
      importedAt: importedAt
        ? game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Report.ImportedAt`, { date: new Date(importedAt).toLocaleString() })
        : null,
      groups,
    });
    await foundry.applications.api.DialogV2.prompt({
      window: { title: `${CONSTANTS.FLAG_NAME}.Dialogs.Report.Title`, icon: "fas fa-clipboard-list" },
      classes: ["pathmuncher", "pathmuncher-report"],
      position: { width: 480 },
      content,
      ok: { label: `${CONSTANTS.FLAG_NAME}.Labels.Finished`, icon: "fas fa-check" },
      rejectClose: false,
    });
  }

}
