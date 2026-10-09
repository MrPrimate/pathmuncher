import CONSTANTS from "../constants.js";
import logger from "../logger.js";
import utils from "../utils.js";
import { AmmunitionDialog } from "./AmmunitionDialog.js";
import { DeityConflictDialog } from "./DeityConflictDialog.js";
import { Pathmuncher } from "./Pathmuncher.js";
import { PetShop } from "./PetShop.js";
import { UnansweredChoicesDialog } from "./UnansweredChoicesDialog.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/** The import options, grouped as the dialog shows them. A nested option is indented under its parent. */
const OPTION_GROUPS = [
  { id: "Character", options: ["addName", "addClass", "addAncestry", "addHeritage", "addBackground", "addDeity"] },
  {
    id: "Features",
    options: ["addFeats", "addLores", "addSpells", { key: "adjustBlendedSlots", parent: "addSpells" }, "addFormulas", "addFamiliars"],
  },
  { id: "Inventory", options: ["addEquipment", "addWeapons", "addArmor", "addTreasure", "addMoney"] },
];

const SOURCES = [
  { id: "id", icon: "fas fa-hashtag" },
  { id: "json", icon: "fas fa-code" },
  { id: "file", icon: "fas fa-file-import" },
];

const i18n = (key) => game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Importer.${key}`);

export class PathmuncherImporter extends HandlebarsApplicationMixin(ApplicationV2) {

  /**
   * @param {object} [options]  ApplicationV2 options; options.actor is the actor to import into
   * @param {Actor} [actor]     the actor to import into (the older two-argument form)
   */
  constructor(options = {}, actor = null) {
    const target = actor ?? options.actor;
    const resolved = game.actors.get(target?.id ?? target?._id) ?? target;
    super({ ...options, id: `pathmuncher-importer-${resolved.id}` });
    this.actor = resolved;
    this.source = "id";
    this.importing = false;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["pathmuncher", "pathmuncher-importer"],
    window: {
      icon: "fas fa-teeth-open",
      resizable: true,
      contentClasses: ["standard-form"],
    },
    position: { width: 620, height: "auto" },
    form: {
      handler: PathmuncherImporter.#onSubmit,
      closeOnSubmit: false,
      submitOnChange: false,
    },
    actions: {
      setSource: PathmuncherImporter.#onSetSource,
      selectAll: PathmuncherImporter.#onSelectAll,
    },
  };

  static PARTS = {
    form: { template: `${CONSTANTS.PATH}/templates/importer.hbs`, scrollable: [""] },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  get title() {
    return `${i18n("Title")}: ${this.actor.name}`;
  }

  /** Opens the importer for an actor, or brings its open importer to the front. */
  static open(actor) {
    const existing = foundry.applications.instances.get(`pathmuncher-importer-${actor.id}`);
    if (existing) return existing.bringToFront();
    return new PathmuncherImporter({ actor }).render({ force: true });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const flags = utils.getFlags(this.actor);
    const optionValue = (key) => flags?.[key] ?? CONSTANTS.ACTOR_FLAGS[key] ?? true;
    return Object.assign(context, {
      rootId: this.id,
      actor: { name: this.actor.name, img: this.actor.img },
      pathbuilderId: flags?.pathbuilderId ?? "",
      sources: SOURCES.map((s) => ({ ...s, label: i18n(`Source.${s.id}.Label`), hint: i18n(`Source.${s.id}.Hint`), active: s.id === this.source })),
      groups: OPTION_GROUPS.map((group) => ({
        id: group.id,
        legend: i18n(`Groups.${group.id}`),
        options: group.options.map((entry) => {
          const { key, parent } = typeof entry === "string" ? { key: entry, parent: null } : entry;
          return { key, parent, label: i18n(`Options.${key}`), checked: optionValue(key) !== false };
        }),
      })),
      buttons: [{ type: "submit", icon: "fas fa-file-import", label: i18n("Import"), name: "import" }],
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);
    // a nested option (blended slots) only applies while its parent (spells) is ticked
    for (const child of this.element.querySelectorAll("[data-parent-option]")) {
      const parent = this.element.querySelector(`input[name="options.${child.dataset.parentOption}"]`);
      const sync = () => child.toggleAttribute("disabled", !parent.checked);
      parent?.addEventListener("change", sync);
      if (parent) sync();
    }
    this.#showSource();
  }

  /** Shows the inputs for the chosen source (id, pasted JSON or file) without re-rendering. */
  #showSource() {
    for (const button of this.element.querySelectorAll("[data-action='setSource']")) {
      const active = button.dataset.source === this.source;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    for (const panel of this.element.querySelectorAll(".pathmuncher-source-panel")) {
      panel.hidden = panel.dataset.source !== this.source;
    }
  }

  static #onSetSource(_event, target) {
    this.source = target.dataset.source;
    this.#showSource();
    this.element.querySelector(`.pathmuncher-source-panel[data-source="${this.source}"] :is(input, textarea)`)?.focus();
  }

  static #onSelectAll(_event, target) {
    const checked = target.dataset.value === "true";
    for (const input of this.element.querySelectorAll(`fieldset[data-group="${target.dataset.group}"] input[type="checkbox"]`)) {
      input.checked = checked;
      input.dispatchEvent(new Event("change"));
    }
  }

  /** Shows progress through the import; Pathmuncher calls this with each stage. */
  #updateProgress(step, total, type, prefixLabel = "Cooking") {
    const progress = this.element?.querySelector(".pathmuncher-progress");
    if (!progress) return;
    progress.hidden = false;
    progress.querySelector("progress").value = total ? Math.min(1, step / total) : 0;
    progress.querySelector(".pathmuncher-progress-label").textContent
      = `${game.i18n.localize(`pathmuncher.Labels.${prefixLabel}`)}: ${game.i18n.localize(`pathmuncher.Labels.${type}`)}…`;
  }

  /** Locks the form while an import runs. */
  #setImporting(importing) {
    this.importing = importing;
    this.element.classList.toggle("importing", importing);
    for (const element of this.element.querySelectorAll("fieldset, button, input, textarea")) {
      if (importing) {
        element.dataset.wasDisabled = String(element.disabled);
        element.disabled = true;
      } else {
        element.disabled = element.dataset.wasDisabled === "true";
        delete element.dataset.wasDisabled;
      }
    }
    if (!importing) {
      const progress = this.element.querySelector(".pathmuncher-progress");
      if (progress) progress.hidden = true;
    }
  }

  static async #onSubmit(_event, _form, formData) {
    if (this.importing) return;
    const data = foundry.utils.expandObject(formData.object);
    const options = {
      ...data.options,
      pathbuilderId: this.source === "id" ? String(data.pathbuilderId ?? "").trim() : undefined,
      statusCallback: this.#updateProgress.bind(this),
      resolveMissingCore: PathmuncherImporter.#chooseMissingCore,
      resolveDeityConflict: DeityConflictDialog.choose,
      resolveUnansweredChoices: UnansweredChoicesDialog.choose,
      resolveAmmunition: AmmunitionDialog.choose,
    };
    logger.debug("Pathmuncher options", options);

    this.#setImporting(true);
    let completed = null;
    try {
      completed = await this.#import(options, data);
    } finally {
      if (this.rendered) this.#setImporting(false);
    }
    if (!completed) return;

    await this.close();
    await completed.postImportCheck();
  }

  /** Runs an import. Returns the Pathmuncher on success, or null once the user has been told why not. */
  async #import(options, data) {
    const pathmuncher = new Pathmuncher(this.actor, options);
    // nothing on the actor changes until there is a valid build and it has been fully processed
    if (!(await this.#loadSource(pathmuncher, data))) return null;

    logger.debug("Pathmuncher Source", pathmuncher.source);
    try {
      if (!(await pathmuncher.processCharacter())) {
        ui.notifications.info(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.ImportCancelled`));
        return null;
      }
    } catch (error) {
      logger.error("Pathmuncher processing failed", { error, pathmuncher });
      ui.notifications.error(game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.ProcessingFailed`, {
        error: error.message ?? error,
      }));
      return null;
    }
    logger.debug("Post processed character", pathmuncher);

    // items the import would replace that pathmuncher didn't create: the user decides
    let keepItemIds;
    const handAdded = pathmuncher.findHandAddedItems();
    if (handAdded.length > 0) {
      keepItemIds = await PathmuncherImporter.#chooseItemsToKeep(handAdded);
      if (keepItemIds === null) {
        ui.notifications.info(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.ImportCancelled`));
        return null;
      }
    }

    const actorBackup = this.actor.toObject();
    try {
      await pathmuncher.updateActor({ keepItemIds });
      // remembered for the next import of this actor; only once the import has succeeded
      await utils.setFlags(this.actor, Object.fromEntries(Object.entries(options).filter(([, value]) => typeof value !== "function")));
    } catch (error) {
      logger.error("Pathmuncher actor update failed", { error, pathmuncher, actorBackup });
      const backup = await PathmuncherImporter.#saveBackupActor(actorBackup);
      ui.notifications.error(game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.UpdateFailed`, {
        actor: this.actor.name,
        error: error.message ?? error,
        backup: backup?.name ?? "",
      }), { permanent: true });
      return null;
    }

    if (options.addFamiliars) {
      const petShop = new PetShop({
        type: "familiar",
        parent: this.actor,
        pathbuilderJson: pathmuncher.source,
      });
      await petShop.processPets();
      await petShop.addPetEffects();
    }
    logger.debug("Final import details", { actor: this.actor, pathmuncher, options });
    return pathmuncher;
  }

  /**
   * Loads the build into pathmuncher.source from the Pathbuilder id, the pasted JSON or a file.
   * Returns false, having told the user why, if there is no usable build.
   */
  async #loadSource(pathmuncher, data) {
    if (this.source === "id") return pathmuncher.fetchPathbuilder(data.pathbuilderId);

    let text = data.json ?? "";
    if (this.source === "file") {
      const file = this.element.querySelector("input[name='file']")?.files?.[0];
      if (!file) {
        ui.notifications.error(i18n("Source.file.Missing"));
        return false;
      }
      text = await foundry.utils.readTextFromFile(file);
    }

    let jsonData;
    try {
      jsonData = JSON.parse(String(text).trim());
    } catch (error) {
      logger.error("Unable to parse JSON data", error);
      ui.notifications.error(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.InvalidJson`));
      return false;
    }
    const build = Pathmuncher.getBuildFromJson(jsonData);
    if (!build) {
      ui.notifications.error(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.InvalidBuild`));
      return false;
    }
    pathmuncher.source = build;
    return true;
  }

  /**
   * Asks which hand-added items to keep. Resolves to the ids to keep, or null if the user cancels.
   */
  static async #chooseItemsToKeep(items) {
    const escape = foundry.utils.escapeHTML;
    const rows = items
      .map((item) => `<label class="pathmuncher-keep-item">
        <input type="checkbox" name="keep" value="${item.id}" checked>
        <img src="${escape(item.img)}" alt="">
        <span class="pathmuncher-keep-name">${escape(item.name)}</span>
        <span class="pathmuncher-keep-type">${escape(game.i18n.localize(`TYPES.Item.${item.type}`))}</span>
      </label>`)
      .join("");
    const content = `<p class="hint">${game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.KeepItems.Content`)}</p>
      <div class="pathmuncher-keep-items">${rows}</div>`;

    const result = await DialogV2.wait({
      window: { title: `${CONSTANTS.FLAG_NAME}.Dialogs.KeepItems.Title`, icon: "fas fa-hand-holding" },
      position: { width: 480 },
      classes: ["pathmuncher", "pathmuncher-keep-dialog"],
      content,
      rejectClose: false,
      buttons: [
        {
          action: "import",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.KeepItems.Import`,
          icon: "fas fa-file-import",
          default: true,
          callback: (_event, button) => [...button.form.querySelectorAll('input[name="keep"]:checked')].map((i) => i.value),
        },
        {
          action: "cancel",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.KeepItems.Cancel`,
          icon: "fas fa-times",
        },
      ],
    });
    return Array.isArray(result) ? result : null;
  }

  /**
   * Asks for the core items (class, ancestry...) no compendium has, dropped from a compendium or the
   * Items directory. Resolves to the dropped items keyed by result target, or null if the user cancels.
   * Anything left empty is skipped and reported as before.
   */
  static async #chooseMissingCore(missing) {
    const escape = foundry.utils.escapeHTML;
    const local = (key) => game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.MissingCore.${key}`);
    const chosen = {};
    const rows = missing
      .map((m) => `<div class="pathmuncher-missing-core-row">
        <span class="pathmuncher-missing-core-name">
          <span class="pathmuncher-missing-core-type">${escape(game.i18n.localize(`TYPES.Item.${m.itemType}`))}</span>
          ${escape(m.name)}
        </span>
        <button type="button" class="pathmuncher-drop-zone" data-target="${m.target}">
          <i class="fas fa-arrow-down-to-bracket" inert></i>
          <span>${escape(game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.MissingCore.Drop`, { type: game.i18n.localize(`TYPES.Item.${m.itemType}`) }))}</span>
        </button>
      </div>`)
      .join("");
    const content = `<p class="hint">${local("Content")}</p>
      <div class="pathmuncher-missing-core">${rows}</div>`;

    // fills a drop zone with the item dropped on it, if it is the right type
    const onDrop = async (event, zone, lookup) => {
      event.preventDefault();
      zone.classList.remove("drag-over");
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
      const item = data?.type === "Item" ? await fromUuid(data.uuid) : null;
      if (item?.type !== lookup.itemType) {
        ui.notifications.warn(game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.MissingCore.WrongType`, {
          type: game.i18n.localize(`TYPES.Item.${lookup.itemType}`),
        }));
        return;
      }
      chosen[lookup.target] = item;
      zone.classList.add("filled");
      zone.replaceChildren(Object.assign(document.createElement("img"), { src: item.img, alt: "" }),
        Object.assign(document.createElement("span"), { textContent: item.name }));
    };

    // the system's own compendium for this kind of item, else the first one searched
    const openCompendium = (lookup) => {
      const packs = lookup.packs.map((id) => game.packs.get(id)).filter(Boolean);
      const pack = packs.find((p) => p.metadata.packageName === game.system.id) ?? packs[0];
      pack?.render({ force: true });
    };

    const result = await DialogV2.wait({
      window: { title: `${CONSTANTS.FLAG_NAME}.Dialogs.MissingCore.Title`, icon: "fas fa-puzzle-piece" },
      position: { width: 480 },
      classes: ["pathmuncher", "pathmuncher-missing-core-dialog"],
      content,
      rejectClose: false,
      render: (_event, dialog) => {
        for (const zone of dialog.element.querySelectorAll(".pathmuncher-drop-zone")) {
          const lookup = missing.find((m) => m.target === zone.dataset.target);
          zone.addEventListener("click", () => openCompendium(lookup));
          zone.addEventListener("dragover", (event) => {
            event.preventDefault();
            zone.classList.add("drag-over");
          });
          zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
          zone.addEventListener("drop", (event) => onDrop(event, zone, lookup));
        }
      },
      buttons: [
        {
          action: "import",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.MissingCore.Import`,
          icon: "fas fa-file-import",
          default: true,
          callback: () => chosen,
        },
        {
          action: "cancel",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.MissingCore.Cancel`,
          icon: "fas fa-times",
        },
      ],
    });
    return result === "cancel" || !result ? null : result;
  }

  /**
   * Saves the pre-import actor data as a new actor, so a failed update can be recovered by hand.
   */
  static async #saveBackupActor(actorBackup) {
    try {
      const data = foundry.utils.deepClone(actorBackup);
      delete data._id;
      delete data.folder;
      data.name = `${actorBackup.name} (${game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Labels.PreImportBackup`)})`;
      if (data.prototypeToken) data.prototypeToken.name = data.name;
      foundry.utils.setProperty(data, "flags.pathmuncher.temp", false);
      return await Actor.create(data, { renderSheet: false });
    } catch (error) {
      logger.error("Unable to save a backup of the actor", { error, actorBackup });
      return null;
    }
  }

}
