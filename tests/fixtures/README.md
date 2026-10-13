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

## Generated builds (`generated/`)

Builds made in the Pathbuilder web app (v111, remaster on, all books), all of them legal: Pathbuilder
shows each with no warnings and nothing left to choose. The set covers every class, with one build
for each option of its subclass choice: muse, doctrine, order, edge, racket, school, patron, research
field, instinct, cause, methodology, mystery, bloodline, style, practice, ikon, innovation, way,
conscious mind, implement, hybrid study, grim fascination, eidolon and element. Classes without one
get two builds.

- `<class>-<nn>.json` matches the Pathbuilder character `PMTG <Class> <nn>`, at level 20.
- Ancestries rotate through those with their own heritage and feat tables. Every fifth build takes
  a versatile heritage.
- Ability boosts are assigned at every boost level, four different attributes each time, the key
  attribute among them. Skills are trained, raised within the rank each level allows, and the
  bonus languages an Intelligence modifier gives are chosen.
- Every feat is common, meets its prerequisites, and fills its slot: class, ancestry, skill,
  general, and the others a class or ancestry adds (a summoner's Evolution Feat, a racket's
  Dedication Feat, Remnants of the Past's limited choices). Feats that add a pet or a choice the
  build leaves open are not taken (Pet, Familiar, Animal Companion, Additional Lore and the like),
  except where a limited choice offers nothing else and in the pet builds below.
- Choices that depend on a deity follow pf2e's deity data: a cleric's font, domains, favored weapon
  and sanctification, and a champion's cause (an unholy cause takes Abadar). Pathbuilder offers every
  option for each and checks none of them.
- Other choices Pathbuilder does not check follow the rules too: a commander's tactics are of the
  tier each slot allows (basic for Tactics, then expert, master and legendary for the Tactician
  features), and a monk's Third Path to Perfection takes a save an earlier path chose.
- Skill choices of feats (Assurance, Automatic Knowledge) take a skill the build is trained in.
- Spells fill every slot, repertoire and innate choice, from common spells of the right tradition and
  rank. An animist's apparitions are chosen and give it its apparition spells. Most spellbook
  casters (wizard, witch, magus, necromancer) export their spells as `prepared` with an empty
  spellbook (`spells`), which Pathbuilder allows. A wizard that prepares spells prepares one of
  its school's curriculum spells in each school slot (wizard-12's school has no 9th-rank curriculum
  spell, so that slot is empty; wizard-15's school has no curriculum). Seven have a spellbook and
  other kinds of preparation:

  | Build | Spellbook and preparations |
  | --- | --- |
  | wizard-01 | the prepared spells and two more per rank |
  | wizard-04 | the same, with a spell prepared twice at rank 3 and that spell heightened into a rank 5 slot; the curriculum spells are in the spellbook |
  | wizard-08 | a spellbook and nothing prepared |
  | witch-02, witch-05 | the familiar's spells: the prepared ones and two more per rank (witch-05 prepares one twice) |
  | magus-02 | the prepared spells and two more per rank |
  | necromancer-02 | the same, with a rank 3 spell heightened into a rank 5 slot |
- Pets were set up in the paid app for eleven builds:

  | Build | Pet |
  | --- | --- |
  | witch-01 | specific familiar (Pipefox, "Smudge") with one chosen ability |
  | witch-09 | familiar "Omen", six abilities including a master ability (Lifelink) |
  | wizard-02 | familiar, six abilities including Cantrip Connection and Damage Avoidance (Reflex) |
  | druid-02 | leaf order familiar, three abilities including Fast Movement (Land) |
  | psychic-06, thaumaturge-01 | the familiar from an awarded Pet feat, two abilities |
  | druid-01 | animal order companion: a savage wolf "Fang" with Mature, Incredible and Specialized Companion (Tracker) |
  | ranger-02 | Animal Companion added: a nimble bird "Kestrel" with the same feats (Ambusher) and light barding |
  | champion-02 | Faithful Steed added: a young horse "Bastion" |
  | inventor-02 | construct innovation: Advanced Construct Companion, Incredible Construct Companion and Paragon Companion taken, with the modifications Projectile Launcher, Durable Construction and Flight Chassis |
  | barbarian-03 | Summoner Dedication added: a beast eidolon, with Basic Synergy taking Advanced Weaponry |

  The other builds keep Pathbuilder's defaults: their familiars have no abilities. Pathbuilder's
  export has no eidolon or construct data at all (`pets` stays empty for a summoner or an inventor):
  an eidolon is only its type among the specials ("Beast Eidolon"), and a construct only the
  innovation, its modifications (`inventorMods`) and the feats that advance it. Pathbuilder doesn't
  export a construct's name either.
- No Free Archetype: the free web app will not open those builds.

`kineticist-07.json` to `kineticist-14.json` (Pathbuilder characters `PMTK K1` to `PMTK K8`) test
which gate or threshold each impulse belongs to. Each takes a single or dual gate, and at every
threshold an Expand the Portal or a Fork the Path:

| Build | Gate | Thresholds (5, 9, 13, 17) |
| --- | --- | --- |
| 07 | single fire | expand ×4 |
| 08 | single water | fork ×4 (air, earth, metal, wood) |
| 09 | dual air and earth | expand ×4 |
| 10 | dual metal and wood | fork, expand, fork, expand |
| 11 | single earth | fork, expand, expand, fork |
| 12 | dual fire and water, level 9 | expand, fork |
| 13 | single wood, level 5 | expand |
| 14 | dual earth and metal | expand ×4 |

Class feat slots also take impulses of the same elements, and universal ones such as Command
Elemental, so a class impulse can be mistaken for a gate's or threshold's. A gate's or fork's own
slots take a 1st-level impulse of that element, and an Expand the Portal slot an impulse "for one of
your kinetic elements", as the rules and pf2e's choice require: Pathbuilder offers any impulse there
and does not flag the wrong ones.

`survey.test.js` imports them all when `PMT_SURVEY=1`. `snapshot.test.js` snapshots the first of each
class, and all of them with `PMT_SNAPSHOT_ALL=1`.

## Edge-case builds (`edge/`)

Earlier generated builds, made without the rules above: attributes and skills unassigned, feats whose
prerequisites are unmet, uncommon picks, a domain or font the deity does not grant (`cleric-01`), and
kineticist impulses no Expand the Portal can take (`kineticist-02`, `-04`, `-06`). Players make
builds like these, so tests that check how an import copes with them use these by name through
`globalThis.__pmtEdge`. They keep their old names (`cleric-01` and so on), which now also name
different legal builds in `generated/`. Every edge build is snapshotted.

## Snapshots (`../snapshots/`)

`snapshots/<fixture>.json`, `snapshots/generated/<build>.json` and `snapshots/edge/<build>.json`
record what importing each build produced: the character's details, every item as one line, the
spellcasting entries, the post-import report and the prompts. `snapshot.test.js` fails when an import no longer matches its
snapshot. They are written by the tests (`PMT_UPDATE_SNAPSHOTS=1`), never by hand. They hold
compendium names and ids, so a pf2e update that renames or changes items changes them too.

## Pathbuilder's format

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
