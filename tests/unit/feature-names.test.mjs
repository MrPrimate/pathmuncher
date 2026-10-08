// The Foundry names a Pathbuilder feature name is also looked up under.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FEAT_RENAME_MAP, IGNORED_SPECIALS, IGNORED_FEATS, SPECIAL_NAME_ADDITIONS } from "../../src/data/features.js";
import { spellRename } from "../../src/data/spells.js";

const foundryNames = (pbName) => FEAT_RENAME_MAP(pbName).filter((e) => e.pbName === pbName).map((e) => e.foundryName);

describe("FEAT_RENAME_MAP", () => {
  it("drops the suffix Pathbuilder adds to a class feature's choice", () => {
    // Necromancer's Grim Fascination offers pf2e items named "Bone", "Blood", "Flesh" and "Spirit"
    assert.deepEqual(foundryNames("Bone Fascination"), ["Bone"]);
    assert.deepEqual(foundryNames("Wealth Mystery"), ["Wealth"]);
    assert.deepEqual(foundryNames("Gold Patron"), ["Gold"]);
  });

  it("drops a champion cause's suffix and sanctification", () => {
    assert.ok(foundryNames("Desecration Cause (Unholy)").includes("Desecration"));
    assert.ok(foundryNames("Grandeur Cause (Holy)").includes("Grandeur"));
    assert.ok(foundryNames("Justice Cause").includes("Justice"));
  });

  it("drops the number Pathbuilder gives a witch's lesson", () => {
    assert.ok(foundryNames("Major Lesson I").includes("Major Lesson"));
    assert.ok(foundryNames("Greater Lesson II").includes("Greater Lesson"));
  });

  it("renames features Pathbuilder spells differently", () => {
    assert.deepEqual(foundryNames("Superstitious Instinct"), ["Superstition Instinct"]);
    assert.deepEqual(foundryNames("Harbinger's Claw"), ["Harbinger's Caw"]);
    assert.deepEqual(foundryNames("Premonition's Reflexes"), ["Premonition Reflexes"]);
    assert.deepEqual(foundryNames("Thaumaturge Weapon Expertise"), ["Weapon Expertise"]);
  });

  it("uses the static map instead of the patterns when it has an entry", () => {
    assert.deepEqual(foundryNames("Air Element"), ["Air Gate"]);
  });

  it("splits \"Label: Name\" specials, so a cleric's domain can answer Domain Initiate", () => {
    assert.deepEqual(foundryNames("Domain: Magic"), ["Magic"]);
  });

  it("maps the Advanced Player's Guide versatile heritages to the remaster's Nephilim", () => {
    assert.deepEqual(foundryNames("Aasimar"), ["Nephilim"]);
    assert.deepEqual(foundryNames("Tiefling"), ["Nephilim"]);
  });
});

describe("ignored Pathbuilder labels", () => {
  it("ignores a cleric's sanctification of Neither", () => {
    assert.ok([...IGNORED_FEATS(), ...IGNORED_SPECIALS()].includes("Neither"));
  });

  it("ignores proficiency increases pf2e makes through the class item", () => {
    assert.ok(IGNORED_FEATS().includes("Master Rogue"));
  });

  it("ignores the deity skill label", () => {
    assert.ok(IGNORED_FEATS().includes("Deity Skill"));
  });

  it("ignores the sanctification label of Champion's Aura", () => {
    assert.ok(IGNORED_FEATS().includes("Holy Aura") && IGNORED_FEATS().includes("Unholy Aura"));
  });
});

describe("spellRename", () => {
  it("corrects Pathbuilder's spellings", () => {
    assert.equal(spellRename("Weapon of Judgement"), "Weapon of Judgment");
  });

  it("renames pre-remaster spells", () => {
    assert.equal(spellRename("Veil"), "Illusory Disguise");
    assert.equal(spellRename("Fireball"), "Fireball");
  });
});

describe("a sorcerer's bloodline", () => {
  it("is the bloodline item without its kind", () => {
    assert.ok(foundryNames("Bloodline: Draconic (Divine)").includes("Bloodline: Draconic"));
    assert.ok(foundryNames("Bloodline: Elemental (Air)").includes("Bloodline: Elemental"));
  });

  it("adds the option its choice takes, as pf2e labels it", () => {
    assert.deepEqual(SPECIAL_NAME_ADDITIONS(["Bloodline: Draconic (Divine)", "Draconic (Requiem)"]), ["Requiem Dragon"]);
    assert.deepEqual(SPECIAL_NAME_ADDITIONS(["Bloodline: Draconic (Divine)"]), ["Divine Dragon"]);
    assert.deepEqual(SPECIAL_NAME_ADDITIONS(["Bloodline: Elemental (Air)"]), ["Air"]);
    assert.deepEqual(SPECIAL_NAME_ADDITIONS(["Bloodline: Genie (Djinni)"]), ["Jaathoom"]);
    assert.deepEqual(SPECIAL_NAME_ADDITIONS(["Bloodline: Hag"]), []);
  });
});
