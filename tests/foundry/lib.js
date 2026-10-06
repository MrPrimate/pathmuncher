// In-page test library for the Foundry integration tests. tests/foundry/run.mjs evaluates this in a
// joined Foundry tab, then each *.test.js file, then runs what they registered. Plain script: no
// imports, everything hangs off globalThis.pmt.
(() => {
  const api = () => game.modules.get("pathmuncher").api;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sluggify = (s) => game.pf2e.system.sluggify(String(s ?? ""));

  const pmt = {
    tests: [],
    fixtures: globalThis.__pmtFixtures ?? {},
    keep: !!globalThis.__pmtKeep,
    sleep,
  };
  globalThis.pmt = pmt;

  /** Register a test: fn receives the assertion helpers. */
  pmt.test = (name, fn, { timeout = 300000 } = {}) => pmt.tests.push({ name, fn, timeout });

  class AssertionError extends Error {}
  const show = (v) => {
    try {
      return JSON.stringify(v); 
    } catch {
      return String(v); 
    }
  };
  pmt.assert = {
    ok: (value, message = "expected a truthy value") => {
      if (!value) throw new AssertionError(message);
    },
    equal: (actual, expected, message = "") => {
      if (actual !== expected) throw new AssertionError(`${message} expected ${show(expected)}, got ${show(actual)}`.trim());
    },
    deepEqual: (actual, expected, message = "") => {
      if (show(actual) !== show(expected)) throw new AssertionError(`${message}\n  expected ${show(expected)}\n  got      ${show(actual)}`.trim());
    },
    /** Every item of expected appears in actual (and reports which do not). */
    includesAll: (actual, expected, message = "") => {
      const missing = expected.filter((e) => !actual.includes(e));
      if (missing.length) throw new AssertionError(`${message} missing ${show(missing)}`.trim());
    },
  };

  /** Run the registered tests whose names match the filter, sequentially. */
  pmt.run = async (filter = "") => {
    const results = [];
    for (const t of pmt.tests.filter((x) => x.name.includes(filter))) {
      const started = performance.now();
      const cleanups = [];
      const ctx = { ...pmt.assert, cleanup: (fn) => cleanups.push(fn), log: [] };
      let error = null;
      try {
        await Promise.race([
          t.fn(ctx),
          sleep(t.timeout).then(() => {
            throw new Error(`timed out after ${t.timeout} ms`); 
          }),
        ]);
      } catch (e) {
        error = e instanceof AssertionError ? e.message : `${e}\n${(e.stack ?? "").split("\n").slice(1, 5).join("\n")}`;
      }
      for (const fn of cleanups.reverse()) {
        try {
          await fn(); 
        } catch (e) {
          ctx.log.push(`cleanup failed: ${e}`); 
        }
      }
      results.push({ name: t.name, ok: !error, error, ms: Math.round(performance.now() - started), log: ctx.log });
    }
    return results;
  };

  // ---------------------------------------------------------------- world helpers

  /** Creates a character for a test; deleted afterwards unless PMT_KEEP is set. */
  pmt.actor = async (ctx, label, data = {}) => {
    const name = `PMTEST ${label}`;
    for (const a of game.actors.filter((x) => x.getFlag("world", "pmtest") === name)) await a.delete();
    const actor = await Actor.create(foundry.utils.mergeObject({ name, type: "character", flags: { world: { pmtest: name } } }, data));
    if (!pmt.keep) ctx.cleanup(() => game.actors.get(actor.id)?.delete());
    return actor;
  };

  /** Sets the pf2e variant rules a Pathbuilder build was made with; restored after the test. */
  pmt.useBuildVariants = async (ctx, build) => {
    const fa = (build.feats ?? []).some((f) => String(f[4] ?? "").includes("Free Archetype"));
    const levels = Object.keys(build.abilities?.breakdown?.mapLevelledBoosts ?? {});
    const gradual = levels.some((l) => !["1", "5", "10", "15", "20"].includes(l));
    const before = {
      freeArchetypeVariant: game.settings.get("pf2e", "freeArchetypeVariant"),
      gradualBoostsVariant: game.settings.get("pf2e", "gradualBoostsVariant"),
    };
    await game.settings.set("pf2e", "freeArchetypeVariant", fa);
    await game.settings.set("pf2e", "gradualBoostsVariant", gradual);
    ctx.cleanup(async () => {
      for (const [key, value] of Object.entries(before)) await game.settings.set("pf2e", key, value);
    });
    return { freeArchetype: fa, gradualBoosts: gradual };
  };

  /**
   * Answers pf2e ChoiceSet prompts during an import like a user following the build would: the
   * option whose label matches a name in the build, else the first. Returns the log of prompts.
   */
  pmt.answerPrompts = (ctx, build) => {
    const names = new Set([
      ...(build.feats ?? []).flatMap((f) => [f[0], f[1]]),
      ...(build.specials ?? []),
      ...(build.lores ?? []).map((l) => l[0]),
      build.heritage, build.ancestry, build.background, build.class, build.deity,
      ...Object.entries(build.proficiencies ?? {}).filter(([, v]) => v > 0).map(([k]) => k),
    ].filter(Boolean).map(sluggify));
    const prompts = [];
    const hook = Hooks.on("renderApplicationV2", (app) => {
      if (!Array.isArray(app.choices) || typeof app.resolveSelection !== "function" || app.__pmtAnswered) return;
      app.__pmtAnswered = true;
      const match = app.choices.find((c) => names.has(sluggify(game.i18n.localize(c.label))));
      const pick = match ?? app.choices[0] ?? null;
      prompts.push({ item: app.item?.name, prompt: game.i18n.localize(app.prompt ?? ""), picked: pick && game.i18n.localize(pick.label), matched: !!match });
      app.selection = pick;
      setTimeout(() => app.close(), 20);
    });
    ctx.cleanup(() => Hooks.off("renderApplicationV2", hook));
    return prompts;
  };

  /** Records notifications raised while a test runs. */
  pmt.captureNotifications = (ctx) => {
    const notes = [];
    const orig = ui.notifications.notify.bind(ui.notifications);
    ui.notifications.notify = (message, type, options) => {
      notes.push({ type, message: String(message) });
      return orig(message, type, options);
    };
    ctx.cleanup(() => {
      ui.notifications.notify = orig; 
    });
    return notes;
  };

  /**
   * Imports a Pathbuilder export onto the actor the way the importer does, without the dialog.
   * updateOptions go to updateActor (keepItemIds); by default hand-added items are kept.
   */
  pmt.importBuild = async (actor, exportJson, options = {}, updateOptions = {}) => {
    const pm = new (api().Pathmuncher)(actor, options);
    pm.source = foundry.utils.deepClone(api().Pathmuncher.getBuildFromJson(exportJson));
    await pm.processCharacter();
    await pm.updateActor(updateOptions);
    return pm;
  };

  /**
   * Answers the importer's "keep items added by hand?" dialog. decide receives the item ids offered
   * and returns the ids to keep, or null to cancel the import. Returns the ids offered each time.
   */
  pmt.answerKeepDialog = (ctx, decide = (ids) => ids) => {
    const offered = [];
    const hook = Hooks.on("renderDialogV2", (app) => {
      if (!app.options.classes?.includes("pathmuncher-keep-dialog") || app.__pmtAnswered) return;
      app.__pmtAnswered = true;
      const boxes = [...app.element.querySelectorAll('input[name="keep"]')];
      const ids = boxes.map((b) => b.value);
      offered.push(ids);
      const keep = decide(ids);
      setTimeout(() => {
        if (keep === null) {
          app.element.querySelector('button[data-action="cancel"]').click();
        } else {
          for (const box of boxes) box.checked = keep.includes(box.value);
          app.element.querySelector('button[data-action="import"]').click();
        }
      }, 20);
    });
    ctx.cleanup(() => Hooks.off("renderDialogV2", hook));
    return offered;
  };

  /** Adds an effect, a condition, a homebrew item and a compendium feat, as a user might in play. */
  pmt.addHandItems = async (actor) => {
    const effects = game.packs.get("pf2e.equipment-effects");
    const effect = await effects.getDocument((await effects.getIndex()).contents[0]._id);
    const feats = game.packs.get("pf2e.feats-srd");
    const featEntry = (await feats.getIndex({ fields: ["system.slug"] })).find((f) => f.system.slug === "incredible-initiative");
    const feat = await feats.getDocument(featEntry._id);
    // pf2e does not return created items in the order given, so find them afterwards
    const before = new Set(actor.items.map((i) => i.id));
    await actor.createEmbeddedDocuments("Item", [
      effect.toObject(),
      { name: "Homebrew Trinket", type: "equipment" },
      feat.toObject(),
    ]);
    await actor.toggleCondition("frightened");
    const added = actor.items.filter((i) => !before.has(i.id));
    const find = (fn) => added.find(fn)?.id;
    return {
      effect: find((i) => i.type === "effect"),
      trinket: find((i) => i.name === "Homebrew Trinket"),
      feat: find((i) => i.type === "feat" && i.slug === "incredible-initiative"),
      condition: find((i) => i.type === "condition"),
    };
  };

  /** Opens the importer dialog for the actor, fills it in like a user and presses Import. */
  pmt.submitImporter = async (actor, { json = null, id = null } = {}) => {
    // the dialog has a fixed element id, so let any earlier one finish closing first
    for (let i = 0; i < 50 && document.getElementById("pathmuncher"); i++) await sleep(100);
    const app = new (api().PathmuncherImporter)({}, actor);
    await app.render(true);
    for (let i = 0; i < 50 && !app.element?.[0]?.querySelector("#pathmuncher-button"); i++) await sleep(100);
    const el = app.element[0];
    if (json !== null) {
      el.querySelector('.item[data-tab="json"]').click();
      el.querySelector('[name="textBoxBuildJSON"]').value = typeof json === "string" ? json : JSON.stringify(json);
    } else {
      el.querySelector('[name="textBoxBuildID"]').value = id;
    }
    const closeReport = Hooks.on("renderDialog", (dialog) => setTimeout(() => dialog.close(), 20));
    el.querySelector("#pathmuncher-button").click();
    await sleep(300);
    const started = Date.now();
    while (Date.now() - started < 240000) {
      const button = document.getElementById("pathmuncher-button");
      if (!app.rendered || (button && !button.disabled)) break;
      await sleep(250);
    }
    await sleep(300);
    Hooks.off("renderDialog", closeReport);
    const state = {
      closed: !app.rendered,
      buttonDisabled: document.getElementById("pathmuncher-button")?.disabled ?? null,
    };
    if (app.rendered) await app.close();
    return state;
  };

  pmt.itemKeys = (actor) => actor.items.map((i) => `${i.type}:${i.name}`).sort();

  // ---------------------------------------------------------------- comparing with the build

  const variants = (...names) => {
    const out = new Set();
    for (const n of names) {
      if (!n) continue;
      const s = String(n);
      out.add(sluggify(s));
      out.add(sluggify(s.replace(/\s+-\s+(Melee|Ranged)$/, ""))); // combination weapons
      out.add(sluggify(s.replace(/\s*\(.*?\)\s*/g, " ").trim()));
      if (s.includes(":")) out.add(sluggify(s.split(":").slice(1).join(":")));
      const m = s.match(/(.*)\((.*)\)/);
      if (m) out.add(sluggify(`${m[2]} ${m[1]}`));
    }
    out.delete("");
    return out;
  };
  const intersects = (a, b) => [...a].some((x) => b.has(x));
  const mod = (score) => Math.floor((Number(score) - 10) / 2);
  const SKILLS = ["acrobatics", "arcana", "athletics", "crafting", "deception", "diplomacy", "intimidation", "medicine",
    "nature", "occultism", "performance", "religion", "society", "stealth", "survival", "thievery"];
  const featGroupOf = (actor) => {
    const out = new Map();
    for (const group of [...actor.feats, actor.feats.bonus]) {
      for (const slot of group.feats) {
        if (!slot.feat) continue;
        for (const v of variants(slot.feat.name, slot.feat.slug)) if (!out.has(v)) out.set(v, group.id);
        for (const child of slot.children ?? []) {
          for (const v of variants(child.feat?.name ?? child.name)) if (!out.has(v)) out.set(v, `${group.id}:child`);
        }
      }
    }
    return out;
  };

  /**
   * Compares an imported actor with the Pathbuilder build and returns the differences as stable
   * strings. Pathbuilder "specials" are not compared: most are labels with no Foundry item. Run with
   * the build's variant rules set.
   */
  pmt.compareWithBuild = (actor, build) => {
    const problems = [];
    const fa = (build.feats ?? []).some((f) => String(f[4] ?? "").includes("Free Archetype"));

    const core = { ancestry: build.ancestry, heritage: build.heritage, background: build.background, class: build.class };
    if (build.deity && build.deity !== "Not set") core.deity = build.deity;
    for (const [key, expected] of Object.entries(core)) {
      const got = actor[key]?.name;
      if (!got || !intersects(variants(expected), variants(got))) problems.push(`core ${key}: expected ${expected}, got ${got ?? null}`);
    }
    if (actor.level !== build.level) problems.push(`level ${actor.level} (expected ${build.level})`);
    for (const a of ["str", "dex", "con", "int", "wis", "cha"]) {
      const got = actor.system.abilities[a].mod;
      if (got !== mod(build.abilities[a])) problems.push(`attribute ${a} ${got} (expected ${mod(build.abilities[a])})`);
    }
    if (actor.system.details.keyability.value !== build.keyability) {
      problems.push(`key attribute ${actor.system.details.keyability.value} (expected ${build.keyability})`);
    }
    const prof = build.proficiencies ?? {};
    for (const s of SKILLS) {
      const expected = Math.floor((prof[s] ?? 0) / 2);
      if (actor.skills[s]?.rank !== expected) problems.push(`skill ${s} ${actor.skills[s]?.rank} (expected ${expected})`);
    }
    for (const s of ["fortitude", "reflex", "will"]) {
      const expected = Math.floor((prof[s] ?? 0) / 2);
      if (actor.saves[s]?.rank !== expected) problems.push(`save ${s} ${actor.saves[s]?.rank} (expected ${expected})`);
    }
    if (actor.perception.rank !== Math.floor((prof.perception ?? 0) / 2)) {
      problems.push(`perception ${actor.perception.rank} (expected ${Math.floor((prof.perception ?? 0) / 2)})`);
    }

    const lores = new Map();
    for (const l of actor.itemTypes.lore) {
      for (const v of variants(l.name, l.name.replace(/\s*Lore$/, ""))) lores.set(v, l.system.proficient?.value);
    }
    for (const [name, rank] of build.lores ?? []) {
      const got = lores.get(sluggify(name));
      if (got !== Math.floor(rank / 2)) problems.push(`lore ${name}: ${got ?? null} (expected ${Math.floor(rank / 2)})`);
    }
    const languages = new Set((actor.system.details.languages.value ?? []).map(sluggify));
    for (const l of build.languages ?? []) {
      if (l && l !== "None selected" && !languages.has(sluggify(l))) problems.push(`language missing: ${l}`);
    }

    const feats = new Map();
    for (const f of actor.itemTypes.feat) for (const v of variants(f.name, f.slug)) if (!feats.has(v)) feats.set(v, f);
    const groups = featGroupOf(actor);
    const expectedGroup = (type) => {
      const t = String(type ?? "").toLowerCase();
      if (t.startsWith("ancestry")) return "ancestry";
      if (t.startsWith("skill")) return "skill";
      if (t.startsWith("general")) return "general";
      if (t.startsWith("archetype")) return fa ? "archetype" : "class";
      if (t.endsWith("feat") && t !== "awarded feat") return "class";
      return null;
    };
    for (const [name, extra, type, level] of build.feats ?? []) {
      if (!name || name === "Not Selected") continue;
      const vs = variants(name, extra);
      const feat = [...vs].map((v) => feats.get(v)).find(Boolean);
      if (!feat) {
        const isCore = type === "Heritage" && [actor.heritage, actor.ancestry].some((i) => i && intersects(vs, variants(i.name)));
        if (!isCore) problems.push(`feat missing: ${name} [${type ?? "?"} ${level ?? "?"}]`);
        continue;
      }
      const group = [...vs].map((v) => groups.get(v)).find(Boolean);
      const expected = expectedGroup(type);
      if (feat.flags.pf2e?.grantedBy || group?.endsWith(":child")) continue;
      if (group === "bonus") problems.push(`feat in bonus feats: ${name} [${type} ${level}] (expected ${expected})`);
      else if (expected && group !== expected) problems.push(`feat in ${group} group: ${name} [${type} ${level}] (expected ${expected})`);
    }

    const physical = actor.inventory.contents;
    const findPhysical = (types, ...names) => {
      const vs = variants(...names);
      return physical.filter((i) => types.includes(i.type) && intersects(vs, variants(i.name, i.slug)));
    };
    for (const w of build.weapons ?? []) {
      if (String(w.name).startsWith("Special Unarmed")) continue; // strikes granted by features
      const item = findPhysical(["weapon"], w.name, w.display)[0];
      if (!item) {
        problems.push(`weapon missing: ${w.name}`);
        continue;
      }
      const runes = item.system.runes ?? {};
      const striking = { striking: 1, greaterStriking: 2, majorStriking: 3 }[w.str] ?? 0;
      if ((runes.potency ?? 0) !== (w.pot ?? 0)) problems.push(`weapon ${w.name}: potency ${runes.potency ?? 0} (expected ${w.pot ?? 0})`);
      if ((runes.striking ?? 0) !== striking) problems.push(`weapon ${w.name}: striking ${runes.striking ?? 0} (expected ${striking})`);
      if ((runes.property ?? []).length !== (w.runes ?? []).length) problems.push(`weapon ${w.name}: property runes ${show(runes.property)} (expected ${show(w.runes)})`);
      if (w.mat && !item.system.material?.type) problems.push(`weapon ${w.name}: material missing (${w.mat})`);
    }
    for (const a of build.armor ?? []) {
      const item = findPhysical(["armor", "shield"], a.name, a.display)[0];
      if (!item) {
        problems.push(`armor missing: ${a.name}`);
        continue;
      }
      if (item.type === "armor") {
        const runes = item.system.runes ?? {};
        const resilient = { resilient: 1, greaterResilient: 2, majorResilient: 3 }[a.res] ?? 0;
        if ((runes.potency ?? 0) !== (a.pot ?? 0)) problems.push(`armor ${a.name}: potency ${runes.potency ?? 0} (expected ${a.pot ?? 0})`);
        if ((runes.resilient ?? 0) !== resilient) problems.push(`armor ${a.name}: resilient ${runes.resilient ?? 0} (expected ${resilient})`);
        if (a.worn && !item.system.equipped.inSlot) problems.push(`armor ${a.name}: not equipped`);
      } else if (a.worn && !item.system.equipped.handsHeld) {
        problems.push(`shield ${a.name}: not held`);
      }
    }
    const containers = build.equipmentContainers ?? {};
    for (const [name, qty, ...rest] of build.equipment ?? []) {
      const containerName = rest.map((r) => containers[r]?.containerName).find(Boolean);
      const items = findPhysical(["equipment", "consumable", "treasure", "backpack", "weapon", "armor", "shield", "book", "kit"], name);
      if (!items.length) {
        problems.push(`equipment missing: ${name}`);
        continue;
      }
      const item = items.find((i) => i.system.quantity === qty) ?? items[0];
      if (item.system.quantity !== qty) problems.push(`equipment ${name}: quantity ${item.system.quantity} (expected ${qty})`);
      if (containerName && !(item.container && intersects(variants(item.container.name), variants(containerName)))) {
        problems.push(`equipment ${name}: in ${item.container?.name ?? "no container"} (expected ${containerName})`);
      }
    }
    const coins = actor.inventory.coins;
    for (const c of ["pp", "gp", "sp", "cp"]) {
      if ((coins[c] ?? 0) !== (build.money?.[c] ?? 0)) problems.push(`money ${c} ${coins[c] ?? 0} (expected ${build.money?.[c] ?? 0})`);
    }

    const entries = actor.spellcasting.regular;
    for (const caster of build.spellCasters ?? []) {
      if (caster.magicTradition === "focus") continue;
      const spells = (caster.spells ?? []).flatMap((s) => s.list.map((n) => [s.spellLevel, n]));
      const candidates = entries.filter((e) => e.tradition === caster.magicTradition
        && (e.system.prepared.value === caster.spellcastingType || (caster.innate && e.system.prepared.value === "innate")));
      const entry = candidates.find((e) => intersects(variants(e.name), variants(caster.name))) ?? candidates[0];
      if (!entry) {
        if (spells.length || (caster.perDay ?? []).some((n) => n)) problems.push(`spellcasting entry missing: ${caster.name}`);
        continue;
      }
      (caster.perDay ?? []).forEach((n, rank) => {
        const got = entry.system.slots[`slot${rank}`]?.max ?? 0;
        if (n && got !== n) problems.push(`spellcasting ${caster.name}: slot${rank} ${got} (expected ${n})`);
      });
      const have = new Map();
      for (const s of entry.spells) for (const v of variants(s.name)) if (!have.has(v)) have.set(v, s);
      for (const [rank, name] of spells) {
        const spell = [...variants(name)].map((v) => have.get(v)).find(Boolean);
        if (!spell) problems.push(`spell missing: ${name} (${caster.name} rank ${rank})`);
        else if (rank && (spell.system.location.heightenedLevel ?? spell.rank) !== rank) {
          problems.push(`spell ${name}: rank ${spell.system.location.heightenedLevel ?? spell.rank} (expected ${rank})`);
        }
      }
    }
    const allSpells = new Set(actor.itemTypes.spell.flatMap((s) => [...variants(s.name)]));
    for (const [tradition, byAttribute] of Object.entries(build.focus ?? {})) {
      for (const data of Object.values(byAttribute ?? {})) {
        for (const name of [...(data.focusCantrips ?? []), ...(data.focusSpells ?? [])]) {
          if (!intersects(variants(name), allSpells)) problems.push(`focus spell missing: ${name} (${tradition})`);
        }
      }
    }
    if (Number.isInteger(build.focusPoints) && actor.system.resources.focus?.max !== build.focusPoints) {
      problems.push(`focus pool ${actor.system.resources.focus?.max} (expected ${build.focusPoints})`);
    }
    for (const ritual of build.rituals ?? []) {
      if (!intersects(variants(ritual), allSpells)) problems.push(`ritual missing: ${ritual}`);
    }
    const formulas = (build.formula ?? []).reduce((n, f) => n + (f.known ?? []).length, 0);
    const gotFormulas = (actor.system.crafting?.formulas ?? []).length;
    if (gotFormulas !== formulas) problems.push(`formulas ${gotFormulas} (expected ${formulas})`);
    return problems;
  };
})();
