// What the user is told: the post-import report, dual class warnings, and the importer's options.
(() => {
  const { test } = pmt;
  const fixture = (name) => foundry.utils.deepClone(pmt.fixtures[name]);

  test("report: the post-import dialog lists unmatched specials and not Pathbuilder's labels", async (t) => {
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

    const specials = pm.getImportReport().find((g) => g.type === "special");
    t.deepEqual(specials?.names, ["Heroic Heart", "Planar Pain"], "unmatched specials in the report");
    t.ok(text, "no report dialog");
    for (const miss of ["Specials", "Heroic Heart", "Planar Pain", "Formulas", "Elemental Ammunition (Lesser)"]) {
      t.ok(text.includes(miss), `report should show ${miss}`);
    }
    for (const label of ["Spellbook", "Spellstrike Specifics", "Intelligence", "Gecko Grip", "Blur", "Shield (Archetype)"]) {
      t.ok(!text.includes(label), `report should not list ${label}`);
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
    await game.modules.get("pathmuncher").api.utils.removeTempActors();

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
    await game.modules.get("pathmuncher").api.utils.removeTempActors();
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
    await game.modules.get("pathmuncher").api.utils.removeTempActors();
  });
})();
