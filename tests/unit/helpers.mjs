import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/pathbuilder");

/** A fresh copy of a Pathbuilder export fixture, by file name without .json. */
export function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, `${name}.json`), "utf8"));
}

export function fixtureNames() {
  return fs.readdirSync(fixtureDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
}
