// Starfinder 2e imports. Only registered in an sf2e world: run them there with the filter "sf2e".
(() => {
  if (game.system.id !== "sf2e") return;
  const { test } = pmt;

  /**
   * A Starbuilder export, as Pathbuilder makes them for Starfinder, of one of the system's iconics or
   * pregenerated characters with the gear given. Weapons are given by name.
   */
  const starbuilder = ({ name, className, level = 1, ancestry, heritage, background, weapons = [], equipment = [] }) => ({
    success: true,
    build: {
      name, class: className, dualClass: null, level, xp: 0, ancestry, heritage, background,
      alignment: "N", gender: "Not set", age: "Not set", deity: "Not set", size: 2, sizeName: "Medium", keyability: "dex",
      languages: [], rituals: [], resistances: [], inventorMods: [],
      abilities: { str: 10, dex: 18, con: 12, int: 10, wis: 14, cha: 12, breakdown: { ancestryFree: [], ancestryBoosts: [], ancestryFlaws: [], backgroundBoosts: [], classBoosts: [], mapLevelledBoosts: {} } },
      attributes: { ancestryhp: 8, classhp: 8, bonushp: 0, bonushpPerLevel: 0, speed: 25, speedBonus: 0 },
      proficiencies: {}, mods: {}, feats: [], specials: [], lores: [], equipmentContainers: {}, equipment,
      specificProficiencies: { trained: [], expert: [], master: [], legendary: [] },
      weapons: weapons.map((weapon) => ({
        name: weapon, qty: 1, prof: "simple", die: "", pot: 0, str: "", mat: null, display: weapon, runes: [],
        damageType: "P", attack: 0, damageBonus: 0, extraDamage: [], increasedDice: false, isInventor: false, grade: "",
      })),
      money: { cp: 0, sp: 0, gp: 0, pp: 0 }, armor: [], spellCasters: [], focusPoints: 0, focus: {}, formula: [],
      acTotal: {}, pets: [], familiars: [],
    },
  });

  /** Each ammunition item on the actor: name, quantity, uses and material. */
  const ammunition = (actor) => actor.itemTypes.ammo.map((i) => {
    const material = i.system.material?.type ? ` ${i.system.material.type}/${i.system.material.grade}` : "";
    return `${i.name} x${i.quantity} ${i.uses.value}/${i.uses.max}${material}`;
  }).sort();
  const unmatchedEquipment = (pm) => pm.getImportReport().find((g) => g.type === "equipment")?.names ?? [];

  const importStarbuilder = async (t, label, exportJson, options = {}) => {
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, label);
    const pm = await pmt.importBuild(actor, exportJson, options);
    return { actor, pm };
  };

  test("sf2e: a battery is one battery holding the charges Pathbuilder counts", async (t) => {
    // Chk Chk's arc pistol and the battery for it
    const exportJson = starbuilder({
      name: "Chk Chk", className: "Mystic", ancestry: "Shirren", heritage: "Defiant Shirren", background: "Disciple",
      weapons: ["Arc Pistol"], equipment: [["Battery, Commercial", 10]],
    });

    const { actor, pm } = await importStarbuilder(t, "sf2e battery", exportJson);

    t.deepEqual(ammunition(actor), ["Battery (Commercial) x1 10/10"], "ammunition");
    t.deepEqual(unmatchedEquipment(pm), [], "not reported");
  });

  test("sf2e: batteries, chem tanks and projectile ammo keep their charges, counts and materials", async (t) => {
    // Navasi's pistols and Vorza's zero pistol, with a part-used battery, more charges than one
    // battery holds, and precious-material rounds
    const exportJson = starbuilder({
      name: "Navasi", className: "Envoy", level: 5, ancestry: "Human", heritage: "Skilled Human", background: "Outlaw",
      weapons: ["Semi-Auto Pistol", "Laser Pistol", "Zero Pistol"],
      equipment: [
        ["Projectile Ammo", 20],
        ["Battery, Commercial", 4],
        ["Battery, Tactical", 45],
        ["Chem Tank, Commercial", 8],
        ["Projectile Ammo (Silver)", 10],
        ["Projectile Ammo (Cold Iron, Standard-Grade)", 10],
      ],
    });
    let asked = false;

    const { actor, pm } = await importStarbuilder(t, "sf2e ammunition", exportJson, { resolveAmmunition: () => (asked = true) && [] });

    t.equal(asked, false, "ammunition shared by every weapon of its kind is not asked about");
    t.deepEqual(ammunition(actor), [
      "Battery (Commercial) x1 4/10",
      "Battery (Tactical) x3 5/20",
      "Chem Tank (Commercial) x1 8/8",
      "Projectile Ammo (Cold Iron, Standard-Grade) x10 1/1 cold-iron/standard",
      "Projectile Ammo (Silver) x10 1/1 silver/low",
      "Projectile Ammo x20 1/1",
    ], "ammunition");
    t.deepEqual(unmatchedEquipment(pm), [], "not reported");
  });
})();
