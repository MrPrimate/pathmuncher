// Processing details: unmatched containers, the deep-dive setting, choices, prepared slots.
(() => {
  const { test } = pmt;
  const fixture = (name) => foundry.utils.deepClone(pmt.fixtures[name]);
  const edge = (name) => foundry.utils.deepClone(globalThis.__pmtEdge[name]);

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
    const exportJson = edge("cleric-03");
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
    const exportJson = edge("cleric-01");
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
    const exportJson = edge("champion-02");
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
      const exportJson = edge(name);
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
    const exportJson = edge("commander-02");
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
    const exportJson = edge("rogue-02");
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "mastermind");

    await pmt.importBuild(actor, exportJson);

    t.deepEqual(prompts.map((p) => p.item).filter((item) => item === "Mastermind"), [], "Mastermind prompts");
    t.equal(actor.items.find((i) => i.slug === "mastermind").flags.pf2e.rulesSelections.mastermind, "system.skills.nature.rank");
  });

  test("processing: a skill choice the proficiencies cannot settle is still prompted", async (t) => {
    // with neither skill trained, nothing says which one the class granted
    const exportJson = fixture("477013-fighter4-archer");
    exportJson.build.proficiencies.athletics = 0;
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

  test("processing: a rule the system's code fails on is left to the system and reported", async (t) => {
    // pf2e's ChoiceSet code throws for Grim Fascination while pathmuncher works out its choice
    const exportJson = fixture("jack-necromancer9");
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "failed rule");
    const ChoiceSet = game.pf2e.RuleElements.all.ChoiceSet;
    const inflateChoices = ChoiceSet.prototype.inflateChoices;
    ChoiceSet.prototype.inflateChoices = function (...args) {
      if (this.item?.slug === "grim-fascination") throw new Error("PMTEST rule failure");
      return inflateChoices.apply(this, args);
    };
    t.cleanup(() => {
      ChoiceSet.prototype.inflateChoices = inflateChoices;
    });

    const pm = new (game.modules.get("pathmuncher").api.Pathmuncher)(actor, {});
    pm.source = foundry.utils.deepClone(exportJson.build);
    t.ok(await pm.processCharacter(), "processed");
    // the system's own prompt, when the item is created, works as normal
    // eslint-disable-next-line require-atomic-updates
    ChoiceSet.prototype.inflateChoices = inflateChoices;
    await pm.updateActor();

    t.deepEqual(pm.getImportReport().find((g) => g.type === "rule")?.names, ["Grim Fascination"], "reported");
    t.ok(prompts.some((p) => p.item === "Grim Fascination"), "the system asked for the choice");
    t.ok(actor.items.some((i) => i.slug === "grim-fascination"), "Grim Fascination on the actor");
  });

  test("processing: an Adventurer's Pack is a backpack holding its contents", async (t) => {
    const exportJson = fixture("304883-thaumaturge1");
    exportJson.build.equipment.push(["Adventurer's Pack", 1]);
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "adventurers pack");

    const pm = await pmt.importBuild(actor, exportJson);

    // the build has its own bedroll, torch and waterskin; chalk is only in the pack
    const pack = actor.itemTypes.backpack.find((b) => b.contents.some((i) => i.slug === "chalk"));
    t.ok(pack, "a backpack with chalk in it");
    t.deepEqual(pack.contents.map((i) => `${i.slug} ${i.quantity}`).sort(), [
      "bedroll 1", "chalk 10", "flint-and-steel 1", "rations 14", "rope 1", "torch 5", "waterskin 1",
    ], "contents");
    t.ok(!pm.getImportReport().some((g) => g.names.includes("Adventurer's Pack")), "not reported");
  });

  test("processing: an Adventurer's Pack without a backpack to put it in is reported, not fatal", async (t) => {
    // as on sf2e, whose equipment has no backpack
    const plain = fixture("304883-thaumaturge1");
    const exportJson = fixture("304883-thaumaturge1");
    exportJson.build.equipment.push(["Adventurer's Pack", 1]);
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const without = await pmt.actor(t, "no pack");
    await pmt.importBuild(without, plain);
    const actor = await pmt.actor(t, "no backpack");
    const pack = game.packs.get("pf2e.equipment-srd");
    const getIndex = pack.getIndex;
    pack.getIndex = async function (...args) {
      return (await getIndex.apply(this, args)).filter((i) => i.system?.slug !== "backpack");
    };
    t.cleanup(() => {
      pack.getIndex = getIndex;
    });

    const pm = await pmt.importBuild(actor, exportJson);

    t.ok(pm.getImportReport().find((g) => g.type === "equipment")?.names.includes("Adventurer's Pack"), "reported");
    // the build lists the pack's contents as well, so nothing is added for the pack itself; the
    // build's own Backpack can't be found either while the index hides it
    const keys = (a) => pmt.itemKeys(a).filter((key) => !key.startsWith("backpack:"));
    t.deepEqual(keys(actor), keys(without), "items");
  });

  // a surki champion whose ancestry feats' choices are not in the export, following a deity that
  // allows the build's unholy cause, so the deity and cause need no answers
  const surkiChampion = () => {
    const exportJson = edge("champion-01");
    exportJson.build.deity = "Asmodeus";
    return exportJson;
  };
  const selection = (actor, name, flag) => actor.items.find((i) => i.name.startsWith(name))?.flags.pf2e.rulesSelections[flag];

  test("processing: a choice of items the build carries one of is not prompted", async (t) => {
    const exportJson = surkiChampion();
    exportJson.build.weapons.push({ name: "Battle Axe", qty: 1, prof: "martial", die: "d8", pot: 0, str: "", mat: null,
      display: "Battle Axe", runes: [], damageType: "S", attack: 0, damageBonus: 0, extraDamage: [], increasedDice: false });
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "carried weapon choice");

    await pmt.importBuild(actor, exportJson);

    t.deepEqual(prompts.map((p) => p.item).filter((item) => item === "Surki Weapon Familiarity"), [], "weapon prompts");
    t.equal(selection(actor, "Surki Weapon Familiarity", "weapon"), "battle-axe", "weapon");
    // the champion's sanctification comes from the cause, under the flag the system reads it from
    t.equal(selection(actor, "Deity (Champion)", "sanctification"), "unholy", "sanctification");
    t.ok(actor.system.traits.value.includes("unholy"), "unholy trait");
  });

  test("processing: choices the build doesn't answer are asked together after processing", async (t) => {
    const exportJson = surkiChampion();
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "unanswered choices");
    let asked = [];
    const resolveUnansweredChoices = (unanswered) => {
      asked = unanswered;
      const answer = { "Surki Weapon Familiarity": "battle-axe", "Grand Metamorphosis": "digging-wedge" };
      return Object.fromEntries(unanswered.map((u) => [u.id, answer[u.item.name]]).filter(([, value]) => value));
    };

    await pmt.importBuild(actor, exportJson, { resolveUnansweredChoices });

    t.deepEqual(asked.map((u) => u.item.name).sort(), ["Grand Metamorphosis", "Surki Weapon Familiarity"], "asked");
    t.ok(asked.find((u) => u.item.name === "Surki Weapon Familiarity").choices.some((c) => c.value === "battle-axe" && c.uuid), "options name their items");
    t.deepEqual(prompts.map((p) => p.item).filter((item) => ["Surki Weapon Familiarity", "Grand Metamorphosis"].includes(item)), [], "prompts");
    t.equal(selection(actor, "Surki Weapon Familiarity", "weapon"), "battle-axe", "weapon");
    t.equal(selection(actor, "Grand Metamorphosis", "evolution"), "digging-wedge", "evolution");
  });
  // imports a generated build, answering nothing, and returns the actor and the names of the items asked about
  const importGenerated = async (t, name) => {
    const exportJson = foundry.utils.deepClone(globalThis.__pmtGenerated[name]);
    await pmt.useBuildVariants(t, exportJson.build);
    const prompts = pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, `choices ${name}`);
    const asked = [];
    await pmt.importBuild(actor, exportJson, {
      resolveUnansweredChoices: (unanswered) => {
        asked.push(...unanswered.map((u) => u.item.name));
        return {};
      },
    });
    return { actor, asked, prompts: prompts.map((p) => p.item) };
  };

  test("processing: a choice that only trains a skill takes a skill the build has trained", async (t) => {
    // the Fighter's class skill is Acrobatics or Athletics, and this build has both trained; the
    // Mastermind's racket offers four skills to train, three of them trained. Any one gives the same character.
    for (const [name, item, flag, offered] of [
      ["fighter-01", "Fighter", "fighterSkill", ["acrobatics", "athletics"]],
      ["rogue-02", "Mastermind", "mastermind", null],
    ]) {
      const { actor, asked, prompts } = await importGenerated(t, name);
      t.deepEqual([...asked, ...prompts].filter((n) => n === item), [], `${name}: ${item} not asked`);
      const picked = selection(actor, item, flag);
      t.ok(picked && (!offered || offered.includes(picked)), `${name}: ${item} ${flag} is ${JSON.stringify(picked)}`);
    }
  });

  test("processing: a choice Pathbuilder records by its option's label is answered", async (t) => {
    // Boost Modulation's damage types are listed as specials named for the labels, "Ignition (Fire)"
    const { actor, asked, prompts } = await importGenerated(t, "inventor-02");
    t.deepEqual([...asked, ...prompts].filter((n) => n === "Boost Modulation"), [], "not asked");
    const picked = actor.items.find((i) => i.name.startsWith("Boost Modulation"))?.flags.pf2e.rulesSelections ?? {};
    t.deepEqual([picked.boostModulationFirst, picked.boostModulationSecond].sort(), ["acid", "fire"], "fire and acid");
  });

  test("processing: a special listed again after its feat can answer a choice", async (t) => {
    // an automaton's Lesser Augmentation enhances its Magical Resistance feat, and Pathbuilder
    // lists "Magical Resistance" again for it, after the ancestry feat of that name
    const { actor, asked, prompts } = await importGenerated(t, "gunslinger-04");
    t.deepEqual([...asked, ...prompts].filter((n) => n === "Lesser Augmentation"), [], "not asked");
    const augmentation = actor.items.find((i) => i.name.startsWith("Lesser Augmentation"));
    t.equal(augmentation?.name, "Lesser Augmentation (Magical Resistance)", "the enhancement chosen");
    t.equal(augmentation?.flags.pf2e.rulesSelections.lesserAugmentation, "all", "its extra resistances");
    t.ok(actor.items.some((i) => i.name.startsWith("Magical Resistance")), "the feat is still there");
  });

  test("processing: each choice asked comes with what its item is and where the build took it", async (t) => {
    const exportJson = foundry.utils.deepClone(globalThis.__pmtGenerated["summoner-02"]);
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    let asked = [];
    await pmt.importBuild(await pmt.actor(t, "choice details"), exportJson, {
      resolveUnansweredChoices: (unanswered) => {
        asked = unanswered;
        return {};
      },
    });
    const combatant = asked.find((u) => u.item.name === "Ranged Combatant");
    t.ok(combatant, "Ranged Combatant asked");
    const { level, category, slot } = combatant.details;
    t.deepEqual({ level, category, slot }, { level: 2, category: "class", slot: { type: "Summoner Evolution Feat", level: 14 } }, "its level, and where it was taken");
    t.ok(combatant.details.traits.includes("evolution"), "its traits");
    t.ok(combatant.details.description.length > 0, "its description");

    // the dialog shows them, the description in a box of its own
    const { UnansweredChoicesDialog } = await import("/modules/pathmuncher/src/app/UnansweredChoicesDialog.js");
    const shown = new Promise((resolve) => {
      const hook = Hooks.on("renderDialogV2", (dialog) => {
        if (!dialog.options.classes?.includes("pathmuncher-unanswered-choices-dialog")) return;
        Hooks.off("renderDialogV2", hook);
        const row = dialog.element.querySelector(".pathmuncher-unanswered");
        resolve({
          meta: row.querySelector(".pathmuncher-choice-meta")?.innerText ?? "",
          slot: row.innerText.includes("Summoner Evolution Feat"),
          description: row.querySelector(".pathmuncher-choice-description")?.innerText ?? "",
        });
        setTimeout(() => dialog.element.querySelector("button[data-action='cancel']")?.click(), 20);
      });
    });
    const answered = UnansweredChoicesDialog.choose([combatant]);
    const row = await shown;
    await answered;
    t.ok(row.meta.includes("2"), `the feat's level: ${row.meta}`);
    t.ok(row.slot, "the Pathbuilder slot");
    t.ok(row.description.length > 50, "the description");
  });

  /** Each Assurance on the actor with the skill it took. */
  const assurances = (actor) => actor.items.filter((i) => i.slug === "assurance")
    .map((i) => ({ grantedBy: actor.items.get(i.flags.pf2e?.grantedBy?.id)?.name ?? null, skill: i.flags.pf2e?.rulesSelections?.assurance ?? null }));

  test("processing: a second Assurance never takes a skill another Assurance has", async (t) => {
    // the Scholar (Occultism) background grants Assurance (Occultism); Gnome Obsession grants another,
    // which takes Religion: the only other skill the build is trained in
    const exportJson = edge("oracle-11");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "assurance twice");

    await pmt.importBuild(actor, exportJson);

    const skills = assurances(actor).map((a) => a.skill);
    t.equal(skills.length, 2, "Assurances");
    t.ok(skills.every(Boolean), `every Assurance has a skill: ${JSON.stringify(assurances(actor))}`);
    t.deepEqual([...skills].sort(), ["occultism", "religion"], "skills");
  });

  test("processing: an Assurance the build doesn't settle is asked with where it comes from and what is taken", async (t) => {
    // trained in Religion and Society besides Occultism, so the build leaves the skill open
    const exportJson = edge("oracle-11");
    exportJson.build.proficiencies.society = 2;
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "assurance asked");
    let asked = [];
    const resolveUnansweredChoices = (unanswered) => {
      asked = unanswered;
      const assurance = unanswered.find((u) => u.item.name === "Assurance");
      return assurance ? { [assurance.id]: "society" } : {};
    };

    await pmt.importBuild(actor, exportJson, { resolveUnansweredChoices });

    const entry = asked.find((u) => u.item.name === "Assurance");
    t.ok(entry, `Assurance asked: ${JSON.stringify(asked.map((u) => u.item.name))}`);
    t.equal(entry.origin, "Gnome Obsession", "where it comes from");
    t.deepEqual(entry.taken, [{ label: "Occultism", source: "Scholar" }], "skills already taken");
    t.ok(!entry.choices.some((c) => c.value === "occultism"), "a taken skill is not offered");
    t.deepEqual(assurances(actor).map((a) => a.skill).sort(), ["occultism", "society"], "skills");
  });

  test("processing: the languages the ancestry grants are not listed again as the character's own", async (t) => {
    // the Elf magus's export lists Common and Elven, which the ancestry gives it, among its languages
    const exportJson = fixture("315329-magus9");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "languages");

    await pmt.importBuild(actor, exportJson);

    const own = actor._source.system.details.languages.value;
    t.ok(!own.includes("common") && !own.includes("elven"), `own languages: ${own.join(", ")}`);
    t.ok(own.includes("aklo"), "the build's other languages");
    t.ok(["common", "elven", "aklo"].every((l) => actor.system.details.languages.value.includes(l)), "all known");
  });

  test("processing: a feat taken in a slot is its own copy, not one a background grants", async (t) => {
    // Pathbuilder's placeholder Raised by Belief grants nothing; pf2e's grants an Assurance for the
    // deity's skill, which the build (no deity) doesn't settle. The skill feat Assurance is Athletics.
    const exportJson = foundry.utils.deepClone(globalThis.__pmtGenerated["rogue-05"]);
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "assurance from background");
    let asked = [];
    const resolveUnansweredChoices = (unanswered) => {
      asked = unanswered;
      const assurance = unanswered.find((u) => u.item.name === "Assurance");
      return assurance ? { [assurance.id]: "religion" } : {};
    };

    await pmt.importBuild(actor, exportJson, { resolveUnansweredChoices });

    const own = actor.items.find((i) => i.slug === "assurance" && i.system.location === "skill-12");
    t.equal(own?.flags.pf2e?.rulesSelections?.assurance, "athletics", "the skill feat keeps its skill");
    const entry = asked.find((u) => u.item.name === "Assurance");
    t.equal(entry?.origin, "Raised by Belief", "the background's copy is asked, with where it comes from");
    t.deepEqual(entry?.taken.map((x) => x.label), ["Athletics"], "the skill feat's skill is taken");
    t.ok(!entry?.choices.some((c) => c.value === "athletics"), "and not offered");
    t.deepEqual(assurances(actor).map((a) => a.skill).sort(), ["athletics", "religion"], "skills");
  });

  // Pathbuilder's "Bullets (10 rounds)" where each firearm in Foundry takes its own rounds; the
  // gunslinger's Axe Musket and Coat Pistol take Rounds (Axe Musket) and Rounds (Coat Pistol)
  const withBullets = (weapons = null) => {
    const exportJson = fixture("314710-gunslinger1");
    exportJson.build.equipment.push(["Bullets (10 rounds)", 10, "Invested"]);
    if (weapons) exportJson.build.weapons = exportJson.build.weapons.filter((w) => weapons.includes(w.name));
    return exportJson;
  };
  const ammunition = (actor) => Object.fromEntries(actor.itemTypes.ammo.map((i) => [i.name, i.quantity]));
  const unmatchedEquipment = (pm) => pm.getImportReport().find((g) => g.type === "equipment")?.names ?? [];

  test("processing: ammunition Pathbuilder lists once becomes the rounds of the build's only gun", async (t) => {
    const exportJson = withBullets(["Coat Pistol"]);
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "one gun's rounds");
    let asked = false;

    const pm = await pmt.importBuild(actor, exportJson, {
      resolveAmmunition: () => {
        asked = true;
        return [];
      },
    });

    t.equal(asked, false, "not asked");
    t.deepEqual(ammunition(actor), { "Rounds (Coat Pistol)": 10 }, "ammunition");
    t.deepEqual(unmatchedEquipment(pm), [], "not reported");
  });

  test("processing: ammunition for several guns is shared out as the user says", async (t) => {
    const exportJson = withBullets();
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "shared rounds");
    let asked = null;
    const resolveAmmunition = (request) => {
      asked = request;
      return [
        { source: "0", target: "rounds-axe-musket", qty: 6 },
        { source: "0", target: "rounds-coat-pistol", qty: 4 },
        { source: null, target: "rounds-coat-pistol", qty: 10 },
      ];
    };

    const pm = await pmt.importBuild(actor, exportJson, { resolveAmmunition });

    t.deepEqual(asked.stacks, [{ id: "0", name: "Bullets (10 rounds)", qty: 10 }], "stacks offered");
    const offered = asked.targets.map((target) => `${target.weapons.map((w) => w.name).join()}: ${target.name}`).sort();
    t.deepEqual(offered, ["Axe Musket: Rounds (Axe Musket)", "Coat Pistol: Rounds (Coat Pistol)"], "weapons offered");
    t.deepEqual(ammunition(actor), { "Rounds (Axe Musket)": 6, "Rounds (Coat Pistol)": 14 }, "ammunition");
    t.deepEqual(unmatchedEquipment(pm), [], "not reported");
  });

  test("processing: ammunition not given to a gun is reported, and cancelling the dialog cancels the import", async (t) => {
    const exportJson = withBullets();
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "unshared rounds");

    const pm = await pmt.importBuild(actor, exportJson);

    t.deepEqual(ammunition(actor), {}, "no ammunition without a way to ask");
    t.ok(unmatchedEquipment(pm).includes("Bullets (10 rounds)"), "reported");

    const cancelled = new (game.modules.get("pathmuncher").api.Pathmuncher)(actor, { resolveAmmunition: () => null });
    cancelled.source = game.modules.get("pathmuncher").api.Pathmuncher.getBuildFromJson(withBullets());
    t.equal(await cancelled.processCharacter(), false, "cancelled");
  });

  // Wildspell Dedication gives Spellsurge "of your main casting tradition"; Pathbuilder lists it under
  // no tradition (focus.Unassigned)
  const WILDSPELL_KEY = "wildspell-dedication>spellsurge#tradition";
  const spellsurgeEntry = (actor) => actor.items.get(actor.itemTypes.spell.find((s) => s.slug === "spellsurge")?.system.location.value);
  /** The mythic sorcerer with its spellcasting not the class's, so it has no main casting tradition. */
  const withoutClassCasting = ({ mythicMagic = true } = {}) => {
    const exportJson = fixture("mythic-sorcerer12");
    const { build } = exportJson;
    build.spellCasters.find((c) => c.name === "Sorcerer").name = "PMTEST Spellcasting";
    if (!mythicMagic) build.spellCasters = build.spellCasters.filter((c) => c.name !== "Mythic Magic");
    return exportJson;
  };
  /** Answers the choices dialog's main tradition question with answer, noting what it offered. */
  const answerTradition = (answer, asked) => (unanswered) => {
    const entry = unanswered.find((e) => e.item.name === "Wildspell Dedication");
    if (entry) asked.push(entry.choices.map((c) => c.value));
    return entry && answer ? { [entry.id]: answer } : {};
  };

  test("processing: a focus spell of the main casting tradition is of the class's tradition", async (t) => {
    const exportJson = fixture("mythic-sorcerer12");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "main tradition class");
    const asked = [];

    await pmt.importBuild(actor, exportJson, { resolveUnansweredChoices: answerTradition(null, asked) });

    t.deepEqual(asked, [], "not asked");
    t.equal(spellsurgeEntry(actor)?.name, "Occult Focus Tradition", "Spellsurge with the sorcerer's focus spells");
    t.equal(actor.itemTypes.spellcastingEntry.filter((e) => e.system.prepared.value === "focus").length, 1, "focus entries");
  });

  test("processing: without a class tradition, the main casting tradition is asked and remembered", async (t) => {
    const exportJson = withoutClassCasting();
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "main tradition asked");
    const asked = [];

    const pm = await pmt.importBuild(actor, exportJson, { resolveUnansweredChoices: answerTradition("arcane", asked) });

    t.deepEqual(asked, [["occult", "arcane"]], "the build's traditions offered");
    const entry = spellsurgeEntry(actor);
    t.deepEqual([entry?.system.tradition.value, entry?.system.prepared.value, entry?.system.ability.value], ["arcane", "focus", "cha"], "Spellsurge's entry");
    t.equal(pm.openChoices.find((c) => c.key === WILDSPELL_KEY)?.answer, "arcane", "answer kept for the next import");

    // the next import gives the answer again
    const again = [];
    await pmt.importBuild(actor, withoutClassCasting(), { choiceAnswers: { [WILDSPELL_KEY]: "occult" }, resolveUnansweredChoices: answerTradition(null, again) });
    t.deepEqual(again, [], "not asked again");
    t.equal(spellsurgeEntry(actor)?.system.tradition.value, "occult", "the remembered tradition");
  });

  test("processing: a main casting tradition left unchosen is reported, and a single tradition isn't asked", async (t) => {
    const exportJson = withoutClassCasting();
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "main tradition skipped");

    const pm = await pmt.importBuild(actor, exportJson, { resolveUnansweredChoices: answerTradition(null, []) });

    t.equal(spellsurgeEntry(actor), undefined, "Spellsurge not imported");
    t.deepEqual(pm.getImportReport().find((g) => g.type === "spell")?.names, ["Spellsurge (Wildspell Dedication)"], "reported");

    const single = withoutClassCasting({ mythicMagic: false });
    const asked = [];
    await pmt.importBuild(actor, single, { resolveUnansweredChoices: answerTradition("occult", asked) });
    t.deepEqual(asked, [], "one tradition: not asked");
    t.equal(spellsurgeEntry(actor)?.name, "Occult Focus Tradition", "the build's only tradition");
  });
})();
