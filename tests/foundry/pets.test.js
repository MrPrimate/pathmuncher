// Familiars and other pets: what the importer makes of a build's familiars, and what it reports.
(() => {
  const { test } = pmt;
  const generated = (name) => foundry.utils.deepClone(globalThis.__pmtGenerated[name]);

  /** Imports a build as the importer does, familiars included. { pm, petShop, familiars } */
  const importWithPets = async (t, exportJson, label) => {
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, label);
    const pm = await pmt.importBuild(actor, exportJson);
    const petShop = new (game.modules.get("pathmuncher").api.PetShop)({ type: "familiar", parent: actor, pathbuilderJson: pm.source });
    await petShop.processPets();
    await petShop.addPetEffects();
    pm.bad.push(...petShop.unmatched);
    const familiars = game.actors.filter((a) => a.type === "familiar" && a.system.master?.id === actor.id);
    if (!pmt.keep) {
      t.cleanup(async () => {
        for (const f of familiars) await game.actors.get(f.id)?.delete();
      });
    }
    return { pm, petShop, familiars };
  };

  const selection = (actor, name, flag) => actor.items.find((i) => i.name.startsWith(name))?.flags?.[game.system.id]?.rulesSelections?.[flag];

  test("pets: a familiar comes with its nickname and abilities, master abilities included", async (t) => {
    const { petShop, familiars } = await importWithPets(t, generated("witch-09"), "familiar");
    t.equal(familiars.length, 1, "one familiar");
    t.equal(familiars[0]?.name, "Omen", "named for its nickname");
    const abilities = ["Darkvision", "Flier", "Independent", "Lifelink", "Manual Dexterity", "Speech"];
    t.deepEqual(familiars[0]?.items.map((i) => i.name).sort(), abilities, "abilities");
    t.deepEqual(petShop.unmatched, [], "nothing unmatched");
  });

  test("pets: an ability named with its option takes that option", async (t) => {
    const wizard = await importWithPets(t, generated("wizard-02"), "familiar choice");
    t.equal(selection(wizard.familiars[0], "Damage Avoidance", "save"), "reflex", "Damage Avoidance (Reflex)");
    t.deepEqual(wizard.petShop.unmatched, [], "nothing unmatched");
    const druid = await importWithPets(t, generated("druid-02"), "familiar speed");
    t.equal(selection(druid.familiars[0], "Fast Movement", "speed"), "land", "Fast Movement (Land)");
  });

  test("pets: familiar abilities that match nothing are in the import notes", async (t) => {
    const exportJson = generated("witch-09");
    exportJson.build.familiars[0].abilities.push("Unheard Of Ability");
    const { pm } = await importWithPets(t, exportJson, "familiar miss");
    t.deepEqual(pm.getImportReport().find((g) => g.type === "familiar")?.names, ["Unheard Of Ability (Omen)"], "listed with its familiar");
  });

  test("pets: animal companions and mounts are listed as not imported", async (t) => {
    const druid = generated("druid-01");
    await pmt.useBuildVariants(t, druid.build);
    pmt.answerPrompts(t, druid.build);
    const pm = await pmt.importBuild(await pmt.actor(t, "companion"), druid);
    t.deepEqual(pm.getImportReport().find((g) => g.type === "pet")?.names, ["Fang - Savage Wolf (Animal Companion)"], "the companion");
    const familiar = generated("witch-09");
    await pmt.useBuildVariants(t, familiar.build);
    const pm2 = await pmt.importBuild(await pmt.actor(t, "familiar only"), familiar);
    t.equal(pm2.getImportReport().find((g) => g.type === "pet"), undefined, "a familiar is not listed");
  });
})();
