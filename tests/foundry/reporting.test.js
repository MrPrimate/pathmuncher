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

    let content = null;
    const hook = Hooks.on("renderDialog", (dialog) => {
      content = dialog.data.content;
      setTimeout(() => dialog.close(), 20);
    });
    t.cleanup(() => Hooks.off("renderDialog", hook));
    await pm.postImportCheck();
    await pmt.sleep(300);

    t.ok(content, "no report dialog");
    const text = content.replace(/<[^>]+>/g, "\n");
    for (const miss of ["Manifest Soulforged Armament", "Heroic Heart", "Planar Pain"]) {
      t.ok(text.includes(`Specials: ${miss}`), `report should list ${miss}`);
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

  test("importer: the blended slots option shows its own saved value", async (t) => {
    const { ACTOR_FLAGS } = game.modules.get("pathmuncher").api.CONSTANTS;
    const actor = await pmt.actor(t, "blended", {
      flags: { pathmuncher: { ...ACTOR_FLAGS, addSpells: true, adjustBlendedSlots: false } },
    });
    const app = new (game.modules.get("pathmuncher").api.PathmuncherImporter)({}, actor);
    t.cleanup(() => app.close());
    await app.render(true);
    for (let i = 0; i < 50 && !app.element?.[0]?.querySelector("#checkBoxBlendedSlots"); i++) await pmt.sleep(100);
    const el = app.element[0];
    t.equal(el.querySelector("#checkBoxSpells").checked, true, "spells");
    t.equal(el.querySelector("#checkBoxBlendedSlots").checked, false, "blended slots");
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
