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
exports, name and slot mapping, and similar.

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
  - Pathbuilder's awarded feats repeated in specials are created once.
  - A class feature the class lists under another name (the Champion's "Weapon Mastery") is matched.
  - A spellbook spell prepared in a higher slot keeps its spellbook rank.
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
  - Cancelling the reset-settings menu changes nothing.
- `reimport.test.js`: importing over an existing character.
  - Imported items are flagged and replaced.
  - Effects and conditions are always kept.
  - Hand-added items are offered in the keep dialog; cancelling changes nothing.
  - Actors imported before items were flagged are replaced without asking.
  - Unticked options (money, armor, formulas) leave their items alone.

Add new behaviour tests next to these as plain scripts that call `pmt.test(name, async (t) => ...)`.
`lib.js` documents the helpers:

- `pmt.actor`
- `pmt.importBuild`
- `pmt.submitImporter`
- `pmt.useBuildVariants`
- `pmt.answerPrompts`
- `pmt.captureNotifications`
- `t.cleanup`

## Survey of generated builds

`fixtures/pathbuilder/generated/` holds level 20 builds made in Pathbuilder for every class and
each option of its subclass choice (muse, school, bloodline, eidolon, ...), with feats and spells
picked from Pathbuilder's own tables. They are too many for every run, so they are surveyed rather
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
