import CONSTANTS from "./constants.js";

const utils = {

  wait: async (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  },

  setting: (key) => {
    return game.settings.get(CONSTANTS.MODULE_NAME, key);
  },

  updateSetting: async (key, value) => {
    return game.settings.set(CONSTANTS.MODULE_NAME, key, value);
  },

  getFlags: (actor) => {
    const flags = actor.flags[CONSTANTS.FLAG_NAME]
      ? actor.flags[CONSTANTS.FLAG_NAME]
      : {
        pathbuilderId: undefined,
        addFeats: true,
        addEquipment: true,
        addSpells: true,
        addMoney: true,
        addTreasure: true,
        addLores: true,
        addWeapons: true,
        addArmor: true,
        addDeity: true,
        addName: true,
        addClass: true,
        askForChoices: false,
      };
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

};


export default utils;
