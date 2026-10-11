// Animal companions, made as characters of their own with the PF2e Companion Compendia module
// (BFFBuilder). Only registered in a world where that module is active.
(() => {
  if (!game.modules.get("pf2e-animal-companions")?.active) return;
  const { test } = pmt;
  const generated = (name) => foundry.utils.deepClone(globalThis.__pmtGenerated[name]);
  const BFFBuilder = () => game.modules.get("pathmuncher").api.BFFBuilder;

  /**
   * Imports a build and its companions as the importer does. resolve answers for a companion with no
   * character yet (default: a new one); each request is kept in asked. { pm, actor, bff, asked, prompts }
   */
  const importWithCompanions = async (t, exportJson, label, { actor = null, resolve = () => ({ create: true }) } = {}) => {
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const master = actor ?? await pmt.actor(t, label);
    const pm = await pmt.importBuild(master, exportJson);
    const promptsBefore = prompts.length;
    const asked = [];
    const bff = new (BFFBuilder())({
      pathmuncher: pm,
      master,
      resolveCompanionActor: (request) => {
        asked.push(request);
        return resolve(request);
      },
    });
    await bff.build();
    pm.importedPets = bff.imported.map((c) => c.pet);
    pm.bad.push(...bff.bad);
    return { pm, actor: master, bff, asked, companionPrompts: prompts.slice(promptsBefore) };
  };

  const names = (actor, type) => actor.items.filter((i) => i.type === type).map((i) => i.name).sort();
  const companionsOf = (master) => game.actors.filter((a) => a.getFlag("pathmuncher", "master")?.uuid === master.uuid);

  test("companions: an animal companion is made as a character from the build", async (t) => {
    const { pm, actor, bff, companionPrompts } = await importWithCompanions(t, generated("druid-01"), "companion made");
    const [companion] = companionsOf(actor);
    t.ok(companion, "a companion character");
    t.equal(companion.name, "Fang", "named as in Pathbuilder");
    t.equal(companion.level, actor.level, "at its master's level");
    t.equal(companion.ancestry?.name, "Wolf", "its animal");
    t.equal(companion.class?.name, "Animal Companion", "the companion class");
    const advances = names(companion, "feat").filter((n) => n.includes("Companion") || n === "Tracker");
    t.deepEqual(advances, ["Mature Animal Companion", "Savage Animal Companion", "Specialized Animal Companion", "Tracker"], "advanced as built");
    t.deepEqual(companionPrompts.map((p) => p.item), [], "nothing asked");
    t.equal(actor.getFlag("pathmuncher", "companions")?.["animal-companion-0"], companion.uuid, "linked from its master");
    t.equal(companion.folder?.name, "Companions", "in the companions folder");
    t.deepEqual(bff.bad, [], "nothing unmatched");
    t.equal(pm.getImportReport().find((g) => g.type === "pet"), undefined, "not listed as not imported");
  });

  test("companions: the next import updates the same companion and keeps what was added by hand", async (t) => {
    const first = await importWithCompanions(t, generated("druid-01"), "companion again");
    const [companion] = companionsOf(first.actor);
    await companion.createEmbeddedDocuments("Item", [{ name: "Chew Toy", type: "equipment" }]);
    const again = await importWithCompanions(t, generated("druid-01"), "", { actor: first.actor });
    t.equal(again.asked.length, 0, "not asked again");
    t.deepEqual(companionsOf(first.actor).map((a) => a.id), [companion.id], "the same character");
    const counts = {};
    for (const i of companion.items) counts[i.name] = (counts[i.name] ?? 0) + 1;
    t.deepEqual(Object.entries(counts).filter(([, n]) => n > 1), [], "nothing twice");
    t.ok(companion.items.some((i) => i.name === "Chew Toy"), "the item added by hand");
  });

  test("companions: a companion goes to the character picked for it", async (t) => {
    const spare = await pmt.actor(t, "companion spare");
    const { actor, asked } = await importWithCompanions(t, generated("druid-01"), "companion picked", {
      resolve: ({ candidates }) => ({ actor: candidates.find((a) => a.id === spare.id) }),
    });
    t.equal(asked.length, 1, "asked once");
    t.ok(asked[0].candidates.some((a) => a.id === spare.id), "the blank character offered");
    t.ok(!asked[0].candidates.some((a) => a.id === actor.id), "the master not offered");
    t.equal(spare.ancestry?.name, "Wolf", "built on it");
    t.equal(spare.getFlag("pathmuncher", "master")?.uuid, actor.uuid, "linked to its master");
  });

  test("companions: only characters no other player owns and not made for another class are offered", async (t) => {
    const player = await CONFIG.User.documentClass.create({ name: "PMTEST player", role: CONST.USER_ROLES.PLAYER });
    t.cleanup(() => game.users.get(player.id)?.delete());
    const master = await pmt.actor(t, "companion master");
    const blank = await pmt.actor(t, "companion blank");
    const theirs = await pmt.actor(t, "companion theirs", { ownership: { [player.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } });
    const fighter = await pmt.actor(t, "companion fighter");
    await fighter.createEmbeddedDocuments("Item", [{ name: "Fighter", type: "class", system: { slug: "fighter" } }]);
    const linked = await pmt.actor(t, "companion linked", { flags: { pathmuncher: { master: { uuid: "Actor.elsewhere", key: "animal-companion-0" } } } });
    const offered = BFFBuilder().candidates(master).map((a) => a.id);
    t.ok(offered.includes(blank.id), "a blank character");
    t.ok(!offered.includes(theirs.id), "not another player's");
    t.ok(!offered.includes(fighter.id), "not a fighter");
    t.ok(!offered.includes(linked.id), "not another's companion");
    t.ok(!offered.includes(master.id), "not the master");
  });

  test("companions: barding, a Nimble companion's specialization and two companions", async (t) => {
    const ranger = await importWithCompanions(t, generated("ranger-02"), "companion barding");
    const [bird] = companionsOf(ranger.actor);
    t.equal(bird?.name, "Kestrel", "the bird");
    t.ok(bird.itemTypes.armor.some((i) => i.name === "Light Barding" && i.isEquipped), "light barding worn");
    t.ok(bird.items.some((i) => i.name === "Nimble Animal Companion"), "Nimble");
    t.ok(bird.items.some((i) => i.name === "Ambusher"), "Ambusher");
    t.deepEqual(ranger.bff.bad, [], "nothing unmatched");

    // no build has two companions: the champion's horse, and a badger with the name Pathbuilder gives one not named
    const twoPets = generated("champion-02");
    twoPets.build.pets.push({
      type: "Animal Companion", name: "Young Badger", animal: "Badger", mature: false, incredible: false,
      incredibleType: "Nimble", specializations: [], armor: "Unarmored", equipment: [],
    });
    const champion = await importWithCompanions(t, twoPets, "companion pair");
    const pair = companionsOf(champion.actor).map((a) => `${a.name}: ${a.ancestry?.name}`).sort();
    t.deepEqual(pair, ["Bastion: Horse", `${champion.actor.name}'s Badger: Badger`], "each its own character");
  });

  test("companions: an animal the module doesn't have is in the import notes, with no character made", async (t) => {
    const exportJson = generated("druid-01");
    exportJson.build.pets[0].animal = "Unheard Of Beast";
    const { pm, actor } = await importWithCompanions(t, exportJson, "companion unknown");
    t.deepEqual(companionsOf(actor), [], "no character");
    const report = pm.getImportReport();
    t.deepEqual(report.find((g) => g.type === "companion")?.names, ["Unheard Of Beast (Fang - Savage Wolf)"], "the animal");
    t.deepEqual(report.find((g) => g.type === "pet")?.names, ["Fang - Savage Wolf (Animal Companion)"], "listed as not imported");
  });

  test("companions: the importer makes the companion, asking where it goes", async (t) => {
    const exportJson = generated("druid-01");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "companion importer");
    // a blank character to offer, so the dialog is shown
    await pmt.actor(t, "companion importer spare");
    let shown = false;
    const hook = Hooks.on("renderDialogV2", (dialog) => {
      if (dialog.options.classes?.includes("pathmuncher-companion-dialog")) shown = true;
    });
    t.cleanup(() => Hooks.off("renderDialogV2", hook));
    const state = await pmt.submitImporter(actor, { json: exportJson });
    t.ok(state.closed, "imported");
    t.ok(shown, "asked where the companion goes");
    t.deepEqual(companionsOf(actor).map((a) => a.name), ["Fang"], "a new character, as offered first");
  });
})();
