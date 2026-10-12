import CONSTANTS from "../constants.js";
import logger from "../logger.js";
import { EidolonEditor } from "./EidolonEditor.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const local = (key) => game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.EidolonBuilder.${key}`);

/**
 * Walks through an eidolon's choices (EidolonEditor): each choice its items make, by section, with the
 * stat block of the eidolon as it would be beside them, updated as choices change. Building writes the
 * choices to the eidolon.
 */
export class EidolonBuilderApp extends HandlebarsApplicationMixin(ApplicationV2) {

  /**
   * @param {object} options
   * @param {Actor} options.actor        the eidolon
   * @param {Function} [options.onClose]  called with whether the choices were written, when it closes
   */
  constructor(options = {}) {
    super({ ...options, id: `pathmuncher-eidolon-builder-${options.actor.id}` });
    this.actor = options.actor;
    this.onCloseCallback = options.onClose ?? null;
    this.editor = new EidolonEditor(this.actor);
    this.answers = null;
    this.applied = false;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["pathmuncher", "pathmuncher-eidolon-builder"],
    window: { icon: "fas fa-dragon", resizable: true },
    position: { width: 980, height: 720 },
    form: { handler: EidolonBuilderApp.#onSubmit, closeOnSubmit: false, submitOnChange: false },
    actions: { reset: EidolonBuilderApp.#onReset, keep: EidolonBuilderApp.#onKeep },
  };

  static PARTS = {
    body: { template: `${CONSTANTS.PATH}/templates/eidolon-builder.hbs`, scrollable: [".pathmuncher-eidolon-choices", ".pathmuncher-eidolon-stats"] },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  get title() {
    return `${local("Title")}: ${this.actor.name}`;
  }

  /** Opens the builder for an eidolon, or brings its open builder to the front. */
  static open(actor, { onClose = null } = {}) {
    const existing = foundry.applications.instances.get(`pathmuncher-eidolon-builder-${actor.id}`);
    if (existing) return existing.bringToFront();
    return new EidolonBuilderApp({ actor, onClose }).render({ force: true });
  }

  /** Opens the builder and waits for it to close: whether the choices were written. */
  static review({ eidolon }) {
    return new Promise((resolve) => {
      EidolonBuilderApp.open(eidolon, { onClose: resolve });
    });
  }

  /** Whether an actor is an eidolon the builder can work on. */
  static isEidolon(actor) {
    return actor?.type === "character" && actor.class?.slug === "eidolon" && actor.isOwner;
  }

  async #ensureState() {
    if (this.answers) return;
    this.choices = await this.editor.choices();
    this.answers = this.editor.current;
  }

  /** A section's choices that apply, grouped by the item making them, each with its options offered. */
  #sectionItems(id, preview, notes = {}) {
    const items = [];
    const applicable = this.choices.filter((c) => c.section === id)
      .map((choice) => ({ choice, ...EidolonEditor.offered(choice, preview) }))
      .filter(({ applies }) => applies);
    for (const { choice, options: offered } of applicable) {
      const current = JSON.stringify(this.answers[choice.key] ?? null);
      let group = items.find((g) => g.itemId === choice.itemId);
      if (!group) items.push(group = { itemId: choice.itemId, name: choice.itemName, choices: [] });
      group.choices.push({
        key: choice.key,
        prompt: choice.prompt,
        note: notes[choice.flag] ?? null,
        unanswered: current === "null",
        options: offered.map((o, index) => {
          const selected = JSON.stringify(o.value) === current;
          return { index, label: o.label, selected, disabled: !o.allowed && !selected };
        }),
      });
    }
    return items;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    await this.#ensureState();
    const preview = await this.editor.preview(this.answers);
    const stats = await EidolonEditor.statBlock(preview);
    // a feat that sets the eidolon's size outright (Hulking Size) overrides the size picked
    const notes = stats.sizeSetBy
      ? { companionSize: game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.EidolonBuilder.SizeSetBy`, { item: stats.sizeSetBy, size: stats.size }) }
      : {};
    const sections = EidolonEditor.SECTIONS
      .map((id) => ({ id, label: local(`Sections.${id}`), items: this.#sectionItems(id, preview, notes), boosts: id === "boosts" }))
      .filter((section) => section.items.length > 0);

    return Object.assign(context, {
      sections,
      stats,
      hint: local("Hint"),
      buttons: [
        { type: "button", action: "reset", icon: "fas fa-undo", label: `${CONSTANTS.FLAG_NAME}.Dialogs.EidolonBuilder.Reset` },
        { type: "button", action: "keep", icon: "fas fa-forward", label: `${CONSTANTS.FLAG_NAME}.Dialogs.EidolonBuilder.Keep` },
        { type: "submit", icon: "fas fa-hammer", label: `${CONSTANTS.FLAG_NAME}.Dialogs.EidolonBuilder.Build` },
      ],
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);
    for (const select of this.element.querySelectorAll("select[data-choice]")) {
      select.addEventListener("change", () => {
        const choice = this.choices.find((c) => c.key === select.dataset.choice);
        this.answers[choice.key] = choice.options[Number(select.value)]?.value ?? null;
        this.render({ parts: ["body"] });
      });
    }
  }

  static async #onSubmit() {
    try {
      await this.editor.apply(this.answers);
      this.applied = true;
      ui.notifications.info(game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.EidolonBuilder.Built`, { name: this.actor.name }));
    } catch (error) {
      logger.error("Unable to write the eidolon's choices", { error, answers: this.answers });
      ui.notifications.error(game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.EidolonBuilder.Failed`, { error: error.message ?? error }));
      return;
    }
    await this.close();
  }

  static #onReset() {
    this.answers = this.editor.current;
    this.render({ parts: ["body"] });
  }

  static #onKeep() {
    this.close();
  }

  _onClose(options) {
    super._onClose(options);
    this.onCloseCallback?.(this.applied);
    this.onCloseCallback = null;
  }

}
