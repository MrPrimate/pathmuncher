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

  /**
   * Run the registered tests whose names match the filter, sequentially. chunk ("2/4") runs one part
   * of them: every 4th matching test, starting with the 2nd.
   */
  pmt.run = async (filter = "", chunk = null) => {
    const [part, parts] = chunk ? chunk.split("/").map(Number) : [1, 1];
    const results = [];
    for (const t of pmt.tests.filter((x) => x.name.includes(filter)).filter((_, i) => i % parts === part - 1)) {
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
    if (!pmt.keep) {
      ctx.cleanup(async () => {
        // with the companions an import made for it
        for (const companion of game.actors.filter((a) => a.getFlag("pathmuncher", "master")?.uuid === actor.uuid)) await companion.delete();
        await game.actors.get(actor.id)?.delete();
      });
    }
    return actor;
  };

  /** Whether a Pathbuilder build uses the mythic rules: a calling, or feats in mythic slots. */
  pmt.isMythicBuild = (build) => (build.specials ?? []).some((s) => (/ Calling$/).test(s))
    || (build.feats ?? []).some((f) => ["Mythic Feat", "Destiny Mythic Feat"].includes(f[2]));

  /** Sets the system's variant rules a Pathbuilder build was made with; restored after the test. */
  pmt.useBuildVariants = async (ctx, build) => {
    const { freeArchetype: fa, gradualBoosts: gradual } = api().Pathmuncher.detectVariants(build);
    const system = game.system.id;
    const before = {
      freeArchetypeVariant: game.settings.get(system, "freeArchetypeVariant"),
      gradualBoostsVariant: game.settings.get(system, "gradualBoostsVariant"),
    };
    await game.settings.set(system, "freeArchetypeVariant", fa);
    await game.settings.set(system, "gradualBoostsVariant", gradual);
    // pf2e's mythic setting adds the mythic feat group, with the calling's slot
    if (game.settings.settings.has(`${system}.mythic`)) {
      before.mythic = game.settings.get(system, "mythic");
      await game.settings.set(system, "mythic", pmt.isMythicBuild(build) ? "enabled" : "disabled");
    }
    ctx.cleanup(async () => {
      for (const [key, value] of Object.entries(before)) await game.settings.set(system, key, value);
    });
    return { freeArchetype: fa, gradualBoosts: gradual };
  };

  /**
   * Answers pf2e ChoiceSet prompts during an import like a user following the build would: the
   * option whose label matches a name in the build, else the first. Returns the log of prompts.
   */
  pmt.answerPrompts = (ctx, build) => {
    // names the build chose, most specific first: a heritage's skill choice is in specials
    // ("Medicine"), feat extras are other feats' choices (Assurance's "Athletics"), and
    // proficiencies list every trained skill
    const tiers = [
      build.specials ?? [],
      [...(build.feats ?? []).map((f) => f[0]), build.heritage, build.ancestry, build.background, build.class, build.deity],
      [...(build.feats ?? []).map((f) => f[1]), ...(build.lores ?? []).map((l) => l[0])],
      Object.entries(build.proficiencies ?? {}).filter(([, v]) => v > 0).map(([k]) => k),
    ].map((names) => new Set(names.filter(Boolean).map(sluggify)));
    const prompts = [];
    const answer = (app) => {
      app.__pmtAnswered = true;
      const label = (c) => sluggify(game.i18n.localize(c.label));
      const match = tiers.map((names) => app.choices.find((c) => names.has(label(c)))).find(Boolean);
      const pick = match ?? app.choices[0] ?? null;
      prompts.push({ item: app.item?.name, prompt: game.i18n.localize(app.prompt ?? ""), picked: pick && game.i18n.localize(pick.label), matched: !!match });
      app.selection = pick;
      setTimeout(() => app.close(), 20);
    };
    const hook = Hooks.on("renderApplicationV2", (app) => {
      if (!Array.isArray(app.choices) || typeof app.resolveSelection !== "function" || app.__pmtAnswered) return;
      // a companion's prompts are pathmuncher's to answer (BFFBuilder), but for those it leaves to the
      // user (a construct's), which its hook has marked by the next tick
      if (app.item?.actor?.getFlag("pathmuncher", "master")) {
        setTimeout(() => {
          if (app.pathmuncherAsks && !app.__pmtAnswered) answer(app);
        }, 0);
        return;
      }
      answer(app);
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

  /** Opens the importer for the actor and waits until its form is on screen. */
  pmt.openImporter = async (actor) => {
    const id = `pathmuncher-importer-${actor.id}`;
    // let an earlier importer for this actor finish closing first
    for (let i = 0; i < 50 && document.getElementById(id); i++) await sleep(100);
    const app = new (api().PathmuncherImporter)({}, actor);
    await app.render({ force: true });
    for (let i = 0; i < 50 && !app.element?.querySelector("button[type='submit']"); i++) await sleep(100);
    return app;
  };

  /**
   * Opens the importer for the actor, fills it in like a user (export id, pasted JSON or a file),
   * sets any options given ({ addMoney: false, ... }) and presses Import. The post-import report is
   * closed when it appears; its text is returned as report.
   */
  pmt.submitImporter = async (actor, { json = null, id = null, file = null, options = {} } = {}) => {
    const app = await pmt.openImporter(actor);
    const el = app.element;
    if (json !== null) {
      el.querySelector("[data-action='setSource'][data-source='json']").click();
      el.querySelector("textarea[name='json']").value = typeof json === "string" ? json : JSON.stringify(json);
    } else if (file !== null) {
      el.querySelector("[data-action='setSource'][data-source='file']").click();
      const transfer = new DataTransfer();
      transfer.items.add(new File([typeof file === "string" ? file : JSON.stringify(file)], "build.json", { type: "application/json" }));
      el.querySelector("input[name='file']").files = transfer.files;
    } else {
      el.querySelector("input[name='pathbuilderId']").value = id;
    }
    for (const [key, value] of Object.entries(options)) {
      el.querySelector(`input[name='options.${key}']`).checked = value;
    }

    let report = null;
    const closeReport = Hooks.on("renderDialogV2", (dialog) => {
      // choices the build doesn't answer: picking none leaves them to the system's prompts, as before
      if (dialog.options.classes?.includes("pathmuncher-unanswered-choices-dialog")) {
        setTimeout(() => dialog.element.querySelector("button[data-action='import']")?.click(), 20);
        return;
      }
      // a companion with no character yet: a new one, as offered
      if (dialog.options.classes?.includes("pathmuncher-companion-dialog")) {
        setTimeout(() => dialog.element.querySelector("button[data-action='import']")?.click(), 20);
        return;
      }
      if (!dialog.options.classes?.includes("pathmuncher-report")) return;
      report = dialog.element.querySelector(".window-content").innerText;
      setTimeout(() => dialog.element.querySelector("button[data-action='ok']")?.click(), 20);
    });
    // the eidolon's choices (an application, not a dialog): kept as the import made them
    const keepEidolon = Hooks.on("renderEidolonBuilderApp", (builder) => {
      setTimeout(() => builder.element.querySelector("button[data-action='keep']")?.click(), 20);
    });
    el.querySelector("button[type='submit']").click();
    await sleep(300);
    const started = Date.now();
    while (Date.now() - started < 240000 && app.rendered && app.importing) await sleep(250);
    await sleep(500);
    Hooks.off("renderDialogV2", closeReport);
    Hooks.off("renderEidolonBuilderApp", keepEidolon);
    const state = {
      closed: !app.rendered,
      buttonDisabled: app.rendered ? app.element.querySelector("button[type='submit']").disabled : null,
      report,
    };
    if (app.rendered) await app.close();
    return state;
  };

  pmt.itemKeys = (actor) => actor.items.map((i) => `${i.type}:${i.name}`).sort();

  /** The system's own compendium item of a type, by name or slug. */
  pmt.findCompendiumItem = async (type, name) => {
    const slug = sluggify(name);
    for (const pack of game.packs.filter((p) => p.documentName === "Item" && p.metadata.packageName === game.system.id)) {
      const index = await pack.getIndex({ fields: ["system.slug"] });
      const entry = index.find((e) => e.type === type && ((e.system?.slug ?? sluggify(e.name)) === slug || e.name === name));
      if (entry) return pack.getDocument(entry._id);
    }
    return null;
  };

  /**
   * Which feat group and slot Pathbuilder put a feat in, from its slot label (feat[4]) and type, or
   * null for feats that come from somewhere else (child choices, awarded and heritage feats).
   * Labels: "Magus Feat 2", "Elf Feat 1", "Skill Feat 2", "General Feat 3", "Free Archetype 2",
   * "Mythic Feat 2" (a destiny's too, "Mythic Feat 12").
   */
  pmt.pathbuilderSlot = ([, , type, level, label, choice]) => {
    if (!label || choice === "childChoice" || ["Awarded Feat", "Heritage"].includes(type)) return null;
    if ((/^[0-9a-f]{8}-[0-9a-f]{4}-/).test(String(label))) return { groupId: "bonus", slotId: null }; // custom feat choice
    const n = Number(String(label).match(/(\d+)$/)?.[1] ?? level);
    if ((/^Free Archetype/).test(label)) return { groupId: "archetype", slotId: `archetype-${n}` };
    if ((/^Skill Feat/).test(label)) return { groupId: "skill", slotId: `skill-${n}` };
    if ((/^General Feat/).test(label)) return { groupId: "general", slotId: `general-${n}` };
    if ((/^Mythic Feat/).test(label)) return { groupId: "mythic", slotId: `mythic-${n}` };
    if (type === "Ancestry Feat") return { groupId: "ancestry", slotId: `ancestry-${n}` };
    return { groupId: "class", slotId: `class-${n}` };
  };

  /**
   * Builds the character the way a user does on the sheet: set the level, drop the ancestry,
   * heritage, background and class, then drop each feat into the slot Pathbuilder used
   * (actor.feats.insertFeat, as the sheet's drop handler does). Answer prompts with
   * pmt.answerPrompts first. Returns the names it could not find in the system's compendiums.
   */
  pmt.buildByHand = async (actor, build) => {
    const missing = [];
    await actor.update({ "system.details.level.value": build.level });
    // "Raised by Belief [PlaceHolder]": content Pathbuilder hasn't finished, under pf2e's name
    const background = build.background?.replace(/\s*\[Placeholder\]$/i, "");
    for (const [type, name] of [["ancestry", build.ancestry], ["heritage", build.heritage], ["background", background], ["class", build.class]]) {
      const doc = await pmt.findCompendiumItem(type, name);
      if (doc) await actor.createEmbeddedDocuments("Item", [doc.toObject()]);
      else missing.push(`${type}: ${name}`);
    }
    for (const feat of build.feats ?? []) {
      const slot = pmt.pathbuilderSlot(feat);
      if (!slot) continue;
      const doc = await pmt.findCompendiumItem("feat", feat[0]);
      if (!doc) {
        missing.push(`feat: ${feat[0]}`);
        continue;
      }
      await actor.feats.insertFeat(doc, slot);
    }
    return missing;
  };

  /**
   * The parts of a character a comparison with a hand-built twin looks at: core items, class
   * features with their levels, and each slotted feat with the level it was taken at.
   */
  pmt.characterShape = (actor) => ({
    core: ["ancestry", "heritage", "background", "class"].map((k) => actor[k]?.name ?? null),
    classFeatures: actor.itemTypes.feat
      .filter((f) => f.system.location === actor.class?.id)
      .map((f) => `${f.slug} @${f.system.level.value}`).sort(),
    slots: actor.itemTypes.feat
      .filter((f) => (/^(ancestry|class|skill|general|archetype|mythic)-\d+$/).test(f.system.location ?? ""))
      .map((f) => `${f.system.location}: ${f.slug} taken ${f.system.level.taken}`).sort(),
  });

  // ---------------------------------------------------------------- snapshots

  const optional = (fn) => {
    try {
      return fn() ?? null;
    } catch {
      return null;
    }
  };

  /**
   * Everything an import produced, for the snapshot tests: the character's details, each item as one
   * line (slot, levels, what granted it, its choices, quantity, container, runes...), the post-import
   * report and the prompts the user was asked. Item ids are replaced by item names and lists are
   * sorted, so importing the same build again gives the same snapshot.
   */
  pmt.characterSnapshot = (actor, pm, prompts = []) => {
    const names = new Map(actor.items.map((i) => [i.id, i.name]));
    // an id of an item not on the actor (a grant whose granter is missing) is random: say so instead;
    // anything else is a word, such as a ritual's location "rituals"
    const nameOf = (id) => (names.has(id) ? names.get(id) : (/^[a-zA-Z0-9]{16}$/).test(id ?? "") ? "(missing item)" : id);
    // ids of the actor's own items, wherever they appear in a value, as @Item Name
    const named = (value) => String(typeof value === "object" ? JSON.stringify(value) : value)
      .replace(/\b[a-zA-Z0-9]{16}\b/g, (id) => (names.has(id) ? `@${names.get(id)}` : id));

    const itemLine = (item) => {
      const s = item.system;
      const parts = [];
      if (item.type === "spell") {
        parts.push(`in ${nameOf(s.location?.value)}`, `rank ${s.location?.heightenedLevel ?? s.level?.value}`);
        if (s.location?.signature) parts.push("signature");
      } else if (typeof s.location === "string" && s.location) {
        parts.push(names.has(s.location) ? `in ${names.get(s.location)}` : `slot ${s.location}`);
      }
      if (item.type === "feat") parts.push(`level ${s.level?.value}`);
      if (s.level?.taken) parts.push(`taken ${s.level.taken}`);
      if (item.type === "lore") parts.push(`rank ${s.proficient?.value}`);
      const grantedBy = item.flags[game.system.id]?.grantedBy?.id;
      if (grantedBy) parts.push(`granted by ${nameOf(grantedBy)}`);
      const selections = item.flags[game.system.id]?.rulesSelections ?? {};
      for (const [flag, value] of Object.entries(selections).sort(([a], [b]) => a.localeCompare(b))) {
        parts.push(`${flag}=${named(value)}`);
      }
      const unresolved = (s.rules ?? [])
        .filter((r) => r.key === "ChoiceSet" && r.selection === undefined && !(r.flag && selections[r.flag] !== undefined))
        .map((r) => r.flag ?? "?");
      if (unresolved.length) parts.push(`unresolved ${unresolved.join(",")}`);
      if (item.isOfType("physical")) {
        parts.push(`qty ${s.quantity}`);
        if (s.containerId) parts.push(`in ${nameOf(s.containerId)}`);
        const equipped = s.equipped ?? {};
        parts.push(`${equipped.carryType ?? "?"}${equipped.handsHeld ? ` ${equipped.handsHeld}h` : ""}`);
        if (equipped.invested) parts.push("invested");
        if (s.size && s.size !== "med") parts.push(`size ${s.size}`);
        const runes = s.runes ?? {};
        const fundamental = ["potency", "striking", "resilient", "reinforcing"].filter((k) => runes[k]).map((k) => `${k} ${runes[k]}`);
        if (fundamental.length || runes.property?.length) parts.push(`runes ${[...fundamental, ...(runes.property ?? [])].join(", ")}`);
        if (s.material?.type) parts.push(`material ${s.material.type} ${s.material.grade}`);
        if (s.grade) parts.push(`grade ${s.grade}`);
        if (s.subitems?.length) parts.push(`subitems ${s.subitems.map((i) => i.name).sort().join(", ")}`);
      }
      return `${item.type}: ${item.name}${parts.length ? ` [${parts.join("; ")}]` : ""}`;
    };

    const spellcasting = actor.itemTypes.spellcastingEntry.map((entry) => {
      const s = entry.system;
      const slots = Object.entries(s.slots ?? {})
        .filter(([, slot]) => slot.max || Object.keys(slot.prepared ?? {}).length)
        .map(([key, slot]) => {
          const prepared = Object.values(slot.prepared ?? {}).map((p) => (p?.id ? nameOf(p.id) : "-"));
          return `${key.replace("slot", "rank ")}: ${slot.max}${prepared.length ? ` [${prepared.join(", ")}]` : ""}`;
        });
      return `${entry.name} [${[s.tradition?.value, s.prepared?.value, s.ability?.value, `proficiency ${s.proficiency?.value}`]
        .join("; ")}]${slots.length ? ` ${slots.join(" | ")}` : ""}`;
    });

    const report = pm?.getImportReport() ?? [];
    return {
      character: {
        name: actor.name,
        level: actor.level,
        ancestry: actor.ancestry?.name ?? null,
        heritage: actor.heritage?.name ?? null,
        background: actor.background?.name ?? null,
        class: actor.class?.name ?? null,
        deity: actor.deity?.name ?? null,
        keyAbility: actor.system.details.keyability?.value ?? null,
        attributes: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map((a) => [a, actor.system.abilities?.[a]?.mod ?? null])),
        hp: optional(() => actor.hitPoints.max),
        ac: optional(() => actor.armorClass.value),
        perception: optional(() => actor.perception.rank),
        senses: optional(() => Array.from(actor.perception.senses ?? [], (sense) => sense.type).sort()),
        saves: Object.fromEntries(["fortitude", "reflex", "will"].map((k) => [k, optional(() => actor.saves[k].rank)])),
        skills: Object.fromEntries(Object.entries(actor.skills ?? {}).filter(([, skill]) => !skill.lore)
          .map(([k, skill]) => [k, skill.rank]).sort(([a], [b]) => a.localeCompare(b))),
        languages: [...(actor.system.details.languages?.value ?? [])].sort(),
        size: actor.size,
        focus: actor.system.resources?.focus?.max ?? null,
      },
      items: actor.items.map(itemLine).sort(),
      spellcasting: spellcasting.sort(),
      report: Object.fromEntries(report.filter((g) => g.type !== "described").map((g) => [g.type, [...g.names].sort()])),
      described: (pm?.getDescribedSpecials() ?? []).map((o) => `${o.name}: ${o.specials.map((s) => s.name).sort().join(", ")}`).sort(),
      prompts: prompts.map((p) => `${p.item}: ${p.picked}${p.matched ? "" : " (guessed)"}`),
    };
  };

  /**
   * The differences between two snapshots, one line each: "items: - <line>" for a line that went,
   * "items: + <line>" for one that came, and "character.hp: 80 → 92" for a changed value.
   */
  pmt.snapshotDifferences = (expected, actual, path = "") => {
    const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
    const text = (v) => (typeof v === "string" ? v : show(v));
    if (Array.isArray(expected) && Array.isArray(actual)) {
      const left = new Map();
      for (const e of expected) left.set(text(e), (left.get(text(e)) ?? 0) + 1);
      const added = [];
      for (const a of actual) {
        if (left.get(text(a))) left.set(text(a), left.get(text(a)) - 1);
        else added.push(text(a));
      }
      const removed = [...left].flatMap(([line, count]) => Array(count).fill(line));
      return [...removed.map((line) => `${path}: - ${line}`), ...added.map((line) => `${path}: + ${line}`)];
    }
    if (isObject(expected) && isObject(actual)) {
      return [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
        .flatMap((key) => pmt.snapshotDifferences(expected[key], actual[key], path ? `${path}.${key}` : key));
    }
    return show(expected) === show(actual) ? [] : [`${path}: ${show(expected)} → ${show(actual)}`];
  };

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
      // the names pathmuncher looks a Pathbuilder name up under (Aasimar is Nephilim)
      for (const e of api().data.generateFeatMap(s)) if (e.pbName === s) out.add(sluggify(e.foundryName));
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
    const fa = api().Pathmuncher.detectVariants(build).freeArchetype;

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
      if (t.endsWith("mythic feat")) return "mythic";
      if (t.endsWith("feat") && t !== "awarded feat") return "class";
      return null;
    };
    for (const featTuple of build.feats ?? []) {
      const [name, extra, type, level, label] = featTuple;
      if (!name || name === "Not Selected") continue;
      // a UUID slot label is Pathbuilder's "Custom Feat Choice": an extra feat, so a bonus feat
      const isCustomChoice = (/^[0-9a-f]{8}-[0-9a-f]{4}-/).test(String(label ?? ""));
      const vs = variants(name, extra);
      const feat = [...vs].map((v) => feats.get(v)).find(Boolean);
      if (!feat) {
        const isCore = type === "Heritage" && [actor.heritage, actor.ancestry].some((i) => i && intersects(vs, variants(i.name)));
        if (!isCore) problems.push(`feat missing: ${name} [${type ?? "?"} ${level ?? "?"}]`);
        continue;
      }
      const group = [...vs].map((v) => groups.get(v)).find(Boolean);
      const expected = isCustomChoice ? "bonus" : (pmt.pathbuilderSlot(featTuple)?.groupId ?? expectedGroup(type));
      if (feat.flags.pf2e?.grantedBy || group?.endsWith(":child")) continue;
      if (group === "bonus" && expected !== "bonus") problems.push(`feat in bonus feats: ${name} [${type} ${level}] (expected ${expected})`);
      else if (expected && group !== expected) problems.push(`feat in ${group} group: ${name} [${type} ${level}] (expected ${expected})`);
    }

    // a mythic calling is only in the specials ("Acrobat's Calling"), and goes in the calling's slot
    for (const name of (build.specials ?? []).filter((s) => (/ Calling$/).test(s))) {
      const calling = [...variants(name)].map((v) => feats.get(v)).find(Boolean);
      if (!calling) problems.push(`calling missing: ${name}`);
      else if (calling.system.location !== "mythic-calling") problems.push(`calling ${name} in ${calling.system.location ?? null} (expected mythic-calling)`);
    }

    // what the system itself would record: class features at the level the class grants them,
    // slotted feats taken at their slot's level
    const classGrants = new Map(Object.values(actor.class?.system.items ?? {}).map((g) => [g.uuid, g.level]));
    for (const f of actor.itemTypes.feat) {
      const grantLevel = classGrants.get(f.sourceId);
      if (f.system.location === actor.class?.id && grantLevel !== undefined && f.system.level.value !== grantLevel) {
        problems.push(`class feature ${f.name}: level ${f.system.level.value} (class grants it at ${grantLevel})`);
      }
      const slotLevel = Number(String(f.system.location ?? "").match(/^(?:ancestry|class|skill|general|archetype|mythic)-(\d+)$/)?.[1]);
      if (slotLevel && f.system.level.taken !== slotLevel) {
        problems.push(`feat ${f.name} in ${f.system.location}: taken at ${f.system.level.taken ?? null}`);
      }
    }

    // the same feat more often than the build takes it (e.g. granted by the class and imported again).
    // A copy granted by an item with the same slug is the system's own wrapper pattern (the Fighter's
    // "Shield Block" class feature grants the "Shield Block" feat), as a hand-built character has.
    const bySlug = new Map();
    for (const f of actor.itemTypes.feat) {
      if (actor.items.get(f.flags.pf2e?.grantedBy?.id)?.slug === f.slug) continue;
      bySlug.set(f.slug, [...(bySlug.get(f.slug) ?? []), f]);
    }
    for (const [slug, copies] of bySlug) {
      if (copies.length < 2) continue;
      const inBuild = (build.feats ?? []).filter(([name, extra]) => variants(name, extra).has(slug)).length;
      if (copies.length > Math.max(1, inBuild)) problems.push(`duplicate feat: ${copies[0].name} (${copies.length} on the actor, ${inBuild} in the build)`);
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

    const { spellRename } = game.modules.get("pathmuncher").api.data;
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
        // remastered names, e.g. Veil is Illusory Disguise
        const spell = [...variants(name, spellRename(name))].map((v) => have.get(v)).find(Boolean);
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
