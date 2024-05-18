import CONSTANTS from "../constants.js";
import utils from "../utils.js";

export class CompendiumSelector extends FormApplication {
  constructor() {
    super();
    this.lookups = utils.setting("CUSTOM_COMPENDIUM_MAPPINGS");
    this.packs = game.packs
      .filter((p) => p.metadata.type === "Item")
      .map((p) => {
        return { id: p.metadata.id, label: `${p.metadata.label} (${p.metadata.packageName})` };
      });
    this.currentType = null;
    this.useCustomCompendiums = utils.setting("USE_CUSTOM_COMPENDIUM_MAPPINGS");
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "pathmuncher-compendium-selector",
      template: `${CONSTANTS.PATH}/templates/compendium-selector.hbs`,
      width: 722,
      height: 275,
      title: game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.CompendiumSelector.Title`),
      resizable: true,
      classes: ['pathmuncher-compendium-selector'],
    });
  }

  getData() {
    const lookups = [];
    for (const key in this.lookups) {
      lookups.push({
        key,
        label: game.i18n.localize(`${CONSTANTS.FLAG_NAME}.CompendiumGroups.${key}`),
      });
    }
    return {
      lookups,
      title: this.options.title,
      sourceItems: [],
      compendiumItems: [],
      useCustomCompendiums: this.useCustomCompendiums,
    };
  }

  async reset() {
    const defaults = CONSTANTS.GET_DEFAULT_SETTINGS();
    this.lookups = defaults[CONSTANTS.SETTINGS.CUSTOM_COMPENDIUM_MAPPINGS].default;
    await utils.updateSetting("CUSTOM_COMPENDIUM_MAPPINGS", this.lookups);
    this.currentType = null;
    this.render(true);
  }

  async enableCustomCompendiums() {
    this.useCustomCompendiums = !this.useCustomCompendiums;
    await utils.updateSetting("USE_CUSTOM_COMPENDIUM_MAPPINGS", this.useCustomCompendiums);
  }

  filterList(event) {
    const compendiumType = event.srcElement.value;
    const sourceList = document.getElementById("sourceList");
    const compendiumList = document.getElementById("compendiumList");

    const sourceOptions = this.packs.filter((p) => !this.lookups[compendiumType].includes(p.id));
    const compendiumOptions = this.packs.filter((p) => this.lookups[compendiumType].includes(p.id));

    sourceList.innerHTML = "";
    compendiumList.innerHTML = "";

    sourceOptions.forEach((option) => {
      const sourceListItem = document.createElement("option");
      sourceListItem.value = option.id;
      sourceListItem.appendChild(document.createTextNode(option.label));
      sourceList.appendChild(sourceListItem);
    });

    compendiumOptions.forEach((option) => {
      const compendiumListItem = document.createElement("option");
      compendiumListItem.value = option.id;
      compendiumListItem.appendChild(document.createTextNode(option.label));
      compendiumList.appendChild(compendiumListItem);
    });

    this.currentType = compendiumType;
  }

  async updateCompendiums() {
    const compendiumList = document.getElementById("compendiumList");
    const compendiumOptions = Array.from(compendiumList.options);
    const compendiumIds = compendiumOptions.map((option) => {
      return option.value;
    });

    this.lookups[this.currentType] = compendiumIds;

    utils.updateSetting("CUSTOM_COMPENDIUM_MAPPINGS", this.lookups);
  }

  async addCompendium() {
    const sourceList = document.getElementById("sourceList");
    const compendiumList = document.getElementById("compendiumList");
    const selectedOptions = Array.from(sourceList.selectedOptions);

    selectedOptions.forEach((option) => {
      compendiumList.appendChild(option);
    });

    await this.updateCompendiums();
  }

  async removeCompendium() {
    const sourceList = document.getElementById("sourceList");
    const compendiumList = document.getElementById("compendiumList");
    const selectedOptions = Array.from(compendiumList.selectedOptions);

    selectedOptions.forEach((option) => {
      sourceList.appendChild(option);
    });
    await this.updateCompendiums();
  }

  async moveUp() {
    const compendiumList = document.getElementById("compendiumList");
    const selectedOption = compendiumList.selectedOptions[0];

    if (selectedOption && selectedOption.previousElementSibling) {
      compendiumList.insertBefore(selectedOption, selectedOption.previousElementSibling);
    }
    await this.updateCompendiums();
  }

  async moveDown() {
    const compendiumList = document.getElementById("compendiumList");
    const selectedOption = compendiumList.selectedOptions[0];

    if (selectedOption && selectedOption.nextElementSibling) {
      compendiumList.insertBefore(selectedOption.nextElementSibling, selectedOption);
    }
    await this.updateCompendiums();
  }

  activateListeners(html) {
    super.activateListeners(html);

    document.getElementById("addButton").addEventListener("click", this.addCompendium.bind(this));
    document.getElementById("removeButton").addEventListener("click", this.removeCompendium.bind(this));
    document.getElementById("upButton").addEventListener("click", this.moveUp.bind(this));
    document.getElementById("downButton").addEventListener("click", this.moveDown.bind(this));
    document.getElementById("compSelector").addEventListener("change", this.filterList.bind(this));
    document.getElementById("resetButton").addEventListener("click", this.reset.bind(this));
    document.getElementById("enableCustomCompendiums").addEventListener("change", this.enableCustomCompendiums.bind(this));
  }
}
