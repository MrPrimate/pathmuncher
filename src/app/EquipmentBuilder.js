/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import CONSTANTS from "../constants.js";
import { CHARGED_MAGAZINES, PER_WEAPON_AMMUNITION, RUNE_ITEM_MAP } from "../data/equipment.js";
import logger from "../logger.js";
import { ParsedEntry } from "./ParsedEntry.js";
import { Seasoning } from "./Seasoning.js";

/**
 * The build's inventory as Foundry items: containers, an Adventurer's Pack, equipment, weapons and
 * armor with their runes and materials (or Starfinder upgrades and grades), and money.
 */
export class EquipmentBuilder {

  /** @param {Pathmuncher} pm  the import this works for, whose state it reads and adds to */
  constructor(pm) {
    this.pm = pm;
  }

  // the import's state, which this reads and adds to

  get bad() {
    return this.pm.bad;
  }

  get compendiumMatchers() {
    return this.pm.compendiumMatchers;
  }

  get parsed() {
    return this.pm.parsed;
  }

  get result() {
    return this.pm.result;
  }

  get size() {
    return this.pm.size;
  }

  get source() {
    return this.pm.source;
  }

  #resizeItem(item) {
    if (Seasoning.isPhysicalItemType(item.type)) {
      const resizeItem = item.type !== "treasure" && !["med", "sm"].includes(this.size);
      if (resizeItem) item.system.size = this.size;
    }
  }

  async #generateAdventurersPack() {
    const adventurersPack = this.parsed.equipment.find((e) => e.pbName === "Adventurer's Pack");
    if (!adventurersPack) return;

    const defaultCompendium = game.packs.get("pf2e.equipment-srd") ?? game.packs.get("sf2e.equipment");
    const index = await defaultCompendium?.getIndex({ fields: ["name", "type", "system.slug"] });
    // the pack is a backpack with its contents in it; sf2e has no backpack
    const backpackMatch = index?.find((i) => i.type === "backpack" && i.system.slug === "backpack");
    if (!backpackMatch) {
      logger.warn("Unable to find a backpack for the Adventurer's Pack", { pack: defaultCompendium?.collection });
      adventurersPack.unmatched("no backpack to hold it");
      return;
    }

    const compendiumBackpack = await defaultCompendium.getDocument(backpackMatch._id);
    const backpackInstance = compendiumBackpack.toObject();
    backpackInstance._id = foundry.utils.randomID();
    adventurersPack.settle(ParsedEntry.STATUS.CREATED, { itemId: backpackInstance._id });
    this.result.adventurersPack.item = adventurersPack;
    this.result.equipment.push(backpackInstance);
    for (const content of this.result.adventurersPack.contents) {
      const indexMatch = index.find((i) => i.system.slug === content.slug);
      if (!indexMatch) {
        logger.error(`Unable to match adventurers kit item ${content.slug}`, content);
        continue;
      }

      const doc = await defaultCompendium.getDocument(indexMatch._id);
      const itemData = doc.toObject();
      itemData._id = foundry.utils.randomID();
      itemData.system.quantity = content.qty;
      itemData.system.containerId = backpackInstance._id;
      this.#resizeItem(itemData);
      this.result.equipment.push(itemData);
    }
  }

  async #generateContainers() {
    for (const [key, data] of Object.entries(this.source.equipmentContainers)) {
      if (data.foundryId) continue;
      const name = Seasoning.getFoundryEquipmentName(data.containerName);
      const indexMatch = this.compendiumMatchers["equipment"].getMatch(data.containerName, name);
      const id = foundry.utils.randomID();
      // no compendium match: a plain container with the Pathbuilder name, built in memory only
      const doc = indexMatch
        ? await indexMatch.pack.getDocument(indexMatch.i._id)
        : new Item.implementation({ name: data.containerName, type: "backpack" });
      const itemData = doc.toObject();
      itemData._id = id;
      this.#resizeItem(itemData);
      this.result["equipment"].push(itemData);
      this.parsed.equipment.push(new ParsedEntry({
        foundryName: name,
        pbName: data.containerName,
        originalName: data.containerName,
        name,
        qty: 1,
        inContainer: undefined,
        container: this.pm.parser.getContainerData(key),
        foundryId: id,
        status: ParsedEntry.STATUS.CREATED,
        itemId: id,
      }));
    }
  }

  /** Puts an item in the container Pathbuilder has its entry in, if it has one. */
  #placeInContainer(e, itemData) {
    if (!e.inContainer) return;
    const containerMatch = this.parsed.equipment.find((con) => con.container?.id === e.inContainer);
    if (containerMatch) {
      itemData.system.containerId = containerMatch.foundryId;
      itemData.system.equipped.carryType = "stowed";
    }
  }

  /**
   * Ammunition as Pathbuilder counts it. A battery or chem tank (CHARGED_MAGAZINES) is one magazine
   * whose quantity is the charges left in it; more charges than one holds are that many full
   * magazines and one with the rest. Ammunition named for a precious material ("Projectile Ammo
   * (Cold Iron, Standard-Grade)") is made of it, and keeps the name that says so.
   */
  // eslint-disable-next-line class-methods-use-this
  #adjustAmmunition(e, itemData) {
    const max = itemData.system.uses?.max ?? 1;
    if (max > 1 && CHARGED_MAGAZINES.some((pattern) => pattern.test(e.pbName))) {
      const charges = Math.max(0, e.qty ?? 0);
      itemData.system.quantity = Math.max(1, Math.ceil(charges / max));
      itemData.system.uses.value = charges - ((itemData.system.quantity - 1) * max);
    }

    const material = Seasoning.slug(String(e.extra ?? "").split(",")[0].trim());
    if (material && itemData.system.material && CONFIG.PF2E?.preciousMaterials?.[material]) {
      itemData.system.material.type = material;
      itemData.system.material.grade = Seasoning.getMaterialGrade(e.extra);
      itemData.name = e.pbName;
    }
  }

  async #generateEquipmentItem(e) {
    if (e.pbName === "Adventurer's Pack") return;
    if (e.added) return;
    if (Seasoning.IGNORED_EQUIPMENT().includes(e.pbName)) {
      e.settle(ParsedEntry.STATUS.IGNORED, { reason: "Pathbuilder only" });
      return;
    }
    logger.debug("Generating item for", e);
    const indexMatch = this.compendiumMatchers["equipment"].getMatch(e.pbName, e.foundryName);
    if (!indexMatch) {
      logger.error(`Unable to match ${e.pbName}`, e);
      e.unmatched("no equipment compendium entry");
      return;
    }

    const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
    if (doc.type === "kit") {
      e.settle(ParsedEntry.STATUS.IGNORED, { reason: "kits are not imported" });
    } else {
      const itemData = doc.toObject();
      itemData._id = e.foundryId || foundry.utils.randomID();
      itemData.system.quantity = e.qty;
      if (doc.type === "ammo") this.#adjustAmmunition(e, itemData);
      const type = doc.type === "treasure" ? "treasure" : "equipment";
      this.#placeInContainer(e, itemData);
      if (e.invested) {
        itemData.system.equipped.carryType = "worn";
        itemData.system.equipped.invested = true;
        itemData.system.equipped.inSlot = true;
        itemData.system.equipped.handsHeld = 0;
      }
      this.#resizeItem(itemData);
      this.result[type].push(itemData);

      const options = {
        applyFeatLocation: false,
        choiceHint: e.extra && e.extra !== "" ? e.extra : null,
      };
      // settled after its own rules are read, which can match the entry's extra (a choice it makes)
      await this.pm.addGrantedItems(itemData, options);
      e.settle(ParsedEntry.STATUS.CREATED, { itemId: itemData._id });
    }
  }

  async #generateEquipmentItems() {
    for (const e of this.parsed.equipment) {
      await this.#generateEquipmentItem(e);
    }
  }

  async #processEquipmentItems() {
    // just in case it's in the equipment, pathbuilder should have translated this to items
    await this.#generateAdventurersPack();
    await this.#generateContainers();
    await this.#generateEquipmentItems();
  }

  static RUNE_SCALE = [
    "",
    "Minor",
    "Lesser",
    "Moderate",
    "Greater",
    "Major",
    "Supreme",
  ];

  static REINFORCING_DATA = {
    "Minor": {
      value: 1,
      hp: 44,
    },
    "Lesser": {
      value: 2,
      hp: 52,
    },
    "Moderate": {
      value: 3,
      hp: 64,
    },
    "Greater": {
      value: 4,
      hp: 80,
    },
    "Major": {
      value: 5,
      hp: 84,
    },
    "Supreme": {
      value: 6,
      hp: 108,
    },
  };

  static POTENCY_SCALE = [
    "",
    "striking",
    "greaterStriking",
    "majorStriking",
  ];

  static RESILIENT_SCALE = [
    "",
    "resilient",
    "greaterResilient",
    "majorResilient",
  ];

  async #applyPropertyRunes(parsedItem, itemData) {
    if (foundry.utils.hasProperty(itemData, "system.runes.property")) {
      for (const property of parsedItem.runes) {
        const resistantRegex = /Energy Resistant - (.*)/i;
        const resistantMatch = property.match(resistantRegex);
        const vitalizingRegex = /Vitalizing(.*)/i;
        const vitalizingMatch = property.match(vitalizingRegex);
        const bigRegex = /(.*)\((Greater|Major)\)/i;
        const bigMatch = property.match(bigRegex);

        let rune = property;
        if (resistantMatch) rune = `${resistantMatch[1]} Resistant`;
        else if (vitalizingMatch) rune = `Disrupting${vitalizingMatch[1]}`;
        else if (bigMatch) rune = `${bigMatch[2]}${bigMatch[1]}`;
        else if (property === "Quickstrike") rune = "speed";
        else if (property === "Animated") rune = "dancing";

        const runeItem = RUNE_ITEM_MAP[property];
        logger.debug("Processing rune property", { property, runeItem });
        if (runeItem) {
          // a rune Pathbuilder lists on the weapon that is an item in Foundry (a filigree)
          const entry = new ParsedEntry({ foundryName: property, pbName: runeItem, originalName: property, sourceType: "runes" });
          this.parsed.equipment.push(entry);
          await this.#generateEquipmentItem(entry);
        } else {
          itemData.system.runes.property.push(Seasoning.slugD(rune));
        }
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async #applyMaterial(parsedItem, itemData) {
    if (parsedItem.mat) {
      const material = parsedItem.mat.split(" (")[0];
      itemData.system.material.type = Seasoning.slug(material);
      itemData.system.material.grade = Seasoning.getMaterialGrade(parsedItem.mat);
    }
  }

  async applyRunes(parsedItem, itemData, type) {
    if (itemData.type == "shield") {
      parsedItem.runes.forEach((rune) => {
        if (rune.startsWith("Reinforcing")) {
          const runeScale = rune.split("(").pop().split(")").shift().trim();
          const runeMatch = EquipmentBuilder.REINFORCING_DATA[runeScale];
          if (runeMatch) {
            itemData.system.runes.reinforcing = runeMatch.value;
            itemData.system.hp.value += runeMatch.hp;
          }
        } else {
          const runeScale = rune.split("(").pop().split(")").shift().trim();
          const runeLevel = EquipmentBuilder.RUNE_SCALE.indexOf(runeScale);
          const runeType = rune.split("(").shift().toLowerCase().trim();
          if (runeLevel !== -1) {
            itemData.system.runes[runeType] = runeLevel;
          }
        }
      });
    } else if (foundry.utils.hasProperty(itemData, "system.runes.potency")) {
      itemData.system.runes.potency = parsedItem.pot;
      if (type === "weapon") {
        const striking = EquipmentBuilder.POTENCY_SCALE.indexOf(parsedItem.str);
        if (striking !== -1) itemData.system.runes.striking = striking;
      } else if (type === "armor") {
        const resilient = EquipmentBuilder.RESILIENT_SCALE.indexOf(parsedItem.res);
        if (resilient !== -1) itemData.system.runes.resilient = resilient;
      }
    }

    if (type === "armor" && parsedItem.worn
      && ((Number.isInteger(parsedItem.pot) && parsedItem.pot > 0)
        || (parsedItem.res && parsedItem.res !== "")
      )
    ) {
      itemData.system.equipped.invested = true;
    }

    await this.#applyPropertyRunes(parsedItem, itemData);
    await this.#applyMaterial(parsedItem, itemData);
  }

  static GRADE_SCALE = [
    { type: "commercial", pot: 0, res: 0, str: 0 },
    { type: "tactical", pot: 1, res: 0, str: 0 },
    { type: "advanced", pot: 1, res: 1, str: 1 },
    { type: "superior", pot: 2, res: 1, str: 1 },
    { type: "elite", pot: 2, res: 2, str: 2 },
    { type: "ultimate", pot: 3, res: 2, str: 2 },
    { type: "paragon", pot: 3, res: 3, str: 3 },
  ];

  async #addSubitemsToTechUpgrades(itemData, name) {
    const foundryName = RUNE_ITEM_MAP[name] ?? name;
    logger.debug("Processing rune property", { itemData, name, foundryName });

    // the name as it is first, then as the equipment map renames it ("Photon (Tactical)" is
    // "Photon Crystal (Tactical)")
    const indexMatch = this.compendiumMatchers["equipment"].getMatch(Seasoning.getFoundryEquipmentName(name), foundryName);
    if (!indexMatch) {
      logger.error(`Unable to match ${name}`, itemData);
      this.bad.push({ pbName: name, type: "equipment", details: { foundryName, pbName: name } });
      return;
    }

    const doc = await indexMatch.pack.getDocument(indexMatch.i._id);

    const subItemData = doc.toObject();
    subItemData._id = foundry.utils.randomID();
    subItemData.system.equipped.carryType = "installed";

    this.#resizeItem(subItemData);
    itemData.system.subitems.push(subItemData);
  }

  async #applyTechUpgrades(parsedItem, itemData, type) {
    if (itemData.type == "shield") {
      // not yet handled
    }

    const striking = EquipmentBuilder.POTENCY_SCALE.indexOf(parsedItem.str ?? "");
    const resilient = EquipmentBuilder.RESILIENT_SCALE.indexOf(parsedItem.res ?? "");

    // Hephaistos exports the grade; Pathbuilder only the potency and striking/resilient runes
    const exportedGrade = EquipmentBuilder.GRADE_SCALE.find((g) => g.type === parsedItem.grade?.toLowerCase());
    const grade = exportedGrade ?? (type === "weapon"
      ? EquipmentBuilder.GRADE_SCALE.find((g) =>
        g.pot === (parsedItem.pot ?? 0)
        && g.str === striking,
      )
      : EquipmentBuilder.GRADE_SCALE.find((g) =>
        g.pot === (parsedItem.pot ?? 0)
        && g.res === resilient,
      ));

    if (grade) {
      itemData.system.grade = grade.type;
    }

    for (const property of parsedItem.runes) {
      await this.#addSubitemsToTechUpgrades(itemData, property);
    }
    await this.#applyMaterial(parsedItem, itemData);
  }

  async #createWeaponItem(data) {
    // { pbName, name, prof, qty, die, display, increasedDice, pot, str, mat, runes, attack, damageBonus, extraDamage, damageType }
    logger.debug("Generating weapon for", data);
    const indexMatch = this.compendiumMatchers["equipment"].getMatch(data.pbName, data.foundryName);
    if (!indexMatch) {
      logger.error(`Unable to match weapon item ${data.name}`, data);
      data.unmatched("no equipment compendium entry");
      return null;
    }

    const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
    const itemData = doc.toObject();
    itemData._id = foundry.utils.randomID();
    itemData.system.quantity = data.qty;
    // because some shields don't have damage dice, but come in as weapons on pathbuilder
    if (itemData.type === "weapon") {
      if (data.die) itemData.system.damage.die = data.die;
      if (game.system.id === "pf2e") {
        await this.applyRunes(data, itemData, "weapon");
      } else if (game.system.id === "sf2e") {
        await this.#applyTechUpgrades(data, itemData, "weapon");
      }
    }

    if (data.display.startsWith("Large ") || data.increasedDice) {
      itemData.system.size = "lg";
    } else if (data.display && !Seasoning.IGNORED_EQUIPMENT_DISPLAY(data.display)) {
      itemData.name = data.display;
    }

    this.#resizeItem(itemData);
    this.result.weapons.push(itemData);
    data.settle(ParsedEntry.STATUS.CREATED, { itemId: itemData._id });
    return itemData;
  }

  async #generateWeaponItems() {
    for (const w of this.parsed.weapons) {
      if (Seasoning.IGNORED_EQUIPMENT().includes(w.pbName)) {
        w.settle(ParsedEntry.STATUS.IGNORED, { reason: "Pathbuilder only" });
        continue;
      }
      await this.#createWeaponItem(w);
    }
  }

  async #adjustArmorItem(itemData, parsedArmor) {
    itemData._id = foundry.utils.randomID();
    itemData.system.equipped.value = parsedArmor.worn ?? false;
    if (!Seasoning.RESTRICTED_EQUIPMENT().some((i) => itemData.name.startsWith(i))) {
      itemData.system.equipped.inSlot = parsedArmor.worn ?? false;
      itemData.system.quantity = parsedArmor.qty;

      const isShield = parsedArmor.prof === "shield";
      itemData.system.equipped.handsHeld = isShield && parsedArmor.worn ? 1 : 0;
      itemData.system.equipped.carryType = isShield && parsedArmor.worn ? "held" : "worn";

      if (game.system.id === "pf2e") {
        await this.applyRunes(parsedArmor, itemData, "armor");
      } else if (game.system.id === "sf2e") {
        await this.#applyTechUpgrades(parsedArmor, itemData, "armor");
      }
    }
    // eslint-disable-next-line require-atomic-updates
    if (parsedArmor.display) itemData.name = parsedArmor.display;

    this.#resizeItem(itemData);
    return itemData;
  }

  async #generateArmorItems() {
    for (const a of this.parsed.armor) {
      logger.debug("Generating armor for", a);
      if (Seasoning.GRANTED_ITEMS_LIST().includes(a.pbName)) {
        const existingItem = this.result.armor.find((i) => i.name === a.foundryName);
        if (existingItem) {
          existingItem.system.equipped.inSlot = true;
          existingItem.system.equipped.handsHeld = 0;
          a.settle(ParsedEntry.STATUS.GRANTED, { itemId: existingItem._id, reason: "granted by a feature" });
          logger.debug(`Ignoring armor item ${a.pbName} as it has been granted by a feature`);
          continue;
        }
      }
      if (Seasoning.IGNORED_EQUIPMENT().includes(a.pbName)) {
        a.settle(ParsedEntry.STATUS.IGNORED, { reason: "Pathbuilder only" });
        continue;
      }

      const indexMatch = this.compendiumMatchers["equipment"].getMatch(a.foundryName, `${a.pbName} Armor`);
      if (!indexMatch) {
        logger.error(`Unable to match armor kit item ${a.name}`, a);
        a.unmatched("no equipment compendium entry");
        continue;
      }

      const doc = await indexMatch.pack.getDocument(indexMatch.i._id);
      const itemData = await this.#adjustArmorItem(doc.toObject(), a);
      this.result.armor.push(itemData);
      a.settle(ParsedEntry.STATUS.CREATED, { itemId: itemData._id });
    }
  }

  async #generateMoney() {
    const compendium = game.packs.get("pf2e.equipment-srd") ?? game.packs.get("sf2e.equipment");
    const index = await compendium.getIndex({ fields: ["name", "type", "system.slug"] });
    const moneyLookup = game.system.id === "pf2e"
      ? [
        { slug: "platinum-pieces", type: "pp" },
        { slug: "gold-pieces", type: "gp" },
        { slug: "silver-pieces", type: "sp" },
        { slug: "copper-pieces", type: "cp" },
      ]
      : [
        { slug: "upb", type: "upb" },
        { slug: "credstick", type: "sp" },
      ];

    // the coins in one request, so the loop reads them from the pack's cache
    const coinIds = moneyLookup.map((lookup) => index.find((i) => i.system.slug === lookup.slug)?._id).filter(Boolean);
    // eslint-disable-next-line camelcase
    if (coinIds.length > 0) await compendium.getDocuments({ _id__in: coinIds });

    for (const lookup of moneyLookup) {
      const indexMatch = index.find((i) => i.system.slug === lookup.slug);
      if (indexMatch) {
        const doc = await compendium.getDocument(indexMatch._id);
        const itemData = doc.toObject();
        itemData._id = foundry.utils.randomID();
        itemData.system.quantity = this.source.money[lookup.type];
        this.result.money.push(itemData);
      } else if (lookup.slug === "credstick") {
        const itemData = await foundry.utils.fetchJsonWithTimeout(`modules/${CONSTANTS.MODULE_NAME}/data/credits.json`);
        if (!itemData) continue;
        itemData._id = foundry.utils.randomID();
        itemData.system.quantity = this.source.money[lookup.type];
        this.result.money.push(itemData);
      }
    }
  }

  /**
   * The ammunition the build's weapons take of a kind of per-weapon ammunition (PER_WEAPON_AMMUNITION),
   * one for each that a compendium has: { id (its slug), name, img, match, weapons: [{ name, img }] }.
   */
  #ammunitionTargets(kind) {
    const targets = new Map();
    for (const weapon of this.result.weapons) {
      const ammo = weapon.system.ammo;
      if (!ammo?.baseType?.startsWith(kind.ammoPrefix) || ammo.builtIn) continue;
      if (!targets.has(ammo.baseType)) {
        const match = this.compendiumMatchers["equipment"].findCandidates([[ammo.baseType]], { type: "ammo" });
        if (!match) {
          logger.warn(`Unable to find ammunition ${ammo.baseType} for ${weapon.name}`);
          continue;
        }
        targets.set(ammo.baseType, { id: ammo.baseType, name: match.i.name, img: match.i.img, match, weapons: [] });
      }
      targets.get(ammo.baseType).weapons.push({ name: weapon.name, img: weapon.img });
    }
    return [...targets.values()];
  }

  /**
   * Creates the ammunition given to each target, a stack per target, from assignments: { source (the
   * entry, or null for ammunition the user added), target (its id), qty }. An entry none of was given
   * to a weapon stays unmatched.
   */
  async #createAmmunition(entries, targets, assignments) {
    for (const target of targets) {
      const given = assignments.filter((a) => a.target === target.id && a.qty > 0);
      if (given.length === 0) continue;
      const doc = await target.match.pack.getDocument(target.match.i._id);
      const itemData = doc.toObject();
      itemData._id = foundry.utils.randomID();
      itemData.system.quantity = given.reduce((total, a) => total + a.qty, 0);
      const source = given.find((a) => a.source)?.source;
      if (source) this.#placeInContainer(source, itemData);
      this.#resizeItem(itemData);
      this.result.equipment.push(itemData);
      for (const a of given) {
        if (a.source && !a.source.added) a.source.settle(ParsedEntry.STATUS.CREATED, { itemId: itemData._id });
      }
    }
    for (const e of entries) {
      if (!e.added) e.unmatched("not given to a weapon");
    }
  }

  /**
   * Ammunition Pathbuilder lists once where Foundry has a kind for each weapon ("Bullets (10 rounds)"
   * for every firearm's own rounds), left unmatched by the equipment pass, becomes the ammunition of
   * the build's weapons. With one kind of weapon to give it to that is automatic. With several the
   * user shares it out (options.resolveAmmunition); without a way to ask, it stays unmatched.
   * Returns false if the user cancels the import.
   */
  async #assignAmmunition() {
    for (const kind of PER_WEAPON_AMMUNITION) {
      const entries = this.parsed.equipment.filter((e) => e.status === ParsedEntry.STATUS.UNMATCHED
        && e.sourceType === "equipment" && kind.pattern.test(e.pbName));
      if (entries.length === 0) continue;

      const targets = this.#ammunitionTargets(kind);
      let assignments;
      if (targets.length === 0) {
        for (const e of entries) e.unmatched("no weapon in the build takes it");
        continue;
      } else if (targets.length === 1) {
        assignments = entries.map((e) => ({ source: e, target: targets[0].id, qty: e.qty }));
      } else if (this.pm.options.resolveAmmunition) {
        const answer = await this.pm.options.resolveAmmunition({
          stacks: entries.map((e, index) => ({ id: String(index), name: e.pbName, qty: e.qty })),
          targets: targets.map(({ id, name, img, weapons }) => ({ id, name, img, weapons })),
        });
        if (!answer) return false;
        assignments = answer.map((a) => ({ source: entries[a.source] ?? null, target: a.target, qty: a.qty }));
      } else {
        for (const e of entries) e.unmatched("several weapons could take it");
        continue;
      }
      await this.#createAmmunition(entries, targets, assignments);
    }
    return true;
  }

  /** Returns false if the user cancels the import. */
  async processEquipment() {
    this.pm.statusUpdate(1, 4, "Equipment");
    await this.#processEquipmentItems();
    this.pm.statusUpdate(2, 4, "Weapons");
    await this.#generateWeaponItems();
    if (!(await this.#assignAmmunition())) return false;
    this.pm.statusUpdate(3, 4, "Armor");
    await this.#generateArmorItems();
    this.pm.statusUpdate(2, 4, "Money");
    await this.#generateMoney();
    return true;
  }


}
