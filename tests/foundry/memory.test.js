// What an import keeps on the actor (ImportMemory) and gives again on the next import of the build.
(() => {
  const { test } = pmt;
  const generated = (name) => foundry.utils.deepClone(globalThis.__pmtGenerated[name]);
  const ImportMemory = () => game.modules.get("pathmuncher").api.ImportMemory;

  /** Imports a build the way the importer does, its answers noted and kept. { pm, asked } */
  const importRemembered = async (t, actor, exportJson, { reuse = false, answer = {} } = {}) => {
    await pmt.useBuildVariants(t, exportJson.build);
    const asked = [];
    const resolveUnansweredChoices = (unanswered) => {
      asked.push(...unanswered.map((u) => u.item.name));
      return Object.fromEntries(unanswered.map((u) => [u.id, answer[u.item.name]]).filter(([, value]) => value));
    };
    const memory = new (ImportMemory())(actor);
    const options = memory.options({ resolveUnansweredChoices }, { reuse });
    const pm = await pmt.importBuild(actor, exportJson, options);
    await memory.save(pm, { source: foundry.utils.deepClone(exportJson.build), report: pm.getImportReport() });
    return { pm, asked };
  };

  const assurances = (actor) => actor.items.filter((i) => i.slug === "assurance")
    .map((i) => i.flags.pf2e?.rulesSelections?.assurance ?? null).sort();

  test("memory: an import keeps the build, its notes and the answers on the actor", async (t) => {
    const exportJson = generated("rogue-05");
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "memory kept");
    await importRemembered(t, actor, exportJson, { answer: { Assurance: "religion" } });

    const kept = actor.getFlag("pathmuncher", "lastImport");
    t.equal(kept?.source?.name, exportJson.build.name, "the build");
    t.ok(Array.isArray(kept?.report), "the notes");
    t.ok(kept?.importedAt, "when");
    const choices = Object.entries(kept?.answers?.choices ?? {});
    t.ok(choices.some(([key, value]) => key.includes("raised-by-belief") && key.endsWith("#assurance") && value === "religion"),
      `the Assurance answer: ${JSON.stringify(choices)}`);
  });

  test("memory: with re-use on, a choice answered last time isn't asked again", async (t) => {
    const exportJson = generated("rogue-05");
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "memory reused");
    await importRemembered(t, actor, exportJson, { answer: { Assurance: "religion" } });

    const again = await importRemembered(t, actor, generated("rogue-05"), { reuse: true });
    t.ok(!again.asked.includes("Assurance"), `asked: ${again.asked.join(", ")}`);
    t.deepEqual(assurances(actor), ["athletics", "religion"], "the background's Assurance keeps its skill");

    const fresh = await importRemembered(t, actor, generated("rogue-05"), { reuse: false });
    t.ok(fresh.asked.includes("Assurance"), "with re-use off it is asked");
  });

  test("memory: an answer the system asked for is kept and given again", async (t) => {
    // a Driver's Assurance is in Piloting Lore, which pf2e's Assurance can't take: the system asks
    const exportJson = generated("fighter-01");
    const actor = await pmt.actor(t, "memory system prompt");
    pmt.answerPrompts(t, exportJson.build);
    await importRemembered(t, actor, exportJson);
    const first = assurances(actor);
    t.equal(first.length, 1, "one Assurance");

    const prompts = pmt.answerPrompts(t, exportJson.build);
    await importRemembered(t, actor, generated("fighter-01"), { reuse: true });
    t.deepEqual(prompts.map((p) => p.item).filter((item) => item === "Assurance"), [], "not asked again");
    t.deepEqual(assurances(actor), first, "the same skill");
  });

  test("memory: how ammunition is shared out is asked each time", async (t) => {
    // Pathbuilder's "Bullets (10 rounds)" for a gunslinger with two guns, each taking its own rounds
    const withBullets = () => {
      const exportJson = foundry.utils.deepClone(pmt.fixtures["314710-gunslinger1"]);
      exportJson.build.equipment.push(["Bullets (10 rounds)", 10, "Invested"]);
      return exportJson;
    };
    await pmt.useBuildVariants(t, withBullets().build);
    pmt.answerPrompts(t, withBullets().build);
    const actor = await pmt.actor(t, "memory ammunition");
    let asked = 0;
    const resolveAmmunition = () => {
      asked++;
      return [{ source: "0", target: "rounds-axe-musket", qty: 6 }, { source: "0", target: "rounds-coat-pistol", qty: 4 }];
    };
    for (const reuse of [false, true]) {
      const memory = new (ImportMemory())(actor);
      const pm = await pmt.importBuild(actor, withBullets(), memory.options({ resolveAmmunition }, { reuse }));
      await memory.save(pm, { source: withBullets().build, report: pm.getImportReport() });
    }
    t.equal(asked, 2, "asked on both imports");
    t.equal(actor.getFlag("pathmuncher", "lastImport")?.answers?.ammunition, undefined, "not kept");
  });

  test("memory: the importer offers the last answers and notes only once there are some", async (t) => {
    const exportJson = generated("rogue-05");
    pmt.answerPrompts(t, exportJson.build);
    await pmt.useBuildVariants(t, exportJson.build);
    const actor = await pmt.actor(t, "memory importer");

    const before = await pmt.openImporter(actor);
    t.equal(before.element.querySelector("input[name='reuseAnswers']"), null, "no re-use box before an import");
    t.equal(before.element.querySelector("[data-action='showLastReport']"), null, "no notes button before an import");
    await before.close();

    // through the importer, the choices dialog left unanswered: the notes are kept, with no answers
    const state = await pmt.submitImporter(actor, { json: exportJson });
    t.ok(state.closed, "imported");
    t.ok(actor.getFlag("pathmuncher", "lastImport")?.source, "the build is kept");
    const unanswered = await pmt.openImporter(actor);
    t.ok(unanswered.element.querySelector("[data-action='showLastReport']"), "the notes button");
    await unanswered.close();

    // an import that answers the background's Assurance
    await importRemembered(t, actor, generated("rogue-05"), { answer: { Assurance: "religion" } });
    const app = await pmt.openImporter(actor);
    t.cleanup(() => app.close());
    const box = app.element.querySelector("input[name='reuseAnswers']");
    t.ok(box?.checked, "the re-use box is shown, ticked");
    const shown = new Promise((resolve) => {
      const hook = Hooks.on("renderDialogV2", (dialog) => {
        if (!dialog.options.classes?.includes("pathmuncher-report")) return;
        Hooks.off("renderDialogV2", hook);
        resolve(dialog.element.querySelector(".window-content").innerText);
        setTimeout(() => dialog.element.querySelector("button[data-action='ok']")?.click(), 20);
      });
      setTimeout(() => {
        Hooks.off("renderDialogV2", hook);
        resolve(null);
      }, 5000);
    });
    app.element.querySelector("[data-action='showLastReport']").click();
    t.ok((await shown)?.includes("Imported"), "the last notes, with when they were made");
  });
})();
