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
- `importer.test.js`: drives the real importer dialog. Bad input, fetch failures and processing
  failures must leave the actor untouched. A failed update must save a pre-import copy.
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

## Fixtures

`fixtures/pathbuilder/<id>-<label>.json` are Pathbuilder JSON exports, saved as files because
Pathbuilder reuses export ids. See `fixtures/README.md` for where each came from.
