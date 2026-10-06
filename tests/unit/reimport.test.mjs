// Which import option replaces which kind of item on a re-import.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Pathmuncher } from "../../src/app/Pathmuncher.js";

const item = (type, slug = null) => ({ type, system: { slug } });

describe("Pathmuncher.importOptionForItem", () => {
  it("treats coins as money and other treasure as treasure", () => {
    for (const slug of ["platinum-pieces", "gold-pieces", "silver-pieces", "copper-pieces", "upb", "credstick"]) {
      assert.equal(Pathmuncher.importOptionForItem(item("treasure", slug)), "addMoney", slug);
    }
    assert.equal(Pathmuncher.importOptionForItem(item("treasure", "amethyst")), "addTreasure");
  });

  it("puts shields with armor", () => {
    assert.equal(Pathmuncher.importOptionForItem(item("armor")), "addArmor");
    assert.equal(Pathmuncher.importOptionForItem(item("shield")), "addArmor");
  });

  it("maps every kind of item the import creates to its option", () => {
    const expected = {
      class: "addClass",
      deity: "addDeity",
      background: "addBackground",
      heritage: "addHeritage",
      ancestry: "addAncestry",
      feat: "addFeats",
      action: "addFeats",
      equipment: "addEquipment",
      backpack: "addEquipment",
      consumable: "addEquipment",
      book: "addEquipment",
      weapon: "addWeapons",
      lore: "addLores",
      spell: "addSpells",
      spellcastingEntry: "addSpells",
    };
    for (const [type, option] of Object.entries(expected)) {
      assert.equal(Pathmuncher.importOptionForItem(item(type)), option, type);
    }
  });

  it("never replaces effects, conditions or other items the import does not create", () => {
    for (const type of ["effect", "condition", "affliction", "kit", "melee", "campaignFeature"]) {
      assert.equal(Pathmuncher.importOptionForItem(item(type)), null, type);
    }
  });
});
