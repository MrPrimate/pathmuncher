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
  const importWithCompanions = async (t, exportJson, label, { actor = null, resolve = () => ({ create: true }), review = null } = {}) => {
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
      reviewEidolon: review,
    });
    await bff.build();
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
    // a horse can be small or medium, which Pathbuilder doesn't say: chosen, and listed to check
    const horse = companionsOf(champion.actor).find((a) => a.name === "Bastion");
    t.equal(horse.ancestry.flags.pf2e?.rulesSelections?.companionSize, "med", "the horse's size");
    t.deepEqual(champion.pm.getImportReport().find((g) => g.type === "companionChoice")?.names, ["Horse: Medium (Bastion)"], "listed to check");
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

  test("companions: a summoner's eidolon is made as a character, its choices made and noted", async (t) => {
    const first = await importWithCompanions(t, generated("summoner-02"), "eidolon made");
    const [eidolon] = companionsOf(first.actor);
    const unanswered = (actor) => [...actor.items].flatMap((i) => (i.system.rules ?? [])
      .filter((r) => r.key === "ChoiceSet" && r.flag && (i.flags.pf2e?.rulesSelections ?? {})[r.flag] === undefined)
      .map((r) => `${i.name}:${r.flag}`));
    const report = first.pm.getImportReport();
    t.ok(eidolon, "an eidolon");
    t.equal(eidolon.ancestry?.name, "Angel Eidolon", "its type");
    t.equal(eidolon.class?.name, "Eidolon", "the eidolon class");
    t.equal(eidolon.level, first.actor.level, "at its summoner's level");
    t.deepEqual(unanswered(eidolon), [], "every choice made");
    t.equal(BFFBuilder().selections(eidolon)["energy-heart-cc:damageChoice"], "cold", "Energy Heart as built");
    t.equal(report.find((g) => g.type === "pet"), undefined, "not listed as not imported");
    const guessed = report.find((g) => g.type === "companionChoice")?.names ?? [];
    t.ok(guessed.some((n) => n.startsWith("Eidolon Ability Boosts (5th): Constitution")), `the guessed choices listed: ${guessed.join("; ")}`);
    t.ok(!guessed.some((n) => n.startsWith("Energy Heart")), "not Energy Heart, which the build gives");
    t.ok(eidolon.items.some((i) => i.name === "Advanced Weaponry (CC)"), "the summoner's evolution feats, for the eidolon");

    const sorted = (actor) => Object.entries(BFFBuilder().selections(actor)).sort(([a], [b]) => a.localeCompare(b));
    const before = sorted(eidolon);
    const again = await importWithCompanions(t, generated("summoner-02"), "", { actor: first.actor });
    t.deepEqual(companionsOf(first.actor).map((a) => a.id), [eidolon.id], "the same character");
    t.deepEqual(sorted(eidolon), before, "the same choices");
    t.equal(again.pm.getImportReport().find((g) => g.type === "companionChoice"), undefined, "nothing guessed again");
  });

  test("companions: an elemental eidolon takes the element the build names", async (t) => {
    // Pathbuilder names it "Elemental Eidolon (Earth)"; the module has one Elemental Eidolon
    const { actor } = await importWithCompanions(t, generated("summoner-10"), "eidolon elemental");
    const [eidolon] = companionsOf(actor);
    t.equal(eidolon?.ancestry?.name, "Elemental Eidolon", "its type");
    t.ok(eidolon.items.some((i) => i.name === "Elemental Core (Earth)"), "its element");
    t.ok(eidolon.system.traits.value.includes("earth"), "with the element's trait");
  });

  test("companions: evolution feats the module names differently, and not an ancestry feat of the same name", async (t) => {
    const renamed = await importWithCompanions(t, generated("summoner-17"), "eidolon renamed feats");
    const [eidolon] = companionsOf(renamed.actor);
    t.ok(eidolon.items.some((i) => i.name === "Trample (CC)"), "Eidolon's Trample");
    t.ok(eidolon.items.some((i) => i.name === "Eidolon's Opportunity (CC)"), "Eidolon's Retort");
    // a centaur's Trample is an ancestry feat
    const centaur = await importWithCompanions(t, generated("summoner-08"), "eidolon centaur");
    const [dragon] = companionsOf(centaur.actor);
    t.ok(dragon && !dragon.items.some((i) => i.name === "Trample (CC)"), "not the centaur's Trample");
  });

  test("companions: a Summoner Dedication's eidolon, with the module's adjustment and the feat Basic Synergy gives", async (t) => {
    const { pm, actor, bff } = await importWithCompanions(t, generated("barbarian-03"), "eidolon dedication");
    const [eidolon] = companionsOf(actor);
    t.equal(eidolon?.ancestry?.name, "Beast Eidolon", "its type");
    t.equal(eidolon.level, actor.level, "at its summoner's level");
    t.ok(eidolon.items.some((i) => i.name === "Summoner Dedication Adjustment (CC)"), "the multiclass adjustment");
    t.ok(eidolon.items.some((i) => i.name === "Advanced Weaponry (CC)"), "Advanced Weaponry, from Basic Synergy");
    t.deepEqual(bff.bad.filter((b) => b.type === "companion"), [], "nothing unmatched");
    t.equal(pm.getImportReport().find((g) => g.type === "pet"), undefined, "not listed as not imported");
  });

  test("companions: a construct innovation's companion, advanced and modified as built", async (t) => {
    const { pm, actor, bff, companionPrompts } = await importWithCompanions(t, generated("inventor-02"), "construct made");
    const [construct] = companionsOf(actor);
    t.ok(construct, "a construct companion");
    // Pathbuilder exports no name for it
    t.equal(construct.name, `${actor.name}'s Prototype Construct`, "named after its master");
    t.equal(construct.ancestry?.name, "Prototype Construct", "the module's construct");
    t.equal(construct.class?.name, "Construct Companion", "the construct companion class");
    t.equal(construct.level, actor.level, "at its master's level");
    // by slug: a feat whose choice is made is named for it ("Advanced Construct (CC) (Medium)")
    const slugs = construct.itemTypes.feat.map((i) => i.slug).sort();
    const built = ["unarmed-strike-1", "unarmed-strike-2", "advanced-construct-cc", "incredible-construct-cc",
      "paragon-construct-cc", "projectile-launcher", "durable-construction", "flight-chassis"].sort();
    t.deepEqual(slugs, built, "its attacks, advancement and modifications, each once");
    // Pathbuilder's export has none of its choices, so the first import asks them
    const asked = companionPrompts.map((p) => p.item.replace(/ \(.*\)$/, "")).sort();
    t.deepEqual(asked, ["Advanced Construct", "Projectile Launcher", "Prototype Construct", "Unarmed Strike 2"], "its choices asked");
    t.deepEqual(bff.bad.filter((b) => b.type === "companion"), [], "nothing unmatched");
    t.equal(actor.getFlag("pathmuncher", "companions")?.["construct-companion-0"], construct.uuid, "linked from its master");
    const report = pm.getImportReport();
    t.equal(report.find((g) => g.type === "pet"), undefined, "not listed as not imported");
    t.equal(report.find((g) => g.type === "companionChoice"), undefined, "nothing guessed");

    // the next import gives the same answers without asking
    const sorted = (a) => Object.entries(BFFBuilder().selections(a)).sort(([x], [y]) => x.localeCompare(y));
    const before = sorted(construct);
    const again = await importWithCompanions(t, generated("inventor-02"), "", { actor });
    t.deepEqual(again.companionPrompts.map((p) => p.item), [], "nothing asked again");
    t.deepEqual(sorted(construct), before, "the same answers");
  });

  const api = () => game.modules.get("pathmuncher").api;
  const choiceIn = (choices, itemName, flag) => choices.find((c) => c.itemName === itemName && c.flag === flag);
  const option = (choice, label) => choice.options.find((o) => o.label === label);

  test("companions: the eidolon builder previews other choices and writes them", async (t) => {
    const { actor } = await importWithCompanions(t, generated("summoner-02"), "eidolon editor");
    const [eidolon] = companionsOf(actor);
    const editor = new (api().EidolonEditor)(eidolon);
    const choices = await editor.choices();
    t.deepEqual([...new Set(choices.map((c) => c.section))].sort(), ["attacks", "attributes", "boosts", "evolution", "type"], "in sections");

    const answers = editor.current;
    const key = choiceIn(choices, "Eidolon", "eidolonKAS");
    answers[key.key] = key.options.find((o) => o.value.type === "dexterity").value;
    const boost = choiceIn(choices, "Eidolon Ability Boosts (5th)", "abilityBoostOne");
    answers[boost.key] = option(boost, game.i18n.localize("PF2E.AbilityCha")).value;
    const before = { dex: eidolon.system.abilities.dex.mod, cha: eidolon.system.abilities.cha.mod };
    const preview = await editor.preview(answers);
    t.ok(preview.system.abilities.dex.mod > before.dex && preview.system.abilities.cha.mod > before.cha, "the preview has them");
    t.equal(eidolon.system.abilities.dex.mod, before.dex, "the eidolon doesn't, until they are written");
    const second = api().EidolonEditor.offered(choiceIn(choices, "Eidolon Ability Boosts (5th)", "abilityBoostTwo"), preview);
    t.deepEqual(second.options.filter((o) => !o.allowed).map((o) => o.label), [game.i18n.localize("PF2E.AbilityCha")], "a level's boosts are all different");

    await editor.apply(answers);
    t.equal(eidolon.system.abilities.dex.mod, preview.system.abilities.dex.mod, "written: Dexterity");
    t.equal(eidolon.system.abilities.cha.mod, preview.system.abilities.cha.mod, "written: Charisma");
    t.ok(eidolon.items.some((i) => i.name === "Charisma Boost" && i.flags.pf2e?.grantedBy?.id === boost.itemId), "the boost granted is the one picked");

    // the next import builds it again with these choices, nothing twice
    await importWithCompanions(t, generated("summoner-02"), "", { actor });
    const [again] = companionsOf(actor);
    t.equal(again.system.abilities.cha.mod, preview.system.abilities.cha.mod, "kept by the next import");
    t.equal(again.items.filter((i) => i.name.endsWith(" Boost")).length, 16, "four boosts at each of four levels");
  });

  test("companions: the eidolon builder shows the choices and the stat block, and builds", async (t) => {
    const { actor } = await importWithCompanions(t, generated("summoner-02"), "eidolon builder");
    const [eidolon] = companionsOf(actor);
    const shown = new Promise((resolve) => {
      Hooks.once("renderEidolonBuilderApp", (app) => resolve(app));
    });
    const closed = api().EidolonBuilderApp.review({ eidolon });
    const app = await shown;
    t.ok(app.element.querySelectorAll("select[data-choice]").length >= 20, "a choice for each");
    const feats = [...app.element.querySelectorAll(".pathmuncher-eidolon-feats li")];
    t.ok(feats.some((li) => li.innerText.startsWith("Hulking Size") && li.dataset.tooltip?.length > 20), "the evolution feats, described on hover");
    t.ok(feats.find((li) => li.innerText.startsWith("Hulking Size"))?.innerText.includes("12"), "with the level the summoner took them at");
    // Hulking Size makes it Large, whichever size is picked
    t.ok(app.element.querySelector(".pathmuncher-eidolon-note")?.innerText.includes("Hulking Size"), "the size choice says what overrides it");

    const statText = () => app.element.querySelector(".pathmuncher-eidolon-attributes").innerText;
    const before = statText();
    const rendered = new Promise((resolve) => {
      Hooks.once("renderEidolonBuilderApp", resolve);
    });
    const select = [...app.element.querySelectorAll("select[data-choice]")]
      .find((s) => s.closest(".pathmuncher-eidolon-section")?.dataset.section === "attributes");
    select.value = [...select.options].find((o) => o.textContent.trim() === game.i18n.localize("PF2E.AbilityDex")).value;
    select.dispatchEvent(new Event("change"));
    await rendered;
    t.ok(statText() !== before, "the stat block updates");

    const dex = eidolon.system.abilities.dex.mod;
    app.element.querySelector("button[type='submit']").click();
    t.equal(await closed, true, "built");
    t.ok(eidolon.system.abilities.dex.mod > dex, "with the choice made");
  });

  test("companions: an eidolon whose choices are made in the builder has none listed to check", async (t) => {
    const reviewed = [];
    const { pm } = await importWithCompanions(t, generated("summoner-02"), "eidolon reviewed", {
      review: ({ eidolon, guessed }) => {
        reviewed.push({ eidolon: eidolon.name, guessed: guessed.length });
        return true;
      },
    });
    t.equal(reviewed.length, 1, "the builder asked");
    t.ok(reviewed[0].guessed > 0, "with the guesses to start from");
    t.equal(pm.getImportReport().find((g) => g.type === "companionChoice"), undefined, "none listed");
  });

  test("companions: the importer opens the eidolon builder once the eidolon is made", async (t) => {
    const exportJson = generated("summoner-02");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "eidolon importer");
    let opened = 0;
    const hook = Hooks.on("renderEidolonBuilderApp", () => opened++);
    t.cleanup(() => Hooks.off("renderEidolonBuilderApp", hook));
    const state = await pmt.submitImporter(actor, { json: exportJson });
    t.ok(state.closed, "imported");
    t.ok(opened > 0, "the builder opened");
    t.equal(companionsOf(actor)[0]?.class?.name, "Eidolon", "the eidolon made");
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
