import CONSTANTS from "../constants.js";
import logger from "../logger.js";
import utils from "../utils.js";
import { Pathmuncher } from "./Pathmuncher.js";
import { PetShop } from "./PetShop.js";

export class PathmuncherImporter extends FormApplication {

  constructor(options, actor) {
    super(options);
    this.actor = game.actors.get(actor.id ? actor.id : actor._id);
    this.backup = duplicate(this.actor);
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

  static _updateProgress(total, count, type) {
    const localizedType = `pathmuncher.Label.${type}`;
    $(".import-progress-bar")
      .width(`${Math.trunc((count / total) * 100)}%`)
      .html(
        `<span>${game.i18n.localize("pathmuncher.Label.Working")} (${game.i18n.localize(localizedType)})...</span>`
      );
  }

  async _updateObject(event, formData) {
    const pathbuilderId = formData.textBoxBuildID;
    const options = {
      pathbuilderId,
      addMoney: formData.checkBoxMoney,
      addFeats: formData.checkBoxFeats,
      addSpells: formData.checkBoxSpells,
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
      askForChoices: formData.checkBoxAskForChoices,
    };
    logger.debug("Pathmuncher options", options);

    await utils.setFlags(this.actor, options);

    const pathmuncher = new Pathmuncher(this.actor, options);
    if (this.mode === "number") {
      await pathmuncher.fetchPathbuilder(pathbuilderId);
    } else if (this.mode === "json") {
      try {
        const jsonData = JSON.parse(formData.textBoxBuildJSON.trim());
        pathmuncher.source = jsonData.build;
      } catch (err) {
        ui.notifications.error("Unable to parse JSON data");
        return;
      }
    }

    logger.debug("Pathmuncher Source", pathmuncher.source);
    await pathmuncher.processCharacter();
    logger.debug("Post processed character", pathmuncher);
    await pathmuncher.updateActor();
    logger.debug("Final import details", {
      actor: this.actor,
      pathmuncher,
      options,
      pathbuilderSource: pathmuncher.source,
      pathbuilderId,
    });

    if (options.addFamiliars) {
      const petShop = new PetShop({ parent: this.actor, pathbuilderJson: pathmuncher.source });
      await petShop.processPets();
      await petShop.addPetEffects();
    }
    this.close();
    await pathmuncher.postImportCheck();
  }

}
