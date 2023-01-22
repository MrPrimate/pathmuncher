import CONSTANTS from "../constants.js";
import utils from "../utils.js";

export class Pathmuncher extends FormApplication {

  constructor(options, actor) {
    super(options);
    this.actor = game.actors.get(actor.id ? actor.id : actor._id);
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Pathmuncher.Title`);
    options.template = `${CONSTANTS.PATH}/templates/pathmuncher.hbs`;
    options.classes = ["gng", "sheet"];
    options.width = 300;
    return options;
  }

  /** @override */
  async getData() { // eslint-disable-line class-methods-use-this
    // console.warn(this);

    const flags = utils.getFlags(this.actor);

    return {
      flags,
      actor: this.actor,
    };
  }

  /** @override */
  // eslint-disable-next-line no-unused-vars
  async _updateObject(event, formData) {
    event.preventDefault();

    console.warn(formData);
    const flags = utils.getFlags(this.actor);
    await utils.setFlags(this.actor, flags);

  }
}
