// Processing details: unmatched containers, the deep-dive setting.
(() => {
  const { test } = pmt;
  const fixture = (name) => foundry.utils.deepClone(pmt.fixtures[name]);

  test("processing: a container with no compendium match is created on the actor only", async (t) => {
    const exportJson = fixture("304883-thaumaturge1");
    const build = exportJson.build;
    // the container is only described in equipmentContainers, under a name no compendium has
    for (const container of Object.values(build.equipmentContainers)) container.containerName = "Mystery Satchel";
    build.equipment = build.equipment.filter(([name]) => name !== "Backpack");
    await pmt.useBuildVariants(t, build);
    pmt.answerPrompts(t, build);
    const worldItems = new Set(game.items.map((i) => i.id));
    const actor = await pmt.actor(t, "unmatched container");

    await pmt.importBuild(actor, exportJson);

    const created = game.items.filter((i) => !worldItems.has(i.id));
    t.cleanup(() => Item.deleteDocuments(created.map((i) => i.id)));
    t.deepEqual(created.map((i) => i.name), [], "world items created");
    const satchel = actor.itemTypes.backpack.find((i) => i.name === "Mystery Satchel");
    t.ok(satchel, "container on the actor");
    t.equal(satchel.contents.size, 8, "contents in the container");
  });

  test("processing: a skill choice the build's proficiencies answer is not prompted", async (t) => {
    // the Fighter's class skill (Acrobatics or Athletics) is not in the export; Athletics is trained
    const exportJson = fixture("477013-fighter4-archer");
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "class skill");

    await pmt.importBuild(actor, exportJson);

    t.deepEqual(prompts.map((p) => p.item), [], "prompts");
    t.equal(actor.skills.athletics.rank, 1, "athletics");
    t.equal(actor.skills.acrobatics.rank, 0, "acrobatics");
  });

  test("processing: a skill choice the proficiencies cannot settle is still prompted", async (t) => {
    // with both skills trained, which one the class granted is ambiguous
    const exportJson = fixture("477013-fighter4-archer");
    exportJson.build.proficiencies.acrobatics = 2;
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "class skill ambiguous");

    await pmt.importBuild(actor, exportJson);

    t.deepEqual(prompts.map((p) => p.item), ["Fighter"], "prompts");
  });

  test("processing: an unmatched special that is an action is imported as that action", async (t) => {
    // Soulforger's Manifest Soulforged Armament is in the actions compendium, not granted by a feat
    const exportJson = fixture("315329-magus9");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "special action");

    const pm = await pmt.importBuild(actor, exportJson);

    const actions = actor.itemTypes.action.filter((a) => a.slug === "manifest-soulforged-armament");
    t.equal(actions.length, 1, "Manifest Soulforged Armament actions");
    t.ok(!pm.getUnmatchedSpecials().includes("Manifest Soulforged Armament"), "no longer reported");
  });

  test("processing: the deep-dive setting off gives the same character as on", async (t) => {
    const exportJson = fixture("315329-magus9");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const before = game.settings.get("pathmuncher", "use-immediate-deep-dive");
    t.cleanup(() => game.settings.set("pathmuncher", "use-immediate-deep-dive", before));

    await game.settings.set("pathmuncher", "use-immediate-deep-dive", true);
    const on = await pmt.actor(t, "deep dive on");
    await pmt.importBuild(on, exportJson);

    await game.settings.set("pathmuncher", "use-immediate-deep-dive", false);
    const off = await pmt.actor(t, "deep dive off");
    await pmt.importBuild(off, foundry.utils.deepClone(exportJson));

    t.deepEqual(pmt.itemKeys(off), pmt.itemKeys(on), "items");
  });
})();
