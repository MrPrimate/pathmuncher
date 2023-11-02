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
    USE_CUSTOM_COMPENDIUM_MAPPINGS: "use-custom-compendium-mappings",
    CUSTOM_COMPENDIUM_MAPPINGS: "custom-compendium-mappings",
    USE_IMMEDIATE_DEEP_DIVE: "use-immediate-deep-dive",
  },

  FEAT_PRIORITY: [
    "Heritage",
    "Heritage Feat",
    "Ancestry",
    "Ancestry Feat",
    "Background",
    "Background Feat",
    "Class Feat",
    "Skill Feat",
    "General Feat",
    "Awarded Feat",
  ],

  ACTOR_FLAGS: {
    pathbuilderId: undefined,
    addFeats: true,
    addEquipment: true,
    addBackground: true,
    addHeritage: true,
    addAncestry: true,
    addSpells: true,
    adjustBlendedSlots: true,
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
  },

  CORE_COMPENDIUM_MAPPINGS: {
    feats: ["pf2e.feats-srd", "pf2e-playtest-data.war-of-immortals-playtest-class-feats"],
    ancestryFeatures: ["pf2e.ancestryfeatures"],
    classFeatures: ["pf2e.classfeatures", "pf2e-playtest-data.war-of-immortals-playtest-class-features"],
    actions: ["pf2e.actionspf2e", "pf2e-playtest-data.war-of-immortals-playtest-actions"],
    spells: [
      "pf2e-psychic-amps.psychic-psi-cantrips",
      "pf2e.spells-srd",
      "pf2e-playtest-data.war-of-immortals-playtest-spells",
    ],
    classes: ["pf2e.classes", "pf2e-playtest-data.war-of-immortals-playtest-classes"],
    ancestries: ["pf2e.ancestries"],
    heritages: ["pf2e.heritages"],
    equipment: ["pf2e.equipment-srd"],
    formulas: ["pf2e.equipment-srd"],
    deities: ["pf2e.deities"],
    backgrounds: ["pf2e.backgrounds"],
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

  [CONSTANTS.SETTINGS.USE_CUSTOM_COMPENDIUM_MAPPINGS]: {
    name: `${CONSTANTS.FLAG_NAME}.Settings.UseCustomCompendiumMappings.Name`,
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  },

  [CONSTANTS.SETTINGS.USE_IMMEDIATE_DEEP_DIVE]: {
    name: `${CONSTANTS.FLAG_NAME}.Settings.UseImmediateDeepDive.Name`,
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  },

  [CONSTANTS.SETTINGS.CUSTOM_COMPENDIUM_MAPPINGS]: {
    scope: "world",
    config: false,
    type: Object,
    default: {
      feats: [
        "battlezoo-ancestries-dragons-pf2e.pf2e-battlezoo-dragon-feats",
        "battlezoo-ancestries-year-of-monsters-pf2e.yom-features",
        "battlezoo-ancestries-year-of-monsters-pf2e.yom-feats",
        "clerics.clerics-feats",
        "clerics.clerics-features",
        "pf2e.feats-srd",
        "pf2e-playtest-data.war-of-immortals-playtest-class-feats",
      ],
      ancestryFeatures: [
        "battlezoo-ancestries-year-of-monsters-pf2e.yom-features",
        "pf2e.ancestryfeatures",
      ],
      classFeatures: [
        "battlezoo-ancestries-year-of-monsters-pf2e.yom-features",
        "battlezoo-ancestries-dragons-pf2e.pf2e-battlezoo-dragon-feats",
        "battlezoo-ancestries-year-of-monsters-pf2e.yom-feats",
        "clerics.clerics-doctrines",
        "clerics.clerics-feats",
        "clerics.clerics-features",
        "pf2e.classfeatures",
        "pf2e-playtest-data.war-of-immortals-playtest-class-features",
      ],
      actions: ["pf2e.actionspf2e", "pf2e-playtest-data.war-of-immortals-playtest-actions"],
      spells: ["pf2e-psychic-amps.psychic-psi-cantrips", "pf2e.spells-srd", "pf2e-playtest-data.war-of-immortals-playtest-spells"],
      classes: ["clerics.clerics-features", "pf2e.classes", "pf2e-playtest-data.war-of-immortals-playtest-classes"],
      ancestries: [
        "battlezoo-ancestries-dragons-pf2e.pf2e-battlezoo-dragon-ancestry",
        "battlezoo-ancestries-year-of-monsters-pf2e.yom-ancestries",
        "pf2e.ancestries",
      ],
      heritages: [
        "battlezoo-ancestries-dragons-pf2e.pf2e-battlezoo-dragon-heritages",
        "battlezoo-ancestries-year-of-monsters-pf2e.yom-heritages",
        "pf2e.heritages",
      ],
      equipment: [
        "battlezoo-ancestries-dragons-pf2e.pf2e-battlezoo-dragon-equipment",
        "battlezoo-ancestries-year-of-monsters-pf2e.yom-equipment",
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
