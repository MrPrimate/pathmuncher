# Pathmuncher/Starmuncher

![Latest Release Download Count](https://img.shields.io/badge/dynamic/json?label=Downloads%20(Latest)&query=assets%5B1%5D.download_count&url=https%3A%2F%2Fapi.github.com%2Frepos%2FMrPrimate%2Fpathmuncher%2Freleases%2Flatest)
![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fpathmuncher&colorB=4aa94a)
![Foundry Minimum Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FMrPrimate%2Fpathmuncher%2Fmain%2Fmodule-template.json&label=Foundry%20Version&query=$.compatibility.minimum&colorB=orange)
![Foundry Verified Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FMrPrimate%2Fpathmuncher%2Fmain%2Fmodule-template.json&label=Foundry%20Version&query=$.compatibility.verified&colorB=green)

Import characters from Pathbuilder (or Hephaistos 2E) to Foundry Pathfinder 2e/Starfinder 2e.

![gif-preview](./docs/demo.gif)

## How To

1. Build your character in [Pathbuilder(https://pathbuilder2e.com/)].
2. Export your character using "Export JSON" from Pathbuilder via the burger menu
3. Click the Pathmuncher icon in the characters title bar.
4. Enter the 6 digit user ID number from the pathbuilder in the bottom section
5. Import the character.

## About

This is inspired by the previous [pathbuilder2e-import](https://github.com/kobseryqum/foundry-pathbuilder2e-import) package, but is written afresh from the ground up, capturing some of my experience from [DDB Importer](https://github.com/MrPrimate/ddb-importer).

To use this module the users must have the CREATE ACTOR ability, as it imports familiars and animal companions as their own actors and saves a copy of the character if an import fails part way.

## Animal companions

With the [PF2e Companion Compendia](https://foundryvtt.com/packages/pf2e-animal-companions) module active, a build's animal companions are imported as characters of their own, the way that module builds them: the animal as the ancestry, at the character's level, with Mature, Nimble or Savage and Specialized as Pathbuilder has them, and any barding. The first import asks which character each companion goes to: a new one, or a character no other player owns that is blank or made for a companion. Later imports update the same character, keeping anything added to it by hand. Without the module, companions are listed in the import notes.

## Known Issues

- There are differences between Pathbuilder names and Foundry names. If you find any, please open an issue, or drop a note in Discord with as much detail as possible, ideally with a shared link to a pathbuilder character.
- Support for "dual classed" characters from the Advanced Players guide is ropey at best, and not supported.

## Bugs and Issues

Please open bugs and issues on [github](https://github.com/MrPrimate/pathmuncher/issues/new/choose), or via the Discord channel [#pathmuncher](https://discord.gg/M6jvpfreNd).
