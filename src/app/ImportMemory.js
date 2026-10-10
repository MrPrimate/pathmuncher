import CONSTANTS from "../constants.js";
import logger from "../logger.js";

/**
 * What an actor's last import was, kept on the actor (flags.pathmuncher.lastImport): the Pathbuilder
 * build, the import notes, and the answers the user gave, so the next import of the build can give
 * them again rather than ask. The answers are keyed by what was asked, so each still applies when the
 * same question comes up and is ignored when it doesn't:
 *  - choices: a choice the build doesn't settle, by Pathmuncher's key for it, answered in the choices
 *    dialog or by the system when the item was created
 *  - deity: the answer to a deity that doesn't allow the build's choices
 *  - core: an item dropped in for a class, ancestry, heritage or background no compendium has
 *  - keep: the items added by hand that were kept
 * How ammunition is shared between guns is asked each time.
 */
export class ImportMemory {

  static FLAG = "lastImport";

  /** @param {Actor} actor  the actor imported into */
  constructor(actor) {
    this.actor = actor;
    this.last = foundry.utils.getProperty(actor, `flags.${CONSTANTS.FLAG_NAME}.${ImportMemory.FLAG}`) ?? null;
    // this import's answers, as they are given
    this.answers = { deity: null, core: {}, keep: null };
  }

  get lastAnswers() {
    return this.last?.answers ?? {};
  }

  /** Whether the last import left any answers to give again. */
  get hasAnswers() {
    const a = this.lastAnswers;
    return Object.keys(a.choices ?? {}).length > 0 || !!a.deity || Object.keys(a.core ?? {}).length > 0
      || (a.keep ?? []).length > 0;
  }

  /** The last import's notes (ImportReport#getImportReport), or null. */
  get lastReport() {
    return this.last?.report ?? null;
  }

  /** When the last import was made, or null. */
  get lastImportedAt() {
    return this.last?.importedAt ?? null;
  }

  static #deityKey(conflict) {
    return JSON.stringify({ deity: conflict.deity?.name, conflicts: conflict.conflicts.map((c) => `${c.kind}:${c.value}`).sort() });
  }

  /**
   * The import options with the importer's questions (resolveDeityConflict, resolveMissingCore)
   * answered from the last import where it has an answer, and every answer noted for the next. With reuse off the last answers are not used, but this import's are still noted.
   */
  options(options, { reuse = false } = {}) {
    const last = reuse ? this.lastAnswers : {};
    const wrapped = { ...options, choiceAnswers: reuse ? { ...(last.choices ?? {}) } : {} };

    if (options.resolveDeityConflict) {
      wrapped.resolveDeityConflict = async (conflict) => {
        const key = ImportMemory.#deityKey(conflict);
        const stored = last.deity?.key === key ? await ImportMemory.#deityResolution(last.deity) : null;
        const resolution = stored ?? await options.resolveDeityConflict(conflict);
        if (resolution) {
          this.answers.deity = { key, asBuilt: !resolution.deity && !resolution.specials, specials: resolution.specials, deity: resolution.deity?.uuid };
        }
        return resolution;
      };
    }

    if (options.resolveMissingCore) {
      wrapped.resolveMissingCore = async (missing) => {
        const replacements = {};
        const stored = await Promise.all(missing.map((m) => {
          const uuid = last.core?.[`${m.target}:${m.name}`];
          return uuid ? fromUuid(uuid) : null;
        }));
        missing.forEach((m, i) => {
          if (stored[i]) replacements[m.target] = stored[i];
        });
        const ask = missing.filter((m) => !replacements[m.target]);
        const asked = ask.length > 0 ? await options.resolveMissingCore(ask) : {};
        if (!asked) return null;
        Object.assign(replacements, asked);
        for (const m of missing) {
          if (replacements[m.target]?.uuid) this.answers.core[`${m.target}:${m.name}`] = replacements[m.target].uuid;
        }
        return replacements;
      };
    }
    return wrapped;
  }

  /** A stored deity answer as the deity conflict dialog gives it, or null if its deity is gone. */
  static async #deityResolution(stored) {
    if (stored.asBuilt) return {};
    if (stored.specials) return { specials: stored.specials };
    const deity = stored.deity ? await fromUuid(stored.deity) : null;
    return deity ? { deity } : null;
  }

  /**
   * The items added by hand to keep, if the last import kept every one of them (with reuse on), so
   * there is no need to ask again. null when the user should be asked.
   */
  keptBefore(handAdded, { reuse = false } = {}) {
    const kept = new Set(this.lastAnswers.keep ?? []);
    return reuse && handAdded.length > 0 && handAdded.every((i) => kept.has(i.id)) ? handAdded.map((i) => i.id) : null;
  }

  /** Notes the items added by hand that this import kept. */
  noteKept(ids) {
    this.answers.keep = [...(ids ?? [])];
  }

  /**
   * The answers to the choices the build doesn't settle (pathmuncher.openChoices), read back from the
   * imported items, so answers the system asked for are kept as well as those given in the dialog.
   */
  #choiceAnswers(pathmuncher) {
    const answers = {};
    for (const { key, documentId, flag } of pathmuncher.openChoices ?? []) {
      const value = this.actor.items.get(documentId)?.flags?.[game.system.id]?.rulesSelections?.[flag];
      if (value !== undefined && value !== null) answers[key] = foundry.utils.deepClone(value);
    }
    return answers;
  }

  /**
   * Keeps this import on the actor once it has succeeded, replacing the last: the build (source),
   * the import notes (report) and the answers.
   */
  async save(pathmuncher, { source, report }) {
    this.last = {
      pathbuilderId: pathmuncher.options.pathbuilderId ?? null,
      importedAt: new Date().toISOString(),
      moduleVersion: game.modules.get(CONSTANTS.MODULE_NAME)?.version ?? null,
      source,
      report,
      answers: { ...this.answers, choices: this.#choiceAnswers(pathmuncher) },
    };
    logger.debug("Saving the import to the actor", this.last);
    // replaced whole, so no answer from an earlier import lingers
    await this.actor.update({ [`flags.${CONSTANTS.FLAG_NAME}.-=${ImportMemory.FLAG}`]: null });
    await this.actor.update({ [`flags.${CONSTANTS.FLAG_NAME}.${ImportMemory.FLAG}`]: this.last });
  }

}
