import CONSTANTS from "../constants.js";
import utils from "../utils.js";
import { Pathmuncher } from "./Pathmuncher.js";

export class PathmuncherImporter extends FormApplication {

  constructor(options, actor) {
    super(options);
    this.actor = game.actors.get(actor.id ? actor.id : actor._id);
    this.backup = duplicate(this.actor);
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.PathmuncherImporter.Title`);
    options.template = `${CONSTANTS.PATH}/templates/pathmuncher.hbs`;
    options.classes = ["pathmuncher"];
    options.width = 400;
    options.closeOnSubmit = false;
    return options;
  }

  /** @override */
  async getData() {
    const flags = utils.getFlags(this.actor);

    console.warn("actor", this.actor);
    return {
      flags,
      id: flags?.pathbuilderId ?? "",
      actor: this.actor,
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
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
    };
    console.warn(options)

    await utils.setFlags(this.actor, options);

    const pathmuncher = new Pathmuncher(this.actor, options);
    await pathmuncher.fetchPathbuilder(pathbuilderId);
    console.warn(pathmuncher.source);

    await pathmuncher.processCharacter();

    console.warn(pathmuncher);

    // this.close();

  }

}
