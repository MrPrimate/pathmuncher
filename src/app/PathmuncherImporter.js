import CONSTANTS from "../constants.js";
import logger from "../logger.js";
import utils from "../utils.js";
import { Pathmuncher } from "./Pathmuncher.js";
import { PetShop } from "./PetShop.js";

export class PathmuncherImporter extends FormApplication {

  constructor(options, actor) {
    super(options);
    this.actor = game.actors.get(actor.id ? actor.id : actor._id);
    this.mode = "number";
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.PathmuncherImporter.Title`);
    options.template = `${CONSTANTS.PATH}/templates/pathmuncher.hbs`;
    options.classes = ["pathmuncher"];
    options.id = "pathmuncher";
    options.width = 400;
    options.closeOnSubmit = false;
    options.tabs = [{ navSelector: ".tabs", contentSelector: "form", initial: "number" }];
    return options;
  }

  /** @override */
  async getData() {
    const flags = utils.getFlags(this.actor);

    return {
      flags,
      id: flags?.pathbuilderId ?? "",
      actor: this.actor,
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    $("#pathmuncher").css("height", "auto");

    $(html)
      .find('.item')
      .on("click", (event) => {
        if (!event.target?.dataset?.tab) return;
        this.mode = event.target.dataset.tab;
      });
  }

  static _updateProgress(total, count, type, prefixLabel = "Cooking") {
    const localizedType = game.i18n.localize(`pathmuncher.Labels.${type}`);
    const progressBar = document.getElementById("pathmuncher-status");
    progressBar.style.width = `${Math.trunc((count / total) * 100)}%`;
    progressBar.innerHTML = `<span>${game.i18n.localize(`pathmuncher.Labels.${prefixLabel}`)} (${localizedType})...</span>`;
  }

  async _updateObject(event, formData) {
    document.getElementById("pathmuncher-button").disabled = true;
    const pathbuilderId = formData.textBoxBuildID;
    const options = {
      pathbuilderId,
      addMoney: formData.checkBoxMoney,
      addFeats: formData.checkBoxFeats,
      addSpells: formData.checkBoxSpells,
      adjustBlendedSlots: formData.checkBoxBlendedSlots,
      addEquipment: formData.checkBoxEquipment,
      addTreasure: formData.checkBoxTreasure,
      addLores: formData.checkBoxLores,
      addWeapons: formData.checkBoxWeapons,
      addArmor: formData.checkBoxArmor,
      addDeity: formData.checkBoxDeity,
      addName: formData.checkBoxName,
      addClass: formData.checkBoxClass,
      addBackground: formData.checkBoxBackground,
      addHeritage: formData.checkBoxHeritage,
      addAncestry: formData.checkBoxAncestry,
      addFamiliars: formData.checkBoxFamiliars,
      addFormulas: formData.checkBoxFormulas,
      statusCallback: PathmuncherImporter._updateProgress.bind(this),
    };
    logger.debug("Pathmuncher options", options);

    const statusBar = document.getElementById("pathmuncher-import-progress");
    const pathmuncher = new Pathmuncher(this.actor, options);
    try {
      // nothing on the actor changes until there is a valid build and it has been fully processed
      if (!(await this.#loadSource(pathmuncher, formData))) return;

      statusBar.classList.remove("import-hidden");

      logger.debug("Pathmuncher Source", pathmuncher.source);
      try {
        await pathmuncher.processCharacter();
      } catch (error) {
        logger.error("Pathmuncher processing failed", { error, pathmuncher });
        ui.notifications.error(game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.ProcessingFailed`, {
          error: error.message ?? error,
        }));
        await utils.removeTempActors();
        return;
      }
      logger.debug("Post processed character", pathmuncher);

      // items the import would replace that pathmuncher didn't create: the user decides
      let keepItemIds;
      const handAdded = pathmuncher.findHandAddedItems();
      if (handAdded.length > 0) {
        keepItemIds = await PathmuncherImporter.#chooseItemsToKeep(handAdded);
        if (keepItemIds === null) {
          ui.notifications.info(game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.ImportCancelled`));
          await utils.removeTempActors();
          return;
        }
      }

      const actorBackup = this.actor.toObject();
      try {
        await pathmuncher.updateActor({ keepItemIds });
        // remembered for the next import of this actor; only once the import has succeeded
        await utils.setFlags(this.actor, options);
      } catch (error) {
        logger.error("Pathmuncher actor update failed", { error, pathmuncher, actorBackup });
        const backup = await PathmuncherImporter.#saveBackupActor(actorBackup);
        ui.notifications.error(game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.UpdateFailed`, {
          actor: this.actor.name,
          error: error.message ?? error,
          backup: backup?.name ?? "",
        }), { permanent: true });
        await utils.removeTempActors();
        return;
      }
    } finally {
      statusBar?.classList.add("import-hidden");
      const button = document.getElementById("pathmuncher-button");
      if (button) button.disabled = false;
    }

    logger.debug("Final import details", {
      actor: this.actor,
      pathmuncher,
      options,
      pathbuilderSource: pathmuncher.source,
      pathbuilderId,
    });

    if (options.addFamiliars) {
      const petShop = new PetShop({
        type: "familiar",
        parent: this.actor,
        pathbuilderJson: pathmuncher.source,
      });
      await petShop.processPets();
      await petShop.addPetEffects();
    }
    this.close();
    await pathmuncher.postImportCheck();
  }

  /**
   * Loads the build into pathmuncher.source from the Pathbuilder id or the pasted JSON.
   * Returns false, having told the user why, if there is no usable build.
   */
  async #loadSource(pathmuncher, formData) {
    if (this.mode === "number") {
      return pathmuncher.fetchPathbuilder(formData.textBoxBuildID);
    }

    let jsonData;
    try {
      jsonData = JSON.parse(formData.textBoxBuildJSON.trim());
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
    const escape = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const rows = items
      .map((item) => `<label class="pathmuncher-keep-item">
        <input type="checkbox" name="keep" value="${item.id}" checked>
        <img src="${escape(item.img)}" width="24" height="24"> ${escape(item.name)}
        <span class="pathmuncher-keep-type">(${escape(game.i18n.localize(`TYPES.Item.${item.type}`))})</span>
      </label>`)
      .join("");
    const content = `<p>${game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.KeepItems.Content`)}</p>
      <div class="pathmuncher-keep-items">${rows}</div>`;

    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.KeepItems.Title`) },
      position: { width: 480 },
      classes: ["pathmuncher-keep-dialog"],
      content,
      rejectClose: false,
      buttons: [
        {
          action: "import",
          label: game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.KeepItems.Import`),
          icon: "fas fa-file-import",
          default: true,
          callback: (_event, button) => [...button.form.querySelectorAll('input[name="keep"]:checked')].map((i) => i.value),
        },
        {
          action: "cancel",
          label: game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.KeepItems.Cancel`),
          icon: "fas fa-times",
        },
      ],
    });
    return Array.isArray(result) ? result : null;
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
