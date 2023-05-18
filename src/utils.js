import CONSTANTS from "./constants.js";

const utils = {

  isObject: (obj) => {
    return typeof obj === 'object' && !Array.isArray(obj) && obj !== null;
  },

  isString: (str) => {
    return typeof str === 'string' || str instanceof String;
  },

  wait: async (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  },

  capitalize: (s) => {
    if (typeof s !== "string") return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  },

  setting: (key) => {
    return game.settings.get(CONSTANTS.MODULE_NAME, CONSTANTS.SETTINGS[key]);
  },

  updateSetting: async (key, value) => {
    return game.settings.set(CONSTANTS.MODULE_NAME, CONSTANTS.SETTINGS[key], value);
  },

  getFlags: (actor) => {
    const flags = actor.flags[CONSTANTS.FLAG_NAME]
      ? actor.flags[CONSTANTS.FLAG_NAME]
      : CONSTANTS.ACTOR_FLAGS;
    return flags;
  },

  setFlags: async (actor, flags) => {
    let updateData = {};
    setProperty(updateData, `flags.${CONSTANTS.FLAG_NAME}`, flags);
    await actor.update(updateData);
    return actor;
  },

  resetFlags: async (actor) => {
    return utils.setFlags(actor, null);
  },


  getOrCreateFolder: async (root, entityType, folderName, folderColor = "") => {
    let folder = game.folders.contents.find((f) =>
      f.type === entityType && f.name === folderName
      // if a root folder we want to match the root id for the parent folder
      && (root ? root.id : null) === (f.folder?.id ?? null)
    );
    // console.warn(`Looking for ${root} ${entityType} ${folderName}`);
    // console.warn(folder);
    if (folder) return folder;
    folder = await Folder.create(
      {
        name: folderName,
        type: entityType,
        color: folderColor,
        parent: (root) ? root.id : null,
      },
      { displaySheet: false }
    );
    return folder;
  },

  // eslint-disable-next-line no-unused-vars
  getFolder: async (kind, subFolder = "", baseFolderName = "Pathmuncher", baseColor = "#6f0006", subColor = "#98020a", typeFolder = true) => {
    let entityTypes = new Map();
    entityTypes.set("pets", "Pets");

    const folderName = game.i18n.localize(`${CONSTANTS.MODULE_NAME}.labels.${kind}`);
    const entityType = entityTypes.get(kind);
    const baseFolder = await utils.getOrCreateFolder(null, entityType, baseFolderName, baseColor);
    const entityFolder = typeFolder ? await utils.getOrCreateFolder(baseFolder, entityType, folderName, subColor) : baseFolder;
    if (subFolder !== "") {
      const subFolderName = subFolder.charAt(0).toUpperCase() + subFolder.slice(1);
      const typeFolder = await utils.getOrCreateFolder(entityFolder, entityType, subFolderName, subColor);
      return typeFolder;
    } else {
      return entityFolder;
    }
  },

};


export default utils;
