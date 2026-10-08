/* eslint-disable no-console -- the survey records console errors raised during each import */
// Survey of the generated level 20 builds (fixtures/pathbuilder/generated, one per class and subclass
// choice). Only runs with PMT_SURVEY=1. Each import passes unless it throws; what it finds goes to the
// log as one "SURVEY {json}" line for tests/foundry/survey-report.py to summarise: the pf2e prompts
// (and whether the build answered them), the post-import report, specials found in other features,
// differences from the build, and console errors.
(() => {
  const { test } = pmt;
  const generated = globalThis.__pmtSurvey ? globalThis.__pmtGenerated ?? {} : {};

  // pathmuncher's debug-mode logging, and pf2e preparing the in-memory evaluation actor before its
  // choices are made (a rule element "failed to validate"); unresolvedChoices checks the result instead
  const NOISE = [/Generating feature for/, /^pathmuncher \| WARN > MATCHES/, /chociesetdata/, /Unable to find parsed feature match/, /rules element on item .* failed to validate/];

  /** ChoiceSets on the actor's items left without a selection. */
  const unresolvedChoices = (actor) => actor.items.contents.flatMap((item) => (item.system.rules ?? [])
    .filter((r) => r.key === "ChoiceSet" && r.selection === undefined && !(r.flag && item.flags.pf2e?.rulesSelections?.[r.flag] !== undefined))
    .map((r) => `${item.name}${r.flag ? ` (${r.flag})` : ""}`));

  for (const [name, exportJson] of Object.entries(generated)) {
    test(`survey ${name}`, async (t) => {
      const build = foundry.utils.deepClone(exportJson.build);
      await pmt.useBuildVariants(t, build);
      const prompts = pmt.answerPrompts(t, build);
      const errors = [];
      const orig = { error: console.error, warn: console.warn };
      for (const level of ["error", "warn"]) {
        console[level] = (...args) => {
          const text = args.map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : "")).join(" ").trim();
          if (text && !NOISE.some((r) => r.test(text))) errors.push(`${level}: ${text.slice(0, 200)}`);
          return orig[level](...args);
        };
      }
      t.cleanup(() => Object.assign(console, orig));
      const actor = await pmt.actor(t, name);
      const started = performance.now();
      let pm = null;
      let failure = null;
      try {
        pm = await pmt.importBuild(actor, exportJson);
      } catch (e) {
        failure = e.message;
      }
      const report = pm ? pm.getImportReport() : [];
      const result = {
        name,
        class: build.class,
        ms: Math.round(performance.now() - started),
        failure,
        prompts: prompts.map((p) => ({ item: p.item, picked: p.picked, matched: p.matched })),
        report: Object.fromEntries(report.filter((g) => g.type !== "described").map((g) => [g.type, g.names])),
        described: pm ? pm.getDescribedSpecials().map((o) => `${o.name}: ${o.specials.map((s) => s.name).join(", ")}`) : [],
        problems: pm ? pmt.compareWithBuild(actor, build) : [],
        unresolved: unresolvedChoices(actor),
        errors: [...new Set(errors)],
      };
      t.log.push(`SURVEY ${JSON.stringify(result)}`);
      if (failure) throw new Error(failure);
    });
  }
})();
