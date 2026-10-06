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

      await utils.setFlags(this.actor, options);
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

      const actorBackup = this.actor.toObject();
      try {
        await pathmuncher.updateActor();
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
