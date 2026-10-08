/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import { BAD_IGNORE_FEATURES, remasterTermNames } from "../data/features.js";
import logger from "../logger.js";
import { ParsedEntry } from "./ParsedEntry.js";
import { Seasoning } from "./Seasoning.js";

/**
 * What an import could not match, for the user: by category, with Pathbuilder's specials that are a
 * section of another feature's description grouped under that feature, shown in the post-import
 * report dialog.
 */
export class ImportReport {

  /** @param {Pathmuncher} pm  the import this works for, whose state it reads and adds to */
  constructor(pm) {
    this.pm = pm;
  }

  // the import's state, which this reads and adds to

  get actor() {
    return this.pm.actor;
  }

  get bad() {
    return this.pm.bad;
  }

  get options() {
    return this.pm.options;
  }

  get parsed() {
    return this.pm.parsed;
  }

  get result() {
    return this.pm.result;
  }

  get source() {
    return this.pm.source;
  }

  static ATTRIBUTE_NAMES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];

  /**
   * Pathbuilder specials that matched nothing, by their Pathbuilder name. Leaves out labels that
   * need no item: the shared ignore lists (skills, "Spellbook", ...), attribute names, lores, and
   * spells Pathbuilder also lists as specials ("Studious Spell: Blur") when the spell was imported.
   */
  static #specialSlug(name) {
    return Seasoning.slug(String(name ?? "").replace(/\s*\(.*?\)\s*/g, " ").trim());
  }

  /** The entries of a parsed list (feats, specials, equipment, weapons, armor) that nothing matched. */
  #unmatchedEntries(list) {
    return this.parsed[list].filter((entry) => entry.status === ParsedEntry.STATUS.UNMATCHED);
  }

  /** Specials no item was matched to, leaving out Pathbuilder's labels, lores and spells. */
  #specialsWithoutItems() {
    const slug = ImportReport.#specialSlug;
    const ignored = new Set([...Seasoning.IGNORED_FEATS(), ...Seasoning.IGNORED_SPECIALS(), ...ImportReport.ATTRIBUTE_NAMES]
      .map(slug));
    const lores = new Set((this.source?.lores ?? []).flatMap(([name]) => [slug(name), slug(`Lore: ${name}`)]));
    const spells = new Set(this.result.spells.map((s) => slug(s.name)));
    // Pathbuilder repeats some specials (a thaumaturge's implement once per tier): one match covers them
    const settled = new Set(this.parsed.specials.filter((entry) => entry.added).map((entry) => entry.name));
    const names = this.#unmatchedEntries("specials")
      .filter((entry) => entry.sourceType === "specials" && !settled.has(entry.name) && !BAD_IGNORE_FEATURES(entry.name))
      .map((entry) => entry.originalName);
    return [...new Set(names)]
      .filter((name) => ![name, name.split(":").pop()].some((n) => ignored.has(slug(n)) || lores.has(slug(n)) || spells.has(slug(n))));
  }

  /** Item types whose descriptions can describe a special as one of their sections. */
  static DESCRIBING_ITEM_TYPES = ["ancestry", "heritage", "background", "class", "feat", "action", "deity"];

  /**
   * Specials without an item of their own that a feature on the actor describes, under a heading or
   * bold lead-in of the same name: Pathbuilder's "Immunity to Death Effects" is a section of Basic
   * Undead Benefits, and its "Negative Healing" is that feature's "Void Healing". Grouped by the
   * describing item: [{ uuid, name, specials: [{ name, text }] }]. Use once the actor is updated.
   */
  getDescribedSpecials() {
    const sections = this.actor.items
      .filter((item) => ImportReport.DESCRIBING_ITEM_TYPES.includes(item.type))
      .flatMap((item) => Seasoning.describedSections(item.system.description?.value)
        .flatMap((section) => [
          { ...section, item, slug: ImportReport.#specialSlug(section.term) },
          // Pathbuilder can name a section after its feature: "Animal Instinct Raging Resistance"
          { ...section, item, slug: ImportReport.#specialSlug(`${item.name} ${section.term}`) },
        ]));
    const origins = new Map();
    for (const name of new Set(this.#specialsWithoutItems())) {
      const slugs = remasterTermNames(name).map((n) => ImportReport.#specialSlug(n));
      const section = sections.find((s) => slugs.includes(s.slug));
      if (!section) continue;
      if (!origins.has(section.item.uuid)) origins.set(section.item.uuid, { uuid: section.item.uuid, name: section.item.name, specials: [] });
      origins.get(section.item.uuid).specials.push({ name, text: section.text });
    }
    return [...origins.values()];
  }

  /** Specials the report lists as unmatched: no item of their own, and not described by another. */
  getUnmatchedSpecials() {
    const described = new Set(this.getDescribedSpecials().flatMap((origin) => origin.specials.map((s) => s.name)));
    return this.#specialsWithoutItems().filter((name) => !described.has(name));
  }

  /**
   * What the import could not match, by category, for the post-import report: an array of
   * { type, label, names } for the categories that have any, in the order they are shown.
   */
  /** Report groups that are not a kind of item, with their own heading and hint (Dialogs.Report.<key>, <key>Hint). */
  static REPORT_GROUPS = { described: "Described", rule: "Rules" };

  getImportReport() {
    const bad = (type, option, filter = () => true) => (option === null || this.options[option]
      ? this.bad.filter((b) => b.type === type && filter(b)).map((b) => b.pbName)
      : []);
    const unmatchedFeats = this.options.addFeats
      ? this.#unmatchedEntries("feats").filter((entry) => !BAD_IGNORE_FEATURES(entry.name)).map((entry) => entry.name)
      : [];
    // unmatched items: the parsed entries, and anything else of the type (an sf2e upgrade)
    const unmatchedItems = (list, type, option) => (this.options[option]
      ? [...this.#unmatchedEntries(list).map((entry) => entry.pbName), ...bad(type, option)]
      : []);
    const described = this.options.addFeats ? this.getDescribedSpecials() : [];
    const groups = [
      ["class", bad("class", "addClass")],
      ["ancestry", bad("ancestry", "addAncestry")],
      ["heritage", bad("heritage", "addHeritage")],
      ["background", bad("background", "addBackground")],
      ["deity", bad("deity", "addDeity", (b) => b.pbName && b.pbName !== "Not set")],
      ["feat", [...bad("feat", "addFeats"), ...unmatchedFeats]],
      ["special", this.options.addFeats ? this.getUnmatchedSpecials() : []],
      ["described", described.flatMap((origin) => origin.specials.map((s) => s.name))],
      ["equipment", unmatchedItems("equipment", "equipment", "addEquipment")],
      ["weapon", unmatchedItems("weapons", "weapon", "addWeapons")],
      ["armor", unmatchedItems("armor", "armor", "addArmor")],
      ["spellcasting", bad("spellcasting", "addSpells")],
      ["spell", bad("spell", "addSpells")],
      ["ritual", bad("ritual", "addSpells")],
      ["formula", bad("formula", "addFormulas")],
      ["familiar", bad("familiar", "addFamiliars")],
      ["rule", bad("rule", null)],
    ];
    const labels = {
      class: "Class", ancestry: "Ancestry", heritage: "Heritage", background: "Background", deity: "Deity",
      feat: "Feats", special: "Specials", equipment: "Equipment", weapon: "Weapons", armor: "Armor",
      spellcasting: "Spellcasting", spell: "Spells", ritual: "Rituals", formula: "Formulas", familiar: "Familiars",
    };
    return groups
      .map(([type, names]) => ({
        type,
        label: game.i18n.localize(ImportReport.REPORT_GROUPS[type]
          ? `pathmuncher.Dialogs.Report.${ImportReport.REPORT_GROUPS[type]}`
          : `pathmuncher.Labels.${labels[type]}`),
        names: [...new Set(names)],
        ...(type === "described" && { origins: described }),
      }))
      .filter((group) => group.names.length > 0);
  }

  async postImportCheck() {
    const report = this.getImportReport();
    logger.debug("Post import report", { report, focusPool: this.result.focusPool });

    if (report.length === 0) {
      ui.notifications.info(game.i18n.localize("pathmuncher.Dialogs.Pathmuncher.CompletedSuccess"));
      return;
    }

    ui.notifications.warn(game.i18n.localize("pathmuncher.Dialogs.Pathmuncher.CompletedWithNotes"));
    const escape = foundry.utils.escapeHTML;
    const { enrichHTML } = foundry.applications.ux.TextEditor.implementation;
    const clip = (text, length = 400) => (text.length <= length ? text : `${text.slice(0, text.lastIndexOf(" ", length))} …`);
    // specials another feature describes: a link to the feature, and each special's section on hover
    const originList = async (origins) => (await Promise.all(origins.map(async (origin) => `<li class="pathmuncher-report-origin">
        ${await enrichHTML(`@UUID[${origin.uuid}]{${origin.name}}`)}
        <ul>${origin.specials.map((s) => `<li class="pathmuncher-report-described" data-tooltip="${escape(clip(s.text))}">${escape(s.name)}</li>`).join("")}</ul>
      </li>`))).join("");
    const hint = (group) => (ImportReport.REPORT_GROUPS[group.type]
      ? `<p class="hint">${game.i18n.localize(`pathmuncher.Dialogs.Report.${ImportReport.REPORT_GROUPS[group.type]}Hint`)}</p>`
      : "");
    const groupBody = async (group) => (group.origins
      ? `${hint(group)}<ul>${await originList(group.origins)}</ul>`
      : `${hint(group)}<ul>${group.names.map((name) => `<li>${escape(name)}</li>`).join("")}</ul>`);
    const sections = (await Promise.all(report.map(async (group) => `<section class="pathmuncher-report-group">
        <h4>${escape(group.label)} <span class="pathmuncher-report-count">${group.names.length}</span></h4>
        ${await groupBody(group)}
      </section>`))).join("");
    await foundry.applications.api.DialogV2.prompt({
      window: { title: "pathmuncher.Dialogs.Report.Title", icon: "fas fa-clipboard-list" },
      classes: ["pathmuncher", "pathmuncher-report"],
      position: { width: 480 },
      content: `<p class="hint">${game.i18n.localize("pathmuncher.Dialogs.Report.Intro")}</p>
        <div class="pathmuncher-report-groups">${sections}</div>`,
      ok: { label: "pathmuncher.Labels.Finished", icon: "fas fa-check" },
      rejectClose: false,
    });
  }

}
