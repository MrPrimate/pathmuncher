import CONSTANTS from "../constants.js";
import utils from "../utils.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Chooses which compendiums each kind of lookup searches, and in what order. */
export class CompendiumSelector extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.lookups = foundry.utils.deepClone(utils.setting("CUSTOM_COMPENDIUM_MAPPINGS"));
    this.packs = game.packs
      .filter((p) => p.metadata.type === "Item")
      .map((p) => ({ id: p.metadata.id, label: `${p.metadata.label} (${p.metadata.packageName})` }));
    this.currentType = null;
    this.selected = [];
  }

  static DEFAULT_OPTIONS = {
    id: "pathmuncher-compendium-selector",
    classes: ["pathmuncher", "pathmuncher-compendium-selector"],
    window: {
      title: `${CONSTANTS.FLAG_NAME}.Dialogs.CompendiumSelector.Title`,
      icon: "fas fa-book",
      resizable: true,
      contentClasses: ["standard-form"],
    },
    position: { width: 760, height: 600 },
    actions: {
      add: CompendiumSelector.#onAdd,
      remove: CompendiumSelector.#onRemove,
      up: CompendiumSelector.#onMove,
      down: CompendiumSelector.#onMove,
      reset: CompendiumSelector.#onReset,
    },
  };

  static PARTS = {
    body: { template: `${CONSTANTS.PATH}/templates/compendium-selector.hbs` },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const searched = this.currentType ? this.lookups[this.currentType] ?? [] : [];
    const installed = (id) => this.packs.find((p) => p.id === id);
    const notInstalled = game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.CompendiumSelector.NotInstalled`);
    return Object.assign(context, {
      enabled: utils.setting("USE_CUSTOM_COMPENDIUM_MAPPINGS"),
      types: Object.keys(this.lookups).map((key) => ({
        key,
        label: game.i18n.localize(`${CONSTANTS.FLAG_NAME}.CompendiumGroups.${key}`),
        selected: key === this.currentType,
      })),
      currentType: this.currentType,
      available: this.packs.filter((p) => !searched.includes(p.id)).map((p) => ({ ...p, selected: this.selected.includes(p.id) })),
      searched: searched.map((id) => ({
        id,
        label: installed(id)?.label ?? `${id} (${notInstalled})`,
        missing: !installed(id),
        selected: this.selected.includes(id),
      })),
      buttons: [{ type: "button", action: "reset", icon: "fas fa-undo", label: `${CONSTANTS.FLAG_NAME}.Dialogs.CompendiumSelector.Reset` }],
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector("[name='type']")?.addEventListener("change", (event) => {
      this.currentType = event.target.value || null;
      this.selected = [];
      this.render();
    });
    this.element.querySelector("[name='enabled']")?.addEventListener("change", async (event) => {
      await utils.updateSetting("USE_CUSTOM_COMPENDIUM_MAPPINGS", event.target.checked);
    });
  }

  #selectedIn(list) {
    return [...(this.element.querySelector(`select[name='${list}']`)?.selectedOptions ?? [])].map((o) => o.value);
  }

  async #save() {
    await utils.updateSetting("CUSTOM_COMPENDIUM_MAPPINGS", this.lookups);
    this.render();
  }

  static async #onAdd() {
    if (!this.currentType) return;
    this.selected = this.#selectedIn("available");
    this.lookups[this.currentType] = [...this.lookups[this.currentType], ...this.selected];
    await this.#save();
  }

  static async #onRemove() {
    if (!this.currentType) return;
    this.selected = this.#selectedIn("searched");
    this.lookups[this.currentType] = this.lookups[this.currentType].filter((id) => !this.selected.includes(id));
    await this.#save();
  }

  static async #onMove(_event, target) {
    if (!this.currentType) return;
    this.selected = this.#selectedIn("searched");
    const list = [...this.lookups[this.currentType]];
    const step = target.dataset.action === "up" ? -1 : 1;
    const indexes = this.selected.map((id) => list.indexOf(id)).sort((a, b) => (step < 0 ? a - b : b - a));
    for (const index of indexes) {
      const to = index + step;
      // a selected neighbour moves with it rather than swapping past it
      if (to >= 0 && to < list.length && !this.selected.includes(list[to])) {
        [list[index], list[to]] = [list[to], list[index]];
      }
    }
    this.lookups[this.currentType] = list;
    await this.#save();
  }

  static async #onReset() {
    this.lookups = foundry.utils.deepClone(CONSTANTS.GET_DEFAULT_SETTINGS()[CONSTANTS.SETTINGS.CUSTOM_COMPENDIUM_MAPPINGS].default);
    this.currentType = null;
    this.selected = [];
    await this.#save();
  }
}
