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
    foundry.utils.setProperty(updateData, `flags.${CONSTANTS.FLAG_NAME}`, flags);
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
      && (root ? root.id : null) === (f.folder?.id ?? null),
    );
    if (folder) return folder;

    if (!Folder.canUserCreate(game.user)) {
      const errorMsg = game.i18n.format(
        `${CONSTANTS.FLAG_NAME}.Notifications.CreateFolderError`,
        {
          userName: game.user.name,
          folderName: folderName,
        },
      );
      ui.notifications.error(errorMsg);
      throw new Error(errorMsg);
    }

    folder = await Folder.create(
      {
        name: folderName,
        type: entityType,
        color: folderColor,
        parent: (root) ? root.id : null,
      },
      { displaySheet: false },
    );
    return folder;
  },


  async removeTempActors() {
    const actorIds = game.actors
      .filter((a) =>
        foundry.utils.getProperty(a, "flags.pathmuncher.temp") === true
        && a.canUserModify(game.user, "delete"),
      )
      .map((a) => a._id);
    if (actorIds.length === 0) return;
    await Actor.deleteDocuments(actorIds);
  },

};


export default utils;
