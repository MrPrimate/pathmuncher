import CONSTANTS from "./constants.js";
import utils from "./utils.js";

const LOG_LEVELS = ["VERBOSE", "DEBUG", "INFO", "WARN", "ERR", "OFF"];

// the console method for each level: there is no console.verbose, so verbose goes to debug
const CONSOLE_METHODS = {
  VERBOSE: "debug",
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERR: "error",
};

const logger = {
  /** Whether messages at this level are shown with the current log level setting. */
  enabled: (logLevel) => {
    if (typeof logLevel !== "string") return false;
    const setting = utils.setting("LOG_LEVEL");
    const logLevelIndex = LOG_LEVELS.indexOf(logLevel.toUpperCase());
    return setting !== "OFF" && logLevelIndex !== -1 && logLevelIndex >= LOG_LEVELS.indexOf(setting);
  },

  /**
   * Logs a message and its payload. A payload given as a function is only called when the message
   * is shown, so costly payloads (deep clones of documents) cost nothing at quieter log levels.
   */
  log: (logLevel, ...data) => {
    if (data.length === 0 || !logger.enabled(logLevel)) return;

    const level = logLevel.toUpperCase();
    const [message, ...rest] = data;
    const msg = typeof message === "string"
      ? message
      : "No logging message provided.  Please see the payload for more information.";
    const payload = (typeof message === "string" ? rest : data)
      .map((value) => (typeof value === "function" ? value() : value));
    // eslint-disable-next-line no-console
    console[CONSOLE_METHODS[level]](`${CONSTANTS.MODULE_NAME} | ${level} > ${msg}`, ...payload);
  },

  verbose: (...data) => {
    logger.log("VERBOSE", ...data);
  },

  debug: (...data) => {
    logger.log("DEBUG", ...data);
  },

  info: (...data) => {
    logger.log("INFO", ...data);
  },

  warn: (...data) => {
    logger.log("WARN", ...data);
  },

  error: (...data) => {
    logger.log("ERR", ...data);
  },
};
export default logger;
