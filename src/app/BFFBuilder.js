/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */

import CONSTANTS from "../constants.js";
import logger from "../logger.js";
import utils from "../utils.js";
import { Seasoning } from "./Seasoning.js";

/**
 * BFFBuilder (Best Friends Forever Builder): a build's animal companions, each a character of its own
 * built from the PF2e Companion Compendia module (pf2e-animal-companions). The companion's ancestry is
 * its animal (Wolf), which grants the module's Animal Companion class, and Mature, Nimble or Savage and
 * Specialized are feats on it.
 *
 * A companion is linked to its master: flags.pathmuncher.companions on the master holds each
 * companion's actor by its key, and flags.pathmuncher.master on the companion points back. The next
 * import updates the same actor. A companion with no link yet goes to the actor the user picks
 * (options.resolveCompanionActor): a new character, or a character no other player owns.
 */
export class BFFBuilder {

  static MODULE = "pf2e-animal-companions";

  // the classes a character made for a companion has, so it can be offered for another
  static COMPANION_CLASSES = ["animal-companion", "construct-companion", "eidolon"];

  /** Whether the companion module is active, without which companions are not imported. */
  static get active() {
    return !!game.modules.get(BFFBuilder.MODULE)?.active;
  }

  /**
   * @param {object} options
   * @param {Pathmuncher} options.pathmuncher        the master's import, its build and compendiums
   * @param {Actor} options.master                   the actor imported into
   * @param {Function} [options.resolveCompanionActor]  asked for a companion with no actor linked:
   *   ({ master, pet, name, candidates }) => { create: true } | { actor } | null to leave it out.
   *   Without it a new character is made.
   */
  constructor({ pathmuncher, master, resolveCompanionActor = null }) {
    this.pathmuncher = pathmuncher;
    this.master = master;
    this.resolveCompanionActor = resolveCompanionActor;
    // the pets made into companions, and what of them matched nothing
    this.imported = [];
    this.bad = [];
  }

  /** The build's animal companions, each with its key: its type and place among the build's pets of that type. */
  get companions() {
    const counts = {};
    return (this.pathmuncher.source.pets ?? [])
      .filter((pet) => pet.type === "Animal Companion")
      .map((pet) => {
        counts[pet.type] = (counts[pet.type] ?? -1) + 1;
        return { pet, key: `${Seasoning.slug(pet.type)}-${counts[pet.type]}` };
      });
  }

  /** The name Pathbuilder gives the companion ("Fang - Savage Wolf" is Fang), or the master's animal's. */
  static companionName(pet, master) {
    const [name] = String(pet.name ?? "").split(" - ");
    return pet.name?.includes(" - ") && name.trim() ? name.trim() : `${master.name}'s ${pet.animal}`;
  }

  /** The companion module's pack of a kind ("AC-Feats"), in its version for this world's system. */
  static pack(name) {
    return game.packs.find((p) => p.metadata.packageName === BFFBuilder.MODULE && p.metadata.name.replace(/^sf-/, "") === name);
  }

  static async #find(packName, name) {
    const pack = BFFBuilder.pack(packName);
    const index = pack ? await pack.getIndex() : [];
    const entry = index.find((i) => i.name === name) ?? index.find((i) => Seasoning.slug(i.name) === Seasoning.slug(name));
    return entry ? { pack, entry } : null;
  }

  static async #document(packName, name) {
    const found = await BFFBuilder.#find(packName, name);
    if (!found) return null;
    const data = (await found.pack.getDocument(found.entry._id)).toObject();
    data._id = foundry.utils.randomID();
    foundry.utils.setProperty(data, `flags.${CONSTANTS.FLAG_NAME}.imported`, true);
    return data;
  }

  /**
   * The characters a companion can go to besides a new one: those the user can change, that no other
   * player owns, that aren't already a companion, and that are blank or made for a companion.
   */
  static candidates(master, taken = []) {
    const others = game.users.filter((u) => !u.isGM && !master.testUserPermission(u, "OWNER"));
    return game.actors.filter((a) => a.type === "character" && a.id !== master.id && a.isOwner
      && !taken.includes(a.id)
      && !others.some((u) => a.testUserPermission(u, "OWNER"))
      && !a.getFlag(CONSTANTS.FLAG_NAME, "master")
      && (!a.class || BFFBuilder.COMPANION_CLASSES.includes(a.class.slug)));
  }

  /** The actor linked to the companion with this key, from the master's link or the companion's. */
  #linkedActor(key) {
    const uuid = this.master.getFlag(CONSTANTS.FLAG_NAME, `companions.${key}`);
    const linked = uuid ? game.actors.find((a) => a.uuid === uuid) : null;
    if (linked?.type === "character") return linked;
    return game.actors.find((a) => a.type === "character"
      && a.getFlag(CONSTANTS.FLAG_NAME, "master")?.uuid === this.master.uuid
      && a.getFlag(CONSTANTS.FLAG_NAME, "master")?.key === key) ?? null;
  }

  async #newActor(name) {
    const folderName = game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Folders.Companions`);
    const folder = await utils.getOrCreateFolder(this.master.folder, "Actor", folderName);
    return Actor.create({
      name,
      type: "character",
      folder: folder.id,
      // whoever plays the master plays the companion
      ownership: foundry.utils.deepClone(this.master._source.ownership),
      prototypeToken: { name, actorLink: true, disposition: this.master.prototypeToken.disposition },
    });
  }

  /** The actor for a companion: the one linked, or the one the user picks. null to leave it out. */
  async #actorFor({ pet, key }, taken) {
    const linked = this.#linkedActor(key);
    if (linked) return linked;
    const name = BFFBuilder.companionName(pet, this.master);
    const candidates = BFFBuilder.candidates(this.master, taken);
    const answer = candidates.length > 0 && this.resolveCompanionActor
      ? await this.resolveCompanionActor({ master: this.master, pet, name, candidates })
      : { create: true };
    if (!answer) return null;
    return answer.actor ?? this.#newActor(name);
  }

  /** The barding Pathbuilder gives ("Barding, Heavy"), as pf2e names it for the companion's size. */
  static bardingName(armor, size) {
    const [, weight] = String(armor ?? "").match(/^Barding, (Light|Heavy)$/) ?? [];
    if (!weight) return armor;
    if (weight === "Light") return "Light Barding";
    return ["lg", "huge", "grg"].includes(size) ? "Heavy Barding (Large)" : "Heavy Barding (Small or Medium)";
  }

  /** An item from the pf2e compendiums for the companion, flagged as imported, or null. */
  async #equipmentItem(name) {
    const matcher = this.pathmuncher.compendiumMatchers.equipment;
    const match = matcher.getMatch(Seasoning.getFoundryEquipmentName(name), name);
    if (!match) return null;
    const data = (await match.pack.getDocument(match.i._id)).toObject();
    data._id = foundry.utils.randomID();
    foundry.utils.setProperty(data, `flags.${CONSTANTS.FLAG_NAME}.imported`, true);
    return data;
  }

  #unmatched(pet, name, details = {}) {
    this.bad.push({ pbName: `${name} (${pet.name ?? pet.animal})`, type: "companion", details: { pet, ...details } });
  }

  /** The feats the companion has taken: Mature, Nimble or Savage, and Specialized with its specializations. */
  async #feats(pet) {
    const names = [];
    if (pet.mature) names.push("Mature Animal Companion");
    if (pet.incredible && pet.incredibleType) names.push(`${pet.incredibleType} Animal Companion`);
    const feats = [];
    for (const name of names) {
      const feat = await BFFBuilder.#document("AC-Feats", name);
      if (feat) feats.push(feat);
      else this.#unmatched(pet, name);
    }

    // Specialized grants the first specialization as its choice; any more are taken as they are
    const [first, ...more] = pet.specializations ?? [];
    if (first) {
      const specialized = await BFFBuilder.#document("AC-Feats", "Specialized Animal Companion");
      const benefit = await BFFBuilder.#find("AC-Feats", first);
      const choice = specialized?.system.rules.find((r) => r.key === "ChoiceSet");
      if (specialized && benefit && choice) {
        choice.selection = benefit.entry.uuid;
        if (choice.flag) foundry.utils.setProperty(specialized, `flags.${game.system.id}.rulesSelections.${choice.flag}`, benefit.entry.uuid);
        feats.push(specialized);
      } else {
        this.#unmatched(pet, first);
      }
    }
    for (const name of more) {
      const feat = await BFFBuilder.#document("AC-Feats", name);
      if (feat) feats.push(feat);
      else this.#unmatched(pet, name);
    }
    return feats;
  }

  /** The barding and other gear Pathbuilder gives the companion, the barding worn. */
  async #gear(pet, actor) {
    const gear = [];
    if (pet.armor && pet.armor !== "Unarmored") {
      const name = BFFBuilder.bardingName(pet.armor, actor.size);
      const barding = await this.#equipmentItem(name);
      if (barding) {
        foundry.utils.setProperty(barding, "system.equipped", { carryType: "worn", inSlot: true });
        gear.push(barding);
      } else {
        this.#unmatched(pet, name);
      }
    }
    for (const entry of pet.equipment ?? []) {
      const [name, quantity] = Array.isArray(entry) ? entry : [entry?.name ?? entry, entry?.qty];
      if (!name) continue;
      const item = await this.#equipmentItem(name);
      if (!item) {
        this.#unmatched(pet, name);
        continue;
      }
      if (Number(quantity) > 1) item.system.quantity = Number(quantity);
      gear.push(item);
    }
    return gear;
  }

  /**
   * Builds a companion on its actor. What an earlier import made, and an ancestry or class the actor
   * had, are replaced; anything else on it (added by hand, effects) is kept.
   */
  async #build(actor, { pet, key }, ancestry) {
    const replaced = actor.items.filter((i) => i.getFlag(CONSTANTS.FLAG_NAME, "imported") || ["ancestry", "class"].includes(i.type));
    if (replaced.length > 0) await actor.deleteEmbeddedDocuments("Item", replaced.map((i) => i.id));
    await actor.update({
      "system.details.level.value": this.master.system.details.level.value,
      [`flags.${CONSTANTS.FLAG_NAME}.master`]: { uuid: this.master.uuid, key },
    });
    // the ancestry first: it grants the class the feats build on
    await actor.createEmbeddedDocuments("Item", [ancestry]);
    const feats = await this.#feats(pet);
    if (feats.length > 0) await actor.createEmbeddedDocuments("Item", feats);
    // the size the feats grew it to picks the barding
    const gear = await this.#gear(pet, actor);
    if (gear.length > 0) await actor.createEmbeddedDocuments("Item", gear);
  }

  /** Makes or updates each of the build's animal companions, and links it to the master. */
  async build() {
    const taken = [];
    for (const companion of this.companions) {
      try {
        // the animal as the module has it, before any actor is made for it
        const ancestry = await BFFBuilder.#document("AC-Ancestries-and-Class", companion.pet.animal);
        if (ancestry?.type !== "ancestry") {
          this.#unmatched(companion.pet, companion.pet.animal);
          continue;
        }
        const actor = await this.#actorFor(companion, taken);
        if (!actor) continue;
        taken.push(actor.id);
        await this.#build(actor, companion, ancestry);
        await this.master.setFlag(CONSTANTS.FLAG_NAME, `companions.${companion.key}`, actor.uuid);
        this.imported.push({ pet: companion.pet, actor });
      } catch (error) {
        logger.error(`Unable to build companion ${companion.pet.name}`, { error, companion });
        this.#unmatched(companion.pet, companion.pet.animal, { error: error.message });
      }
    }
    logger.debug("Companions", { imported: this.imported, bad: this.bad });
  }

}
