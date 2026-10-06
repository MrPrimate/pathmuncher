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
