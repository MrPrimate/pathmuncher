// Snapshots: what each import produces (pmt.characterSnapshot), compared with the snapshot saved in
// tests/fixtures/snapshots. Any change to the result fails the test with the lines that changed, so a
// refactor shows exactly what it moved. When a change is intended, rerun with PMT_UPDATE_SNAPSHOTS=1
// to rewrite the snapshots, and review their diff. Covers every fixture, every edge-case build and, of
// the generated builds, the first of each class; PMT_SNAPSHOT_ALL=1 covers every generated build.
(() => {
  const { test } = pmt;
  const saved = globalThis.__pmtSnapshots ?? {};
  const update = !!globalThis.__pmtUpdateSnapshots;
  const generated = globalThis.__pmtGenerated ?? {};
  globalThis.__pmtSnapshotResults = {};

  const firstOfClass = new Set();
  const classes = new Set();
  for (const name of Object.keys(generated).sort()) {
    const className = name.replace(/-\d+$/, "");
    if (classes.has(className)) continue;
    classes.add(className);
    firstOfClass.add(name);
  }
  const builds = [
    ...Object.entries(pmt.fixtures),
    ...Object.entries(generated)
      .filter(([name]) => globalThis.__pmtSnapshotAll || firstOfClass.has(name))
      .map(([name, exportJson]) => [`generated/${name}`, exportJson]),
    ...Object.entries(globalThis.__pmtEdge ?? {}).map(([name, exportJson]) => [`edge/${name}`, exportJson]),
  ];

  for (const [name, exportJson] of builds) {
    test(`snapshot ${name}`, async (t) => {
      const build = foundry.utils.deepClone(exportJson.build);
      await pmt.useBuildVariants(t, build);
      const prompts = pmt.answerPrompts(t, build);
      const actor = await pmt.actor(t, `snapshot ${name}`);

      const pm = await pmt.importBuild(actor, exportJson);

      const snapshot = pmt.characterSnapshot(actor, pm, prompts);
      globalThis.__pmtSnapshotResults[name] = snapshot;
      if (update) return;
      t.ok(saved[name], `no snapshot for ${name}: run with PMT_UPDATE_SNAPSHOTS=1 and review the new file`);
      const differences = pmt.snapshotDifferences(saved[name], snapshot);
      const shown = differences.slice(0, 60).join("\n");
      t.ok(differences.length === 0, `differs from its snapshot:\n${shown}${differences.length > 60 ? `\n... ${differences.length - 60} more` : ""}`);
    });
  }
})();
