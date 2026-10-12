// Re-importing over an existing character: pathmuncher replaces what it imported, never touches
// effects or conditions, asks about items added by hand, and leaves unticked categories alone.
(() => {
  const { test } = pmt;
  const fixture = (name) => foundry.utils.deepClone(pmt.fixtures[name]);
  const IMPORTED = "flags.pathmuncher.imported";

  const imported = async (ctx, label, fixtureName = "314710-gunslinger1", options = {}) => {
    const exportJson = fixture(fixtureName);
    await pmt.useBuildVariants(ctx, exportJson.build);
    pmt.answerPrompts(ctx, exportJson.build);
    const actor = await pmt.actor(ctx, label);
    await pmt.importBuild(actor, exportJson, options);
    return { actor, exportJson };
  };
  const ids = (actor) => new Set(actor.items.map((i) => i.id));
  const countByKey = (actor) => pmt.itemKeys(actor).reduce((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), {});

  test("reimport: every item an import creates is flagged as imported", async (t) => {
    const { actor } = await imported(t, "flags");
    const replaceable = actor.items.filter((i) => game.modules.get("pathmuncher").api.Pathmuncher.importOptionForItem(i));
    const unflagged = replaceable.filter((i) => {
      if (foundry.utils.getProperty(i, IMPORTED)) return false;
      const parent = actor.items.get(i.flags.pf2e?.grantedBy?.id);
      return !(parent && foundry.utils.getProperty(parent, IMPORTED));
    });
    t.ok(replaceable.length > 10, `only ${replaceable.length} items imported`);
    t.deepEqual(unflagged.map((i) => i.name), [], "items neither flagged nor granted by a flagged item");
  });

  test("reimport: replaces imported items, keeps effects, conditions and hand-added items", async (t) => {
    const { actor, exportJson } = await imported(t, "keep");
    const before = countByKey(actor);
    const oldImported = actor.items.filter((i) => foundry.utils.getProperty(i, IMPORTED)).map((i) => i.id);
    const hand = await pmt.addHandItems(actor);

    await pmt.importBuild(actor, exportJson);

    const now = ids(actor);
    for (const [key, id] of Object.entries(hand)) t.ok(now.has(id), `${key} was removed`);
    t.ok(oldImported.every((id) => !now.has(id)), "old imported items should be replaced");
    const after = countByKey(actor);
    for (const [key, count] of Object.entries(before)) t.equal(after[key], count, `${key} count after re-import`);
  });

  test("reimport: the dialog offers hand-added items and deletes only the unticked ones", async (t) => {
    const { actor, exportJson } = await imported(t, "dialog");
    const hand = await pmt.addHandItems(actor);
    const offered = pmt.answerKeepDialog(t, (offeredIds) => offeredIds.filter((id) => id !== hand.trinket));

    const state = await pmt.submitImporter(actor, { json: exportJson });

    t.ok(state.closed, "import should complete");
    t.equal(offered.length, 1, "keep dialog shown once");
    t.deepEqual([...offered[0]].sort(), [hand.feat, hand.trinket].sort(), "offered items");
    const now = ids(actor);
    t.ok(!now.has(hand.trinket), "unticked trinket should be deleted");
    t.ok(now.has(hand.feat), "ticked feat should be kept");
    t.ok(now.has(hand.effect) && now.has(hand.condition), "effect and condition are never offered or removed");
  });

  test("reimport: cancelling the keep dialog leaves the actor untouched", async (t) => {
    const { actor, exportJson } = await imported(t, "cancel");
    await pmt.addHandItems(actor);
    const before = pmt.itemKeys(actor);
    const beforeIds = [...ids(actor)].sort();
    const notes = pmt.captureNotifications(t);
    pmt.answerKeepDialog(t, () => null);

    const state = await pmt.submitImporter(actor, { json: exportJson });

    t.deepEqual(pmt.itemKeys(actor), before, "items changed");
    t.deepEqual([...ids(actor)].sort(), beforeIds, "item ids changed");
    t.ok(notes.some((n) => n.message.includes("Import cancelled")), JSON.stringify(notes));
    t.equal(state.buttonDisabled, false, "import button left disabled");
    t.deepEqual(game.actors.filter((a) => a.getFlag("pathmuncher", "temp")).map((a) => a.name), [], "temp actors left");
  });

  test("reimport: a first import over a hand-built actor asks about its items", async (t) => {
    const exportJson = fixture("314710-gunslinger1");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "first import");
    const hand = await pmt.addHandItems(actor);
    const offered = pmt.answerKeepDialog(t, () => []);

    await pmt.submitImporter(actor, { json: exportJson });

    t.deepEqual([...(offered[0] ?? [])].sort(), [hand.feat, hand.trinket].sort(), "offered items");
    const now = ids(actor);
    t.ok(!now.has(hand.feat) && !now.has(hand.trinket), "unticked items should be deleted");
    t.ok(now.has(hand.effect) && now.has(hand.condition), "effect and condition kept");
    t.equal(actor.class?.name, "Gunslinger");
  });

  test("reimport: an actor imported before items were flagged is replaced without asking", async (t) => {
    const { actor, exportJson } = await imported(t, "legacy");
    // what an actor imported by pathmuncher 1.6.1 looks like: options in its flags, no item flags
    await actor.updateEmbeddedDocuments("Item", actor.items.map((i) => ({ _id: i.id, "flags.pathmuncher.imported": null })));
    const { ACTOR_FLAGS } = game.modules.get("pathmuncher").api.CONSTANTS;
    await actor.update({ "flags.pathmuncher": { ...ACTOR_FLAGS, pathbuilderId: "314710" } });
    const effects = game.packs.get("pf2e.equipment-effects");
    const effect = await effects.getDocument((await effects.getIndex()).contents[0]._id);
    const [effectItem] = await actor.createEmbeddedDocuments("Item", [effect.toObject()]);
    const before = countByKey(actor);
    const offered = pmt.answerKeepDialog(t);

    const state = await pmt.submitImporter(actor, { json: exportJson });

    t.ok(state.closed, "import should complete");
    t.equal(offered.length, 0, "no keep dialog for a legacy import");
    t.ok(actor.items.get(effectItem.id), "effect kept");
    t.deepEqual(countByKey(actor), before, "same items after re-import");
    t.ok(actor.items.filter((i) => i.type !== "effect").every((i) => foundry.utils.getProperty(i, IMPORTED)
      || foundry.utils.getProperty(actor.items.get(i.flags.pf2e?.grantedBy?.id) ?? {}, IMPORTED)), `items flagged after re-import: ${actor.items.filter((i) => !foundry.utils.getProperty(i, IMPORTED)).map((i) => `${i.type}:${i.name}`)}`);
  });

  test("reimport: signature spells marked on the sheet are marked again", async (t) => {
    // Pathbuilder's export doesn't say which spells are signature spells, so the first import notes
    // them as to choose; marks made on the sheet are all a re-import has to go on
    const exportJson = foundry.utils.deepClone(globalThis.__pmtGenerated["sorcerer-12"]);
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "signature");
    const signature = () => {
      const entry = actor.itemTypes.spellcastingEntry.find((e) => e.name === "Sorcerer");
      return actor.itemTypes.spell.filter((s) => s.system.location.value === entry.id && s.system.location.signature);
    };
    const notes = (pm) => pm.getImportReport().find((g) => g.type === "signature")?.names;

    let pm = await pmt.importBuild(actor, exportJson);
    t.deepEqual(signature().map((s) => s.name), [], "none marked by the import");
    t.deepEqual(notes(pm), ["Sorcerer"], "the import notes ask for them");

    const entry = actor.itemTypes.spellcastingEntry.find((e) => e.name === "Sorcerer");
    const slow = actor.itemTypes.spell.find((s) => s.name === "Slow" && s.system.location.value === entry.id);
    await slow.update({ "system.location.signature": true });
    pm = await pmt.importBuild(actor, exportJson);

    const marked = signature();
    t.deepEqual(marked.map((s) => `${s.name} ${s.system.location.heightenedLevel}`), ["Slow 3"], "Slow is a signature spell again");
    t.ok(!actor.items.has(slow.id), "on the new copy of the spell");
    t.equal(notes(pm), undefined, "nothing left to choose");
  });

  test("reimport: addMoney off keeps the actor's coins", async (t) => {
    const { actor, exportJson } = await imported(t, "money");
    t.equal(actor.inventory.coins.gp, 4, "fixture premise");
    await actor.inventory.addCoins({ gp: 6 });
    const coinIds = actor.itemTypes.treasure.map((i) => i.id).sort();

    await pmt.importBuild(actor, exportJson, { addMoney: false });

    t.equal(actor.inventory.coins.gp, 10, "gold");
    t.deepEqual(actor.itemTypes.treasure.map((i) => i.id).sort(), coinIds, "coin items");
  });

  test("reimport: addArmor off keeps armor and shields", async (t) => {
    const { actor, exportJson } = await imported(t, "armor", "345816-guardian3");
    const armorIds = [...actor.itemTypes.armor, ...actor.itemTypes.shield].map((i) => i.id).sort();
    t.ok(actor.itemTypes.shield.length === 1, "fixture premise: one shield");

    await pmt.importBuild(actor, exportJson, { addArmor: false });

    t.deepEqual([...actor.itemTypes.armor, ...actor.itemTypes.shield].map((i) => i.id).sort(), armorIds);
  });

  test("reimport: addFormulas off neither adds nor removes formulas", async (t) => {
    const { actor, exportJson } = await imported(t, "formulas off", "315329-magus9", { addFormulas: false });
    t.equal(actor.system.crafting.formulas.length, 0, "first import with formulas off");

    await pmt.importBuild(actor, exportJson);
    const count = actor.system.crafting.formulas.length;
    t.ok(count > 0, "formulas added when on");

    await pmt.importBuild(actor, exportJson, { addFormulas: false });
    t.equal(actor.system.crafting.formulas.length, count, "re-import with formulas off keeps them");
  });
})();
