// The rename tables' targets: each name a Pathbuilder name is renamed to is in the compendiums the
// importer searches, so a pf2e or sf2e release that renames or drops an item shows up here rather than
// as an unmatched item in someone's import. Only the entries for this world's system are checked
// (untagged ones are pf2e's), and an entry for a module only when the module is active. Run it in a pf2e
// and an sf2e world after either system updates; see tests/README.md.
(() => {
  const { test } = pmt;
  const data = (file) => import(`/modules/pathmuncher/src/data/${file}`);

  /** Whether an entry is for this world: its system, and its module if it has one. */
  const applies = (entry) => (entry.system ?? "pf2e") === game.system.id
    && (!entry.module || !!game.modules.get(entry.module)?.active);

  /**
   * Whether a name is in the importer's packs for the types: by slug, as the importer matches, or as
   * the name of a family of items told apart by a rank or grade ("Wand of Shardstorm (Rank 1)").
   */
  const finder = async (types) => {
    const { CompendiumMatcher, CONSTANTS, Seasoning } = game.modules.get("pathmuncher").api;
    const matchers = types.map((type) => new CompendiumMatcher({ type, mappings: CONSTANTS.CORE_COMPENDIUM_MAPPINGS }));
    await Promise.all(matchers.map((matcher) => matcher.loadCompendiums()));
    const entries = matchers.flatMap((matcher) => Object.values(matcher.indexes).flatMap((index) => [...index]));
    const slugs = new Set(entries.map((i) => CompendiumMatcher.entrySlug(i)));
    return (name) => slugs.has(Seasoning.slug(name)) || entries.some((i) => i.name.startsWith(`${name} (`));
  };

  /** The entries for this world whose targets are not found, as "pbName -> foundryName". */
  const missing = (entries, has) => entries.filter(applies).filter((e) => !has(e.foundryName))
    .map((e) => `${e.pbName} -> ${e.foundryName}`);

  test("rename targets: features", async (t) => {
    const { FEAT_RENAME_STATIC_MAP } = await data("features.js");
    const has = await finder(["feats", "ancestryFeatures", "classFeatures", "actions", "ancestries", "heritages", "classes", "backgrounds", "deities"]);
    t.ok(FEAT_RENAME_STATIC_MAP.filter(applies).length > 0, "some to check");
    t.deepEqual(missing(FEAT_RENAME_STATIC_MAP, has), [], "not found:");
  });

  test("rename targets: equipment", async (t) => {
    const { EQUIPMENT_RENAME_STATIC_MAP } = await data("equipment.js");
    const has = await finder(["equipment"]);
    t.ok(EQUIPMENT_RENAME_STATIC_MAP.filter(applies).length > 0, "some to check");
    t.deepEqual(missing(EQUIPMENT_RENAME_STATIC_MAP, has), [], "not found:");
  });

  test("rename targets: spells", async (t) => {
    const { REMASTER_NAMES, PATHBUILDER_SPELLINGS } = await data("spells.js");
    const has = await finder(["spells"]);
    // a spelling's target may itself be renamed in the remaster, which is the name then looked for
    const legacy = !!game.modules.get("pf2e-legacy-content")?.active;
    const remastered = (name) => (legacy ? name : REMASTER_NAMES.find((r) => r.pbName === name)?.foundryName ?? name);
    const spellings = PATHBUILDER_SPELLINGS.map((e) => ({ ...e, foundryName: remastered(e.foundryName) }));
    t.deepEqual(missing(REMASTER_NAMES.concat(spellings), has), [], "not found:");
  });
})();
