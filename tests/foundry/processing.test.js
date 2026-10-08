// Processing details: unmatched containers, the deep-dive setting, choices, prepared slots.
(() => {
  const { test } = pmt;
  const fixture = (name) => foundry.utils.deepClone(pmt.fixtures[name]);
  const generated = (name) => foundry.utils.deepClone(globalThis.__pmtGenerated[name]);

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

  test("processing: a class feature choice named with Pathbuilder's suffix is not prompted", async (t) => {
    // the Necromancer's Grim Fascination offers "Bone"; Pathbuilder lists it as the special "Bone Fascination"
    const exportJson = fixture("jack-necromancer9");
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "grim fascination");

    await pmt.importBuild(actor, exportJson);

    t.deepEqual(prompts.map((p) => p.item), [], "prompts");
    const grim = actor.items.find((i) => i.slug === "grim-fascination");
    const bone = actor.items.find((i) => i.slug === "bone");
    t.ok(bone, "Bone on the actor");
    t.equal(bone.flags.pf2e.grantedBy?.id, grim.id, "granted by Grim Fascination");
  });

  test("processing: an awarded feat Pathbuilder repeats in specials is created once", async (t) => {
    // Beast Trainer (orc, 13) grants Train Animal; the export lists it as an awarded feat and a special
    const exportJson = generated("cleric-03");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "repeated special");

    await pmt.importBuild(actor, exportJson);

    const trainAnimal = actor.items.filter((i) => i.slug === "train-animal");
    t.equal(trainAnimal.length, 1, "Train Animal items");
    t.equal(trainAnimal[0].flags.pf2e.grantedBy?.id, actor.items.find((i) => i.slug === "beast-trainer").id, "granted by Beast Trainer");
  });

  test("processing: a cleric's \"Domain: X\" special answers Domain Initiate", async (t) => {
    // Sarenrae's domains are fire, healing, sun and truth; the generated build picked one she lacks
    const exportJson = generated("cleric-01");
    exportJson.build.specials = exportJson.build.specials.map((s) => (s.startsWith("Domain: ") ? "Domain: Healing" : s));
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "domain");

    const pm = await pmt.importBuild(actor, exportJson);

    t.deepEqual(prompts.map((p) => p.item).filter((item) => item === "Domain Initiate"), [], "Domain Initiate prompts");
    t.equal(actor.items.find((i) => i.slug === "domain-initiate").flags.pf2e.rulesSelections.domainInitiate, "healing");
    t.ok(!pm.getUnmatchedSpecials().includes("Domain: Healing"), "domain not reported");
  });

  test("processing: a class feature the class lists under another name matches Pathbuilder's name", async (t) => {
    // the Champion class grants "Weapon Mastery" at 13 as the item Martial Weapon Mastery
    const exportJson = generated("champion-02");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "class feature alias");

    const pm = await pmt.importBuild(actor, exportJson);

    t.ok(actor.items.some((i) => i.slug === "martial-weapon-mastery"), "Martial Weapon Mastery on the actor");
    t.ok(!pm.getUnmatchedSpecials().includes("Weapon Mastery"), "Weapon Mastery not reported");
    t.equal(actor.items.filter((i) => (/Weapon Mastery/).test(i.name)).length, 1, "one item for it");
  });

  test("processing: a sorcerer's bloodline and its kind come from Pathbuilder's names", async (t) => {
    // "Bloodline: Draconic (Divine)" with "Draconic (Requiem)", "Bloodline: Elemental (Air)", "Bloodline: Genie (Djinni)"
    const expected = {
      "sorcerer-07": ["bloodline-draconic", "dragonBloodline", (v) => v?.slug === "requiem"],
      "sorcerer-10": ["bloodline-elemental", "elementalBloodline", (v) => v?.slug === "air"],
      "sorcerer-17": ["bloodline-genie", "genie", (v) => v === "jaathoom"],
    };
    for (const [name, [slug, flag, check]] of Object.entries(expected)) {
      const exportJson = generated(name);
      await pmt.useBuildVariants(t, exportJson.build);
      const prompts = pmt.answerPrompts(t, exportJson.build);
      const actor = await pmt.actor(t, `bloodline ${name}`);

      await pmt.importBuild(actor, exportJson);

      t.deepEqual(prompts.map((p) => p.item).filter((item) => item === "Bloodline" || item?.startsWith("Bloodline:")), [], `${name} bloodline prompts`);
      const bloodline = actor.items.find((i) => i.slug === slug);
      t.ok(bloodline, `${name} has ${slug}`);
      const selection = bloodline.flags.pf2e.rulesSelections?.[flag];
      t.ok(check(selection), `${name} ${flag}: ${JSON.stringify(selection)}`);
    }
  });

  test("processing: an item's several choices of one kind never take the same Pathbuilder entry twice", async (t) => {
    // the Commander's Tactics item chooses five tactics; this build names one basic tactic (Coordinating
    // Maneuvers) and higher ones, so pathmuncher answers the first choice and leaves the rest to the user
    const exportJson = generated("commander-02");
    await pmt.useBuildVariants(t, exportJson.build);
    // leave the choices pathmuncher cannot answer to the user: dismiss their prompts
    const hook = Hooks.on("renderApplicationV2", (app) => {
      if (!Array.isArray(app.choices) || typeof app.resolveSelection !== "function") return;
      app.selection = null;
      setTimeout(() => app.close(), 20);
    });
    t.cleanup(() => Hooks.off("renderApplicationV2", hook));
    const actor = await pmt.actor(t, "tactics");
    const pm = new (game.modules.get("pathmuncher").api.Pathmuncher)(actor, {});
    pm.source = exportJson.build;

    await pm.processCharacter();

    const tactics = pm.result.feats.find((f) => f.system.slug === "tactics");
    const selections = tactics.system.rules.filter((r) => r.key === "ChoiceSet" && r.selection).map((r) => r.selection);
    t.ok(selections.length >= 1, "the named tactic is chosen");
    t.equal(new Set(selections).size, selections.length, `no tactic chosen twice: ${selections.join(", ")}`);
  });

  test("processing: a spellbook spell prepared in a higher slot keeps its spellbook rank", async (t) => {
    // Fear is a rank 1 spell in the spellbook, prepared in a rank 3 slot
    const exportJson = fixture("jack-necromancer9");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "heightened slots");

    await pmt.importBuild(actor, exportJson);

    const entry = actor.spellcasting.regular.find((e) => e.name === "Necromancer");
    const fear = entry.spells.find((s) => s.slug === "fear");
    t.equal(fear.rank, 1, "spellbook rank");
    const groups = (await entry.getSheetData()).groups;
    const cast = (id, slug) => groups.find((g) => g.id === id).active.find((a) => a?.spell.slug === slug)?.castRank;
    t.equal(cast(3, "fear"), 3, "Fear cast from its rank 3 slot");
    t.equal(cast(5, "summon-undead"), 5, "Summon Undead cast from its rank 5 slot");
  });

  test("processing: a skill choice given as the path it trains is settled by the proficiencies", async (t) => {
    // Mastermind trains Arcana, Nature, Occultism or Religion ("system.skills.nature.rank"); only Nature is trained
    const exportJson = generated("rogue-02");
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "mastermind");

    await pmt.importBuild(actor, exportJson);

    t.deepEqual(prompts.map((p) => p.item).filter((item) => item === "Mastermind"), [], "Mastermind prompts");
    t.equal(actor.items.find((i) => i.slug === "mastermind").flags.pf2e.rulesSelections.mastermind, "system.skills.nature.rank");
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
