// Logging: levels, and payloads only worked out when they are shown.
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import logger from "../../src/logger.js";

const originalGet = game.settings.get;
const originalConsole = { debug: console.debug, warn: console.warn, error: console.error };

function capture(level) {
  game.settings.get = () => level;
  const lines = [];
  for (const method of Object.keys(originalConsole)) console[method] = (...args) => lines.push([method, ...args]);
  return lines;
}

afterEach(() => {
  game.settings.get = originalGet;
  Object.assign(console, originalConsole);
});

describe("logger", () => {
  it("does not call a payload function below the log level", () => {
    const lines = capture("WARN");
    let called = false;
    logger.debug("quiet", () => {
      called = true;
      return {};
    });
    assert.equal(called, false);
    assert.deepEqual(lines, []);
  });

  it("calls a payload function when the message is shown, and logs its result", () => {
    const lines = capture("DEBUG");
    logger.debug("shown", () => ({ a: 1 }), { b: 2 });
    assert.deepEqual(lines, [["debug", "pathmuncher | DEBUG > shown", { a: 1 }, { b: 2 }]]);
  });

  it("logs verbose messages without failing (there is no console.verbose)", () => {
    const lines = capture("VERBOSE");
    logger.verbose("detail", { c: 3 });
    assert.deepEqual(lines, [["debug", "pathmuncher | VERBOSE > detail", { c: 3 }]]);
  });

  it("logs nothing when off", () => {
    const lines = capture("OFF");
    logger.error("hidden");
    assert.deepEqual(lines, []);
  });
});
