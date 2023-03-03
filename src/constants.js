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
