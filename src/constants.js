const debouncedReload = foundry.utils.debounce(() => window.location.reload(), 100);

const CONSTANTS = {
  MODULE_NAME: "pathmuncher",
  MODULE_FULL_NAME: "Pathmuncher",
  FLAG_NAME: "pathmuncher",
  SETTINGS: {
    // Enable options
    LOG_LEVEL: "log-level",
    RESTRICT_TO_TRUSTED: "restrict-to-trusted",
    ADD_VISION_FEATS: "add-vision-feats",
    COMPENDIUM_MAPPINGS: "compendium-mappings",
  },

  ACTOR_FLAGS: {
    pathbuilderId: undefined,
    addFeats: true,
    addEquipment: true,
    addBackground: true,
    addHeritage: true,
    addAncestry: true,
    addSpells: true,
    addMoney: true,
    addTreasure: true,
    addLores: true,
    addWeapons: true,
    addArmor: true,
    addDeity: true,
    addName: true,
    addClass: true,
    addFamiliars: true,
    addFormulas: true,
    askForChoices: false,
  },

  GET_DEFAULT_SETTINGS() {
    return foundry.utils.deepClone(CONSTANTS.DEFAULT_SETTINGS);
  },
};

CONSTANTS.DEFAULT_SETTINGS = {
  // Enable options
  [CONSTANTS.SETTINGS.RESTRICT_TO_TRUSTED]: {
    name: `${CONSTANTS.FLAG_NAME}.Settings.RestrictToTrusted.Name`,
    hint: `${CONSTANTS.FLAG_NAME}.Settings.RestrictToTrusted.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: debouncedReload,
  },

  // [CONSTANTS.SETTINGS.COMPENDIUM_MAPPINGS]: {
  //   scope: "world",
  //   config: false,
  //   type: Object,
  //   default: {
  //     feats: ["pf2e.feats-srd"],
  //     ancestryFeatures: ["pf2e.ancestryfeatures"],
  //     classFeatures: ["pf2e.classfeatures"],
  //     actions: ["pf2e.actionspf2e"],
  //     spells: ["pf2e.spells-srd", "pf2e-psychic-amps.psychic-psi-cantrips"],
  //     classes: ["pf2e.classes",],
  //     ancestries: ["pf2e.ancestries",],
  //     heritages: ["pf2e.heritages"],
  //     equipment: ["pf2e.equipment-srd"],
  //     formulas: ["pf2e.equipment-srd"],
  //     deities: ["pf2e.deities"],
  //     backgrounds: ["pf2e.backgrounds"],
  //   },
  // },

  [CONSTANTS.SETTINGS.COMPENDIUM_MAPPINGS]: {
    scope: "world",
    config: false,
    type: Object,
    default: {
      feats: [
        "pf2e-battlezoo-dragon-feats",
        "yom-features",
        "yom-feats",
        "clerics.clerics-feats",
        "clerics.clerics-features",
        "pf2e.feats-srd"
      ],
      ancestryFeatures: ["yom-features", "pf2e.ancestryfeatures"],
      classFeatures: [
        "yom-features",
        "pf2e-battlezoo-dragon-feats",
        "yom-feats",
        "clerics.clerics-doctrines",
        "clerics.clerics-feats",
        "clerics.clerics-features",
        "pf2e.classfeatures",
      ],
      actions: ["pf2e.actionspf2e"],
      spells: ["pf2e.spells-srd", "pf2e-psychic-amps.psychic-psi-cantrips"],
      classes: ["clerics.clerics-features", "pf2e.classes",],
      ancestries: [
        "pf2e-battlezoo-dragon-ancestry",
        "yom-ancestries",
        "pf2e.ancestries",
      ],
      heritages: [
        "pf2e-battlezoo-dragon-heritages",
        "yom-heritages",
        "pf2e.heritages",
      ],
      equipment: [
        "pf2e-battlezoo-dragon-equipment",
        "yom-equipment",
        "pf2e.equipment-srd"
      ],
      formulas: ["pf2e.equipment-srd"],
      deities: ["clerics.clerics-deities", "pf2e.deities"],
      backgrounds: ["pf2e.backgrounds"],
    },
  },

  [CONSTANTS.SETTINGS.ADD_VISION_FEATS]: {
    name: `${CONSTANTS.FLAG_NAME}.Settings.AddVisionFeats.Name`,
    hint: `${CONSTANTS.FLAG_NAME}.Settings.AddVisionFeats.Hint`,
    scope: "player",
    config: true,
    type: Boolean,
    default: true,
  },

  // debug
  [CONSTANTS.SETTINGS.LOG_LEVEL]: {
    name: `${CONSTANTS.FLAG_NAME}.Settings.LogLevel.Name`,
    hint: `${CONSTANTS.FLAG_NAME}.Settings.LogLevel.Hint`,
    scope: "world",
    config: true,
    type: String,
    choices: {
      DEBUG: `${CONSTANTS.FLAG_NAME}.Settings.LogLevel.debug`,
      INFO: `${CONSTANTS.FLAG_NAME}.Settings.LogLevel.info`,
      WARN: `${CONSTANTS.FLAG_NAME}.Settings.LogLevel.warn`,
      ERR: `${CONSTANTS.FLAG_NAME}.Settings.LogLevel.error`,
      OFF: `${CONSTANTS.FLAG_NAME}.Settings.LogLevel.off`,
    },
    default: "WARN",
  }

};

CONSTANTS.PATH = `modules/${CONSTANTS.MODULE_NAME}`;

export default CONSTANTS;
