# Fixtures

Pathbuilder 2e JSON exports, fetched from `https://pathbuilder2e.com/json.php?id=<id>`. Pathbuilder
reuses ids, so the ones taken from issues are not necessarily the characters first posted under them.

| File | Character | Why it is here | Source |
|---|---|---|---|
| `315329-magus9.json` | Elf Magus 9 | Free Archetype and gradual boosts; Psychic Dedication through Ancient Elf; Soulforger; runes; rituals; 62 formulas | issue #54 |
| `142926-wizard20.json` | Dwarf Wizard 20 | 2020-era export without `equipmentContainers`, `blendedSpells` or a boost breakdown; legacy feat names; Cleric and Loremaster archetypes | issue #1 |
| `304883-thaumaturge1.json` | Kitsune Thaumaturge 1 | Backpack with contents; innate spell | issue #2 |
| `314710-gunslinger1.json` | Fleshwarp Gunslinger 1 | Combination weapon (`Axe Musket - Melee`) | issue #3 |
| `345816-guardian3.json` | Minotaur Guardian 3 | Custom Mixed Heritage; partial boost breakdown; shield; Free Archetype | issue #6 |
| `422753-fighter5.json` | Kholo Fighter 5 | Free Archetype; Exemplar Dedication with ikon choices | issue #13 |
| `477013-fighter4-archer.json` | Human Fighter 4 | Built for these tests on Pathbuilder 2e Web v110, core books only, 2026-10-07. No Free Archetype: Archer Dedication and Quick Shot taken in class slots; Natural Ambition (parent) granting Exacting Strike (child); Skilled Human's skill choice; Assurance (Athletics); Battle Medicine in a general slot | built |
| `jack-necromancer9.json` | Skeleton Necromancer 9 | Grim Fascination's choice only in specials, under Pathbuilder's name ("Bone Fascination" for pf2e's "Bone"); spellbook spells prepared in higher slots (Fear at rank 3); Veil, a remastered name; Free Archetype | Jack, 2026-10-07 (no export id) |

## What the exports show about Pathbuilder's format

From `477013-fighter4-archer` (built to check) and the others:

- **Feats** are `[name, extra, type, level, slotLabel, choiceType, parentLabel]`.
  - Awarded feats (granted by the class or background) have only the first four fields.
  - 2020-era exports have no slot label or choice fields at all.
- **A feat's type follows the slot it was taken in**, not the feat.
  - Archer Dedication taken in a class slot is `"Class Feat"`, labelled "Fighter Feat 2".
  - A skill feat taken in a general slot is `"General Feat"`, labelled "General Feat 3".
  - `"Archetype Feat"` only appears for Free Archetype slots, labelled "Free Archetype 2".
- **Slot labels:**
  - "<Class> Feat N"
  - "<Ancestry or versatile heritage> Feat N" (e.g. "Gnoll Feat 1" for a Kholo)
  - "Skill Feat N" and "General Feat N"
  - "Free Archetype N"
  - "Heritage Feat"
  - a UUID for a Custom Feat Choice (an extra, bonus feat)
- **Child choices** (`"childChoice"`, e.g. the class feat Natural Ambition grants) carry the parent's
  label as a prefix: "Natural Ambition Class FeatHuman Feat 1".
- **Some choices are only in `specials`**, such as Skilled Human's skill ("Medicine").
- **Some are not exported at all**, only their effect, such as the Fighter's class skill (Athletics)
  in `proficiencies`.
