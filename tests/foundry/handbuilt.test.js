// An import should look like the same character built by hand on the sheet: the system decides class
// feature levels and records the level each slotted feat was taken at, so the import should agree.
(() => {
  const { test } = pmt;

  // fixtures whose builds the system's compendiums can rebuild by name (see pmt.buildByHand), with
  // the slot differences pathmuncher still has (remove them as they are fixed)
  const KNOWN_DIFFERENCES = {
    "315329-magus9": [],
    "314710-gunslinger1": [],
    "422753-fighter5": [],
    "477013-fighter4-archer": [],
    "mythic-sorcerer12": [],
  };

  for (const [name, known] of Object.entries(KNOWN_DIFFERENCES)) {
    test(`hand-built ${name}: the import matches a hand-built twin`, async (t) => {
      const exportJson = foundry.utils.deepClone(pmt.fixtures[name]);
      const build = exportJson.build;
      await pmt.useBuildVariants(t, build);
      pmt.answerPrompts(t, build);

      const byHand = await pmt.actor(t, `${name} by hand`);
      const notRebuilt = await pmt.buildByHand(byHand, build);
      t.log.push(...notRebuilt.map((m) => `not rebuilt by hand: ${m}`));
      const imported = await pmt.actor(t, `${name} imported`);
      await pmt.importBuild(imported, exportJson);

      const hand = pmt.characterShape(byHand);
      const shape = pmt.characterShape(imported);
      t.deepEqual(shape.core, hand.core, "core items");
      t.deepEqual(shape.classFeatures, hand.classFeatures, "class features and their levels");
      // feats the hand build could not find are absent there, so compare the slots it filled
      const handSlots = new Set(hand.slots);
      t.deepEqual(shape.slots.filter((s) => !handSlots.has(s)).filter((s) => hand.slots.some((h) => h.split(":")[0] === s.split(":")[0])),
        [],
        "slotted feats that differ from the hand build");
      const missing = hand.slots.filter((s) => !shape.slots.includes(s));
      t.deepEqual(missing.filter((s) => !known.includes(s)), [], "hand-built slotted feats missing from the import");
      t.deepEqual(known.filter((s) => !missing.includes(s)), [], "known differences that no longer occur (remove them):");
    });
  }
})();
