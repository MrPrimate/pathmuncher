// The importer dialog: bad input must never touch the actor, and failures must leave it usable.
(() => {
  const { test } = pmt;
  const gunslinger = () => foundry.utils.deepClone(pmt.fixtures["314710-gunslinger1"]);

  // An imported character that also has an effect, a condition and items added by hand (kept if the
  // import gets as far as asking about them).
  const preparedActor = async (ctx, label) => {
    const exportJson = gunslinger();
    await pmt.useBuildVariants(ctx, exportJson.build);
    pmt.answerPrompts(ctx, exportJson.build);
    pmt.answerKeepDialog(ctx);
    const actor = await pmt.actor(ctx, label);
    await pmt.importBuild(actor, exportJson);
    await pmt.addHandItems(actor);
    return actor;
  };

  const rejects = (name, input, expectedMessage, setup = null) => test(`importer: ${name} leaves the actor untouched`, async (t) => {
    const actor = await preparedActor(t, name);
    const before = pmt.itemKeys(actor);
    const notes = pmt.captureNotifications(t);
    if (setup) await setup(t);
    const state = await pmt.submitImporter(actor, input);
    t.deepEqual(pmt.itemKeys(actor), before, "items changed");
    t.ok(notes.some((n) => ["error", "warning"].includes(n.type) && n.message.includes(expectedMessage)),
      `no ${expectedMessage} notification: ${JSON.stringify(notes)}`);
    t.equal(state.buttonDisabled, false, "import button left disabled");
  });

  const stubFetch = (ctx, body) => {
    const orig = window.fetch;
    window.fetch = async () => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    ctx.cleanup(() => {
      window.fetch = orig; 
    });
  };

  rejects("invalid JSON text", { json: "{ not json" }, "Unable to parse JSON data");
  rejects("JSON that is not a Pathbuilder export", { json: { hello: "world" } }, "does not look like a Pathbuilder export");
  rejects("a failed export pasted", { json: { success: false } }, "does not look like a Pathbuilder export");
  rejects("an unreachable Pathbuilder id", { id: "1" }, "Unable to reach Pathbuilder", (ctx) => {
    const orig = window.fetch;
    window.fetch = async () => {
      throw new TypeError("Failed to fetch"); 
    };
    ctx.cleanup(() => {
      window.fetch = orig; 
    });
  });
  rejects("a Pathbuilder id that returns success false", { id: "1" }, "Unable to fetch a character", (ctx) => stubFetch(ctx, { success: false }));
  rejects("a failure while processing", { json: gunslinger() }, "could not process this character", (ctx) => {
    const api = game.modules.get("pathmuncher").api;
    const orig = api.Pathmuncher.normaliseSource;
    api.Pathmuncher.normaliseSource = () => {
      throw new Error("simulated processing failure"); 
    };
    ctx.cleanup(() => {
      api.Pathmuncher.normaliseSource = orig; 
    });
  });

  test("importer: a failure while updating the actor saves a pre-import copy", async (t) => {
    const actor = await preparedActor(t, "update failure");
    const before = pmt.itemKeys(actor);
    const actorsBefore = new Set(game.actors.map((a) => a.id));
    const notes = pmt.captureNotifications(t);
    // pathmuncher has already removed the old items when its first create fails
    actor.createEmbeddedDocuments = async () => {
      throw new Error("simulated create failure"); 
    };
    t.cleanup(() => {
      delete actor.createEmbeddedDocuments; 
    });
    t.cleanup(async () => {
      for (const a of game.actors.filter((x) => !actorsBefore.has(x.id))) await a.delete();
    });

    const state = await pmt.submitImporter(actor, { json: gunslinger() });
    const backups = game.actors.filter((a) => !actorsBefore.has(a.id));
    t.equal(backups.length, 1, "backup actors");
    t.ok(backups[0].name.endsWith("(pre-import backup)"), backups[0].name);
    t.deepEqual(pmt.itemKeys(backups[0]), before, "backup items");
    t.ok(notes.some((n) => n.type === "error" && n.message.includes("pre-import backup")), JSON.stringify(notes));
    t.equal(state.buttonDisabled, false, "import button left disabled");
  });

  for (const [label, json] of [["a full export", () => gunslinger()], ["a bare build object", () => gunslinger().build]]) {
    test(`importer: pasting ${label} imports the character`, async (t) => {
      const exportJson = gunslinger();
      await pmt.useBuildVariants(t, exportJson.build);
      pmt.answerPrompts(t, exportJson.build);
      const actor = await pmt.actor(t, `paste ${label}`);
      const state = await pmt.submitImporter(actor, { json: json() });
      t.ok(state.closed, "dialog should close after a successful import");
      t.equal(actor.name, exportJson.build.name);
      t.equal(actor.class?.name, "Gunslinger");
      t.equal(actor.level, 1);
    });
  }
})();
