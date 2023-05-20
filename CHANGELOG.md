# 0.4.2

- Changes for v66 of Pathbuilder for familiars.
- Cannoneer name matching. Some other enhancements to name matching.
- Added a abstraction layer for finding items in compendiums to allow for third party compendiums to be used. (Upcoming feature).
- Wisdom based focus spells would not import (typo).

# 0.4.1

- Greenwatch features now matchup correctly.

# 0.4.0

- Major refactor, better matching in most cases.

# 0.3.1

- Better detection of spell casting tradition for non-class spellcasting.

# 0.3.0

- Changes for focus spell move in v65 of Pathbuilder.
- Nagaji and Kitsune spell feats will now add spells correctly.

# 0.2.0

- Draconic Rage no longer throws a warning.
- Raider background matches.
- Features such as Barbarians with Dragon Instinct, and other similar choice set values will now correctly import and not throw an exception.
- Improvements to name adjustments for some features.
- Better handling of injected property handling when updating the actors post import, should reduce warnings .
- Improvements to features like Clan Dagger where they grant items, but Pathbuilder does not provide the choice. Pathmuncher will npw add the appropriate items/choices.

# 0.1.15

- Correct typo breaking Pathmuncher for non-GM users with Create Actor permissions.

# 0.1.14

- Restrict Pathmuncher to users with appropriate permissions.

# 0.1.13

- Better detection of skills listed as feats to prevent false positive error messages.
- Slight tweak - parser is a bit more aggressive about asking user about missing features. There maybe some false positives, please report. e.g. Fleshwarp weapons

# 0.1.12

- Prepared spell caster spells are added to spell book only. (JSON does not contain which spells are prepared, just all spells known).


# 0.1.11

- The class keyability was not always set correctly.

# 0.1.10

- Experimental dual class support.
- Improvements to focus tradition detection.

# 0.1.9

- Improved detection of Greater/Lesser/Major item detection etc.
- Some feats could be added twice if they were granted by a feature, typically backgrounds. e.g. Charming Liar from Callow May.
- Option to ignore adding Vision feats to character sheet.

# 0.1.8

- A bug prevented class features appearing that had not yet been reached, breaking levelling within Foundry.

# 0.1.7

- Fix placement of Ancestry Paragon and Free Archetype feats.

# 0.1.6

- If "PF2e Psychic Amps" module is installed, amped spells will be taken from this modules compendium.
- Adds effects such as "Extra Reagents" onto the character sheet if the familiar has them.
- For features like the Sorcerer Bloodline, detect selection and apply name.

# 0.1.5

- Correct and edge case where an unnamed familiar would break the importer.

# 0.1.4

- Import known Formulas.
- Familiars will import as actors.

# 0.1.3

- Some JSON data now has spell lists again, improved spell detection.
- Added a paste JSON option, rather than providing an ID.
- Improved detection of Explorer's Clothing.

# 0.1.2

- Imprecise Sense would be added but would prompt that it was not.

# 0.1.1

- Swashbucker Styles matching.
- Fix issue with importing some characters in Pathfinder system version 4.7.x

# 0.1.0

- Money did not import correctly.

# 0.0.9

- Thanks to @null#1055 for improving spellcasting type detection.

# 0.0.8

- Counterspell detection.
- Improvements to valid feat detection.

# 0.0.7

- Choices would not evaluate in the case of classes like Barbarian.
- Ancient-Blooded Dwarf heritage map.

# 0.0.6

- Armor would not import as equipped properly.

# 0.0.5

- In some cases, things like the Attack of Opportunity feat would grant an action with the same id, which could confuse the muncher.

# 0.0.4

- Fix a bug with choice selection options.
- Improve parsing of selections like Fighter Weapon Mastery.

# 0.0.3

- Public Beta

# 0.0.2

- Public Alpha
