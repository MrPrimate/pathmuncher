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

  allowDualClasses: () => {
    if (game.system.id !== "pf2e") return false;
    return (foundry.utils.isNewerVersion("5.9.0", game.version) && game.settings.get("pf2e", "dualClassVariant"));
    // || (!foundry.utils.isNewerVersion("5.9.0", game.version) && when remaster supports dualclass then add here
  },

  allowAncestryParagon: () => {
    if (game.system.id !== "pf2e") return false;
    return (foundry.utils.isNewerVersion("5.9.0", game.version) && game.settings.get("pf2e", "ancestryParagonVariant"));
  },

  async deleteActor(actor) {
    if (actor.canUserModify(game.user, "delete")) {
      await Actor.deleteDocuments([actor._id]);
    }
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
