# Tests

There are two layers:

- **Unit tests** (`tests/unit/`): pure logic, run under Node.
- **Foundry tests** (`tests/foundry/`): imports run inside a live pf2e world, compared against the
  Pathbuilder export.

## Unit tests

```sh
npm test
```

This uses Node's built-in test runner (Node 22+), so it needs no extra dependencies.
`tests/unit/setup.mjs` stubs the few Foundry globals touched at import time. Extend it when a test
needs more. Use these for anything that doesn't need the pf2e system: parsing and normalising
exports, name and slot mapping, and similar. `build-parser.test.mjs` reads every fixture,
generated build and edge-case build into parsed entries (`BuildParser`), so a change to reading exports is checked
against all of them in under a second.

## Foundry tests

```sh
CDP_PORT=9222 FVTT_URL=http://127.0.0.1:30000 FVTT_USER=Gamemaster npm run test:foundry [-- <name filter>]
```

**What you need running first**

- **A Foundry world** using the pf2e system, with pathmuncher enabled and launched.
  `module-dev.json` copied to `module.json` serves the module straight from `src/`.
  - The tests create and delete their own actors, named `PMTEST ...`.
  - They temporarily change the Free Archetype and gradual boost variant settings, and restore them
    afterwards.
  - Use a scratch world.
- **A GM user without a password**, named by `FVTT_USER`.
- **A Chrome or Chromium with remote debugging on**, for example:

  ```sh
  chrome --headless --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir=<scratch dir>
  ```

**How a run works**

1. `tests/foundry/run.mjs` joins the world as `FVTT_USER`, or reloads the tab so the current code is
   used.
2. It loads `lib.js` and every `*.test.js` file into the page, along with the fixtures.
3. It runs the tests one at a time and prints `ok` / `not ok` lines. The exit code is non-zero if
   any test fails.
4. Set `PMT_KEEP=1` to keep the test actors for inspection.

**Test files**

- `fixtures.test.js`: imports every fixture with the build's own variant rules, then compares the
  actor with the export using `pmt.compareWithBuild`.
  - Each fixture's `knownGaps` lists what pathmuncher still gets wrong, and `prompts` lists the pf2e
    choices the user still has to answer.
  - Any new difference fails the test. So does a known gap that has gone away: remove it from the
    list as part of the fix that closed it.
- `handbuilt.test.js`: builds a twin of each fixture by hand, the way a user does on the sheet.
  - `pmt.buildByHand` sets the level, drops the ancestry, heritage, background and class, then puts
    each feat into the slot Pathbuilder labelled it with, through `actor.feats.insertFeat`.
  - The import must match the twin's core items, its class features and their levels, and its
    slotted feats with the level each was taken at.
  - `KNOWN_DIFFERENCES` lists what still differs.
- `importer.test.js`: drives the real importer dialog. Bad input, fetch failures and processing
  failures must leave the actor untouched. A failed update must save a pre-import copy.
- `processing.test.js`: processing details.
  - Unmatched containers are created on the actor only, never as world items.
  - The deep-dive setting gives the same character on or off.
  - Choices the export answers are not prompted:
    - a class feature's choice under Pathbuilder's name (Bone Fascination);
    - a skill choice settled by the proficiencies, including Mastermind's;
    - a cleric's domain;
    - a sorcerer's bloodline and its kind;
    - an item's several choices of one kind (the Commander's tactics), each taking a different entry.
    - a choice of items the build carries exactly one of (Surki Weapon Familiarity's weapon);
    - a champion's sanctification, from the cause.
  - Choices the export doesn't answer are collected and asked together after processing.
  - Pathbuilder's awarded feats repeated in specials are created once.
  - A class feature the class lists under another name (the Champion's "Weapon Mastery") is matched.
  - A spellbook spell prepared in a higher slot keeps its spellbook rank.
  - A rule the system's code throws on is left for the system to apply, and reported.
  - An Adventurer's Pack is a backpack holding its contents, and is reported when there is no
    backpack (sf2e).
  - Ammunition Pathbuilder lists once (bullets) becomes the rounds of the build's only gun. With
    several guns it is shared out as the user says, or reported when it can't be asked; cancelling the
    dialog cancels the import.
- `reporting.test.js`: what the user is told and shown.
  - The post-import report lists unmatched specials but not Pathbuilder's labels.
  - Specials that are a section of another feature's description are grouped under that feature,
    with its link and the section on hover. This covers remastered terms ("Negative Healing" is
    "Void Healing") and sections named after their feature ("Animal Instinct Raging Resistance").
  - Dual class exports warn.
  - The importer's checkboxes show their saved options.
  - Parent and child feat choices are parsed as such.
- `ui.test.js`: the user interface.
  - The sheet header button opens one importer per actor.
  - Import from a JSON file, and the error when no file is chosen.
  - Options are remembered between imports.
  - All / None, and blended slots following the Spells option.
  - The compendium selector's add, move and reset.
  - The ammunition dialog's split, drag onto a gun and added stack.
  - Cancelling the reset-settings menu changes nothing.
- `snapshot.test.js`: each import compared with its saved snapshot (`fixtures/snapshots`), so a
  change to what an import produces shows as the lines that changed.
  - `pmt.characterSnapshot` records the character's details, every item as one line (slot, levels,
    what granted it, its choices, quantity, container, runes), the spellcasting entries, the
    post-import report and the prompts. Item ids become item names and lists are sorted.
  - Covers every fixture, every edge-case build and the first generated build of each class.
    `PMT_SNAPSHOT_ALL=1` covers every generated build.
  - When a change is meant to alter the result, rerun with `PMT_UPDATE_SNAPSHOTS=1` to rewrite the
    snapshots, and review their diff before committing.
  - A run over every build takes about 40 minutes. Split it with `PMT_CHUNK`: `PMT_CHUNK=1/4` up to
    `PMT_CHUNK=4/4` each run a quarter of the matching tests (every 4th, starting with the 1st, 2nd,
    ...), so a stopped or failed run only needs that chunk again.
- `sf2e.test.js`: Starfinder 2e imports, registered only in an sf2e world. Run them there with the
  filter `sf2e`. The builds are Starbuilder exports of the system's iconics and pregenerated
  characters.
  - A battery or chem tank is one magazine holding the charges Pathbuilder lists as its quantity.
  - Projectile ammo keeps its count, and its precious material and name.
- `reimport.test.js`: importing over an existing character.
  - Imported items are flagged and replaced.
  - Effects and conditions are always kept.
  - Hand-added items are offered in the keep dialog; cancelling changes nothing.
  - Actors imported before items were flagged are replaced without asking.
  - Unticked options (money, armor, formulas) leave their items alone.
- `memory.test.js`: what an import keeps on the actor (`flags.pathmuncher.lastImport`).
  - The build, the import notes and the answers given, including those the system asked for.
  - With re-use on, a choice answered last time isn't asked again; with it off, it is.
  - How ammunition is shared out is asked each time.
  - The importer's re-use box and notes button appear only once there is a last import.
- `companions.test.js`: animal companions and eidolons made with the PF2e Companion Compendia module
  (`BFFBuilder`), registered only in a world where that module is active.
  - A companion is a character with its animal, level, advancement feats and barding, linked to its
    master, made without prompts.
  - The next import updates the same character and keeps what was added to it by hand.
  - A companion goes to the character picked for it; only characters no other player owns, that are
    blank or made for a companion, are offered.
  - An animal the module doesn't have is reported, with no character made.
  - A summoner's eidolon is a character with its type, class features and the eidolon versions of the
    evolution feats. Every choice its items ask for is made without a prompt: the build's (Energy
    Heart's damage type, an elemental's element) or a default listed in the import notes. A second
    import keeps the choices and guesses nothing.
  - The eidolon builder (`EidolonEditor`, `EidolonBuilderApp`): a preview with other choices leaves the
    eidolon alone, a level's boosts are all different, and building writes the choices (the granted
    boost becoming the one picked), which the next import keeps. The window updates its stat block as
    a choice changes and builds; the importer opens it once the eidolon is made, and choices made in it
    aren't listed to check.
- `rename-targets.test.js`: every target in the rename tables (`src/data/features.js`,
  `equipment.js` and `spells.js`) is in the compendiums the importer searches. See
  [After a system update](#after-a-system-update).

### After a system update

The rename tables map Pathbuilder's names to the compendiums' names. A pf2e or sf2e release that
renames or drops an item leaves its entry pointing at nothing, and builds with that item import it
as unmatched. After either system updates, run the check in a pf2e world and in an sf2e world:

```sh
CDP_PORT=9222 FVTT_URL=http://127.0.0.1:30000 FVTT_USER=Gamemaster npm run test:foundry -- "rename targets"
```

Each world checks the entries for its own system. An entry is pf2e's unless it is tagged
`system: "sf2e"`. Entries for a module's content are tagged with the module (`module:
"pf2e-legacy-content"` for the pre-remaster names) and are checked only in a world where that module
is active. Choice options that aren't compendium items (the dragon a draconic bloodline takes) are
kept apart in `CHOICE_VALUE_RENAMES` and not checked. For a target that isn't found, look up the
item's new name and update the entry, tag it, or remove it if the item is gone. The unit tests check
the tables' tags and that no name is renamed twice.

Add new behaviour tests next to these as plain scripts that call `pmt.test(name, async (t) => ...)`.
`lib.js` documents the helpers:

- `pmt.actor`
- `pmt.importBuild`
- `pmt.submitImporter`
- `pmt.useBuildVariants`
- `pmt.answerPrompts`
- `pmt.captureNotifications`
- `pmt.characterSnapshot` and `pmt.snapshotDifferences`
- `t.cleanup`

## Survey of generated builds

`fixtures/pathbuilder/generated/` holds legal level 20 builds made in Pathbuilder for every class
and each option of its subclass choice (muse, school, bloodline, eidolon, ...), with feats and
spells picked from Pathbuilder's own tables (see `fixtures/README.md`). They are too many for every run, so they are surveyed rather
than tested:

```sh
PMT_SURVEY=1 CDP_PORT=9222 FVTT_URL=http://127.0.0.1:30000 FVTT_USER=Gamemaster npm run test:foundry -- survey > survey.log
node tests/foundry/survey-report.mjs survey.log > survey.md
```

- `survey.test.js` imports each build and logs what it finds. A build fails only if the import throws.
- The report lists, most frequent first:
  - the pf2e prompts the export already answers, which pathmuncher should have answered;
  - the prompts it doesn't answer;
  - everything the post-import report calls unmatched;
  - the differences `pmt.compareWithBuild` finds;
  - console errors.
- Add a survey filter (`-- "survey Wizard"`) to rerun one class.

## Fixtures

`fixtures/pathbuilder/<id>-<label>.json` are Pathbuilder JSON exports, saved as files because
Pathbuilder reuses export ids. See `fixtures/README.md` for where each came from.
