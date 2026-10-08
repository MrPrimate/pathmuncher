// Every Pathbuilder fixture imports without errors and matches its build, apart from the known gaps
// listed here. When a fix closes a gap the test fails until the entry is removed, so this list stays
// an accurate record of what pathmuncher still gets wrong. Prompts are the pf2e choices the user
// still has to answer during the import, by the item that raised them. unmatchedSpecials are the
// Pathbuilder specials the post-import report lists (labels such as "Spellbook" are left out).
(() => {
  const { test } = pmt;

  const EXPECTATIONS = {
    "315329-magus9": {
      // Heroic Heart and Planar Pain are sections of Soulforger Dedication
      unmatchedSpecials: [],
      prompts: ["The Tangible Dream"],
      knownGaps: [
        "formulas 61 (expected 62)",
      ],
    },
    "142926-wizard20": {
      unmatchedSpecials: [
        "Arcane School: Universalist",
        "Arcane Thesis: Metamagical Experimentation",
        "Domain: Magic",
        "Resolve",
      ],
      prompts: [
        "Elemental Heart Dwarf",
        "Arcane School",
        "Arcane Thesis",
        "Deity (Cleric)",
        "Specialty Crafting",
        "Domain Initiate",
        "Ancestral Paragon",
      ],
      knownGaps: [
        "feat in bonus feats: Dwarven Hold Education [Ancestry Feat 1] (expected ancestry)",
        "feat in bonus feats: Counterspell [Class Feat 1] (expected class)",
        "feat missing: Eschew Materials [Class Feat 2]",
        "feat in bonus feats: Explosive Savant [Ancestry Feat 3] (expected ancestry)",
        "feat in bonus feats: Energy Ablation [Wizard Feat 4] (expected class)",
        "feat in bonus feats: Blast Resistance [Ancestry Feat 7] (expected ancestry)",
        "feat in bonus feats: Mountain's Stoutness [Ancestry Feat 11] (expected ancestry)",
        "feat in bonus feats: Communal Healing [Cleric Feat 12] (expected class)",
        "feat missing: Scroll Savant [Class Feat 14]",
        "feat missing: Improved Communal Healing [Cleric Feat 14]",
        "feat in bonus feats: Fire Savvy [Ancestry Feat 15] (expected ancestry)",
        "feat in bonus feats: Explosive Expert [Ancestry Feat 15] (expected ancestry)",
        "feat in bonus feats: Defy the Darkness [Ancestry Feat 19] (expected ancestry)",
      ],
    },
    "304883-thaumaturge1": {
      // the Regalia implement is imported; Pathbuilder repeats its name
      unmatchedSpecials: [],
      prompts: ["Foxfire"],
      knownGaps: [],
    },
    "314710-gunslinger1": {
      unmatchedSpecials: ["Singular Expertise"],
      prompts: ["Living Weapon"],
      knownGaps: [],
    },
    "345816-guardian3": {
      // Ever Ready is a section of Guardian's Techniques
      unmatchedSpecials: ["Dwarf"],
      prompts: [],
      knownGaps: [
        "core heritage: expected Custom Mixed Heritage, got null",
        "feat missing: Custom Mixed Heritage [Heritage 1]",
      ],
    },
    "422753-fighter5": {
      unmatchedSpecials: [],
      prompts: [
        // both Acrobatics and Athletics are trained, so the class skill choice stays ambiguous
        "Fighter",
        "Barrow's Edge",
        "Barrow's Edge",
        "Exemplar Dedication",
        "Fighter Weapon Mastery",
      ],
      knownGaps: [],
    },
    "477013-fighter4-archer": {
      unmatchedSpecials: [],
      prompts: [],
      knownGaps: [],
    },
    "jack-necromancer9": {
      // the others are sections of Basic Undead Benefits and Necromancer Spellcasting
      unmatchedSpecials: ["Thralls"],
      // Grim Fascination's choice comes from the "Bone Fascination" special
      prompts: [],
      knownGaps: [],
    },
  };

  for (const [name, expectation] of Object.entries(EXPECTATIONS)) {
    test(`fixture ${name}: imports and matches the build`, async (t) => {
      const exportJson = foundry.utils.deepClone(pmt.fixtures[name]);
      t.ok(exportJson, `fixture ${name} missing`);
      const build = exportJson.build;
      await pmt.useBuildVariants(t, build);
      const prompts = pmt.answerPrompts(t, build);
      const worldItems = new Set(game.items.map((i) => i.id));
      const actor = await pmt.actor(t, name);

      const pm = await pmt.importBuild(actor, exportJson);

      const problems = pmt.compareWithBuild(actor, build);
      const unexpected = problems.filter((p) => !expectation.knownGaps.includes(p));
      const fixed = expectation.knownGaps.filter((p) => !problems.includes(p));
      t.log.push(...problems.map((p) => `known: ${p}`).filter((p) => !unexpected.includes(p.slice(7))));
      t.deepEqual(unexpected, [], "new differences from the build:");
      t.deepEqual(fixed, [], "known gaps that no longer occur (remove them from EXPECTATIONS):");
      t.deepEqual(prompts.map((p) => p.item), expectation.prompts, "pf2e prompts during the import:");
      t.deepEqual(pm.getUnmatchedSpecials(), expectation.unmatchedSpecials, "unmatched specials in the report:");
      t.deepEqual(game.items.filter((i) => !worldItems.has(i.id)).map((i) => i.name), [], "world items created");
      t.deepEqual(game.actors.filter((a) => a.getFlag("pathmuncher", "temp")).map((a) => a.name), [], "temp actors left");
    });
  }
})();
