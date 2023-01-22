import CONSTANTS from "../constants.js";
import utils from "../utils.js";
import { Pathmuncher } from "./Pathmuncher.js";

export class PathmuncherImporter extends FormApplication {

  constructor(options, actor) {
    super(options);
    this.actor = game.actors.get(actor.id ? actor.id : actor._id);
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.PathmuncherImporter.Title`);
    options.template = `${CONSTANTS.PATH}/templates/pathmuncher.hbs`;
    options.classes = ["pathmuncher"];
    options.width = 400;
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
    this.html = html;

    html.find(".pathmuncher-button").on("click", this.importCharacter.bind(this));
  }

  static _updateProgress(total, count, type) {
    const localizedType = `pathmuncher.Label.${type}`;
    $(".import-progress-bar")
      .width(`${Math.trunc((count / total) * 100)}%`)
      .html(
        `<span>${game.i18n.localize("pathmuncher.Label.Working")} (${game.i18n.localize(localizedType)})...</span>`
      );
  }

  async importCharacter(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const a = event.currentTarget;
    const action = a.dataset.button;

    if (action !== "pathmuncher") return;

    console.warn(this.form);
    const pathbuilderId = this.form[4].value;

    const flags = utils.getFlags(this.actor);
    flags.pathbuilderId = pathbuilderId;
    await utils.setFlags(this.actor, flags);

    const pathmuncher = new Pathmuncher(this.actor);
    await pathmuncher.fetchPathbuilder(pathbuilderId);
    console.warn(pathmuncher.source);

    await pathmuncher.processCharacter();

    console.warn(pathmuncher);

  }

}
