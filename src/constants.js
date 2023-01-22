const debouncedReload = foundry.utils.debounce(() => window.location.reload(), 100);

const CONSTANTS = {
  MODULE_NAME: "pathmuncher",
  MODULE_FULL_NAME: "Pathmuncher",
  FLAG_NAME: "pathmuncher",
  SETTINGS: {
    // Enable options
    ENABLE_WOUNDS: "enable-wounds",
    LOG_LEVEL: "log-level",
  },

  GET_DEFAULT_SETTINGS() {
    return foundry.utils.deepClone(CONSTANTS.DEFAULT_SETTINGS);
  },

  WOUNDS: {
    MINIMUM_OPEN_WOUNDS: 3,
  },

};

CONSTANTS.DEFAULT_SETTINGS = {
  // Enable options
  [CONSTANTS.SETTINGS.ENABLE_WOUNDS]: {
    name: `${CONSTANTS.FLAG_NAME}.Settings.EnableWounds.Name`,
    hint: `${CONSTANTS.FLAG_NAME}.Settings.EnableWounds.Hint`,
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: debouncedReload,
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

CONSTANTS.PATH = `modules/${CONSTANTS.MODULE_NAME}/`;

export default CONSTANTS;
