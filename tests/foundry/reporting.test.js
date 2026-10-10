// What the user is told: the post-import report, dual class warnings, and the importer's options.
(() => {
  const { test } = pmt;
  const fixture = (name) => foundry.utils.deepClone(pmt.fixtures[name]);
  const edge = (name) => foundry.utils.deepClone(globalThis.__pmtEdge[name]);

  test("report: the post-import dialog lists what is unmatched and not Pathbuilder's labels", async (t) => {
    const exportJson = fixture("315329-magus9");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "report");
    const pm = await pmt.importBuild(actor, exportJson);

    let text = null;
    const hook = Hooks.on("renderDialogV2", (dialog) => {
      if (!dialog.options.classes?.includes("pathmuncher-report")) return;
      text = dialog.element.querySelector(".window-content").innerText;
      setTimeout(() => dialog.element.querySelector("button[data-action='ok']")?.click(), 20);
    });
    t.cleanup(() => Hooks.off("renderDialogV2", hook));
    await pm.postImportCheck();
    await pmt.sleep(300);

    const report = pm.getImportReport();
    t.equal(report.find((g) => g.type === "special"), undefined, "no unmatched specials");
    t.deepEqual(report.find((g) => g.type === "described")?.names, ["Heroic Heart", "Planar Pain"], "specials Soulforger Dedication describes");
    t.ok(text, "no report dialog");
    for (const miss of ["Soulforger Dedication", "Heroic Heart", "Planar Pain", "Formulas", "Elemental Ammunition (Lesser)"]) {
      t.ok(text.includes(miss), `report should show ${miss}`);
    }
    for (const label of ["Spellbook", "Spellstrike Specifics", "Intelligence", "Gecko Grip", "Blur", "Shield (Archetype)"]) {
      t.ok(!text.includes(label), `report should not list ${label}`);
    }
  });

  test("report: specials that are sections of another feature are grouped under it", async (t) => {
    const exportJson = fixture("jack-necromancer9");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "described");
    const pm = await pmt.importBuild(actor, exportJson);

    const described = Object.fromEntries(pm.getDescribedSpecials().map((o) => [o.name, o.specials.map((s) => s.name)])
      .sort(([a], [b]) => a.localeCompare(b)));
    t.deepEqual(described, {
      // "Negative" specials are the remastered "Void" sections
      "Basic Undead Benefits": ["Negative Healing", "Negative Survival", "Immunity to Death Effects", "Disease and Poison Protection", "Undead Hunger"],
      "Necromancer Spellcasting": ["Dirge"],
    }, "described specials by feature");
    const healing = pm.getDescribedSpecials().find((o) => o.name === "Basic Undead Benefits").specials[0];
    t.ok(healing.text.startsWith("You are damaged by"), healing.text);
    // Thralls, the one special without a feature, is ignored rather than reported
    t.deepEqual(pm.getUnmatchedSpecials(), [], "nothing left unmatched");

    let html = null;
    const hook = Hooks.on("renderDialogV2", (dialog) => {
      if (!dialog.options.classes?.includes("pathmuncher-report")) return;
      html = dialog.element.querySelector(".window-content");
      setTimeout(() => dialog.element.querySelector("button[data-action='ok']")?.click(), 20);
    });
    t.cleanup(() => Hooks.off("renderDialogV2", hook));
    await pm.postImportCheck();
    await pmt.sleep(300);

    t.ok(html, "no report dialog");
    const origins = [...html.querySelectorAll(".pathmuncher-report-origin")];
    const undead = origins.find((li) => li.querySelector("a.content-link")?.textContent.trim() === "Basic Undead Benefits");
    t.ok(undead, "a link to Basic Undead Benefits");
    t.equal(undead.querySelector("a.content-link").dataset.uuid, actor.items.find((i) => i.slug === "basic-undead-benefits").uuid, "links the actor's item");
    const hover = undead.querySelector(".pathmuncher-report-described[data-tooltip]");
    t.equal(hover.textContent, "Negative Healing", "special listed under it");
    t.ok(hover.dataset.tooltip.startsWith("You are damaged by"), "its section on hover");
  });

  test("report: a special named after its feature and section is found in that feature", async (t) => {
    // Pathbuilder's "Animal Instinct Raging Resistance" is the "Raging Resistance (9th)" section of Animal Instinct
    const exportJson = edge("barbarian-01");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "instinct sections");
    const pm = await pmt.importBuild(actor, exportJson);

    const instinct = pm.getDescribedSpecials().find((o) => o.name.startsWith("Animal Instinct"));
    t.deepEqual(instinct?.specials.map((s) => s.name).sort(), ["Animal Instinct Raging Resistance", "Animal Instinct Specialization Ability"]);
    t.ok(!pm.getUnmatchedSpecials().some((s) => s.startsWith("Animal Instinct ")), "not reported as unmatched");
  });

  test("report: a special Pathbuilder repeats, or names after the class, is not listed once matched", async (t) => {
    // a thaumaturge's implements appear once per tier; "Thaumaturge Weapon Expertise" is Weapon Expertise;
    // the psychic's "Weapon Specialization" is Psychic Weapon Specialization
    for (const [name, specials] of [["thaumaturge-02", ["Bell", "Mirror", "Thaumaturge Weapon Expertise"]], ["psychic-01", ["Weapon Specialization"]]]) {
      const exportJson = edge(name);
      await pmt.useBuildVariants(t, exportJson.build);
      pmt.answerPrompts(t, exportJson.build);
      const actor = await pmt.actor(t, `repeated ${name}`);
      const pm = await pmt.importBuild(actor, exportJson);
      const unmatched = pm.getUnmatchedSpecials();
      t.deepEqual(specials.filter((s) => unmatched.includes(s)), [], `${name} unmatched: ${unmatched.join(", ")}`);
    }
  });

  test("report: a dual class export warns and imports the primary class", async (t) => {
    const exportJson = fixture("314710-gunslinger1");
    exportJson.build.dualClass = "Fighter";
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const notes = pmt.captureNotifications(t);
    const actor = await pmt.actor(t, "dual class");

    await pmt.importBuild(actor, exportJson);

    t.equal(actor.class?.name, "Gunslinger");
    t.ok(notes.some((n) => n.type === "warning" && n.message.includes("dual class")), JSON.stringify(notes));
  });

  test("report: a build made with variant rules the world lacks warns about each", async (t) => {
    // the Magus was built with Free Archetype and gradual boosts
    const exportJson = fixture("315329-magus9");
    const before = ["freeArchetypeVariant", "gradualBoostsVariant"].map((k) => [k, game.settings.get("pf2e", k)]);
    t.cleanup(async () => {
      for (const [k, v] of before) await game.settings.set("pf2e", k, v);
    });
    for (const [k] of before) await game.settings.set("pf2e", k, false);
    pmt.answerPrompts(t, exportJson.build);
    const notes = pmt.captureNotifications(t);
    const actor = await pmt.actor(t, "variants");
    const pm = new (game.modules.get("pathmuncher").api.Pathmuncher)(actor, {});
    pm.source = exportJson.build;
    await pm.processCharacter();

    const warnings = notes.filter((n) => n.type === "warning").map((n) => n.message);
    t.ok(warnings.some((m) => m.includes("Free Archetype")), JSON.stringify(warnings));
    t.ok(warnings.some((m) => m.includes("gradual ability boosts")), JSON.stringify(warnings));
  });

  test("report: a build whose variant rules match the world does not warn", async (t) => {
    const exportJson = fixture("315329-magus9");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const notes = pmt.captureNotifications(t);
    const actor = await pmt.actor(t, "variants match");
    const pm = new (game.modules.get("pathmuncher").api.Pathmuncher)(actor, {});
    pm.source = exportJson.build;
    await pm.processCharacter();
    t.deepEqual(notes.filter((n) => n.type === "warning" && (/archetype|ability boosts/i).test(n.message)), []);
  });

  test("importer: the blended slots option shows its own saved value", async (t) => {
    const { ACTOR_FLAGS } = game.modules.get("pathmuncher").api.CONSTANTS;
    const actor = await pmt.actor(t, "blended", {
      flags: { pathmuncher: { ...ACTOR_FLAGS, addSpells: true, adjustBlendedSlots: false } },
    });
    const app = await pmt.openImporter(actor);
    t.cleanup(() => app.close());
    const el = app.element;
    t.equal(el.querySelector("input[name='options.addSpells']").checked, true, "spells");
    t.equal(el.querySelector("input[name='options.adjustBlendedSlots']").checked, false, "blended slots");
  });

  test("processing: Pathbuilder parent and child choices are parsed as such", async (t) => {
    const exportJson = fixture("315329-magus9");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "parents");
    const pm = new (game.modules.get("pathmuncher").api.Pathmuncher)(actor, {});
    pm.source = exportJson.build;
    await pm.processCharacter();
    const feat = (name) => pm.parsed.feats.find((f) => f.originalName === name);

    // ["Basic Thoughtform", ..., "parentChoice"] and ["Warp Space", ..., "childChoice", "Free Archetype 8"]
    t.equal(feat("Basic Thoughtform").isParent, true, "Basic Thoughtform is a parent");
    t.equal(feat("Warp Space").isChild, true, "Warp Space is a child");
    t.equal(feat("Nimble Elf").isParent, false, "a standard choice is not a parent");
  });
})();
