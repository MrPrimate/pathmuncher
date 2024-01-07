# 1.0.5

- Handle granted languages by Ancestries in PF2e v5.12.0

# 1.0.4

- Improve Witch Patron matching for remaster.
- Fix Explorer's Clothing match for remaster.

# 1.0.3

- Better mapping coverage of renamed spells if legacy content module is not enabled.
- Removal of some pre-remaster data fields still generated.
- Improve some issues when importing Inventors not detecting correctly granted invention.

# 1.0.2

- More improvements to feat detection for child feats.
- Improved detection of skill choices for feats such as Empiricism and Natural Skill.

# 1.0.1

- Some slightly improved name mapping for legacy toolkits.
- Handwraps of Mighty Blows will import correctly.
- Various improvements for legacy equipment matching.

# 1.0.0

- Improved Large weapon matching.
- Detection of Mystery types for Oracle.
- First pass at improved child feat detection for Pathbuilder exports in v79 of Pathbuilder. This should dramatically improve imports for a variety of characters.

# 0.12.1

- Improved name matching for some items (thanks @killersquirrel59 )

# 0.12.0

- Support for Pathfinder system v5.11.1 (and dropping of earlier versions)
- Attempt to match Large Weapons and upsize them for you.
- Shields will add resilient rune again.
- Fixes for runs in v5.11.x

# 0.11.7

- Match repair toolkit.

# 0.11.6

- Handle resilient rune on shields.

# 0.11.5

- Axe Musket, and other weapons with a Ranged/Melee option in Pathbuilder were not matched/imported.

# 0.11.4

- Saving throw data is inferred from classes, but in some instances remnants of the old data model could cause problems.

# 0.11.3

- Typo fix in boilerplate.

# 0.11.2

- Support latest changes to precious materials on weapons.

# 0.11.1

- Some character builds would render all abilities/attributes at 0.

# 0.11.0

- Support Remaster PF2e version 5.9.0+/Remaster

# 0.10.1

- Lumberjack background mapping to Foundry. @wintermute_wrath

# 0.10.0

- Feat level detection tweaks
- Support for Pathfinder system 5.8.0

# 0.9.1

- Support Skill Training feat when taken outside of a ancestry choice.

# 0.9.0

- Support for PF2e 5.4.x
- More improvements to placing feats granted by feats into teh correct place.
- Removal of deprecated always prompt option

# 0.8.2

- Improve order of items granted by glass to sort by level, if the class does not order them this way in the data (e.g. Kineticist ) to improve feature matching.
- Skill feat and ancestry feats should now have a better match ratio in higher level characters.
- Improvements around feat renaming (when options are selected) to reduce duplicate postfixes.
- Some improvements around Gate Thresholds.

# 0.8.1

- Ignore Imprecise Scent warning as sense applied correctly.
- Some improvement to feat location placements from granted items.
- Slight tweak to processing order to better account for skills during class predicate evaluations.

# 0.8.0

- Support for 5.3.1 Pathfinder system attribute adjustments.
- Support detection of renamed spells if importing from Pathbuilder into v5.3.1 of Pathfinder system.

# 0.7.9

- Ensure current focus points are set after feature import.
- Improvements to Psi Amped cantrips when using the psychic-amps module.

# 0.7.8

- Throwing shields would not import correctly.

# 0.7.7

- Some features such as Raging Thrower caused failures during evaluation due to a typo.

# 0.7.6

- Fix Thaumaturgy Initiate Benefit parsing reporting as mismatch.
- Match Prodigy background.

# 0.7.5

- Some name mappings for Highhelm.
- Invested items are now marked as invested thanks to updates in Pathbuilder exports.
- Spell blending on pathbuilder is now taken into account and reflected on your imported sheet if the option is selected.

# 0.7.4

- Fixes for failure on import when background not matched.
- Academic backgrounds now match up properly.
- Fixes for some ability boosts for backgrounds and ancestry not always fully selected.
- Relaxed some ignore rules around skills in the Pathbuilder JSON output - this may increase some false "missing" notes post export, but will actually improve some feat parsing.
- Moved skill generation till after heritage selection to allow Skilled Heritage feat to be fully populated.

# 0.7.3

- Tiny things for tiny people. Tiny creatures will now have items sizes adjusted appropriately.

# 0.7.2

- Fixes for system version v5.0.2.
- Improvements to adding prepared spells for classes like cleric where spell blending may have been used on Pathmuncher.

# 0.7.1

- Alternative ability score method would not always import correctly.

# 0.7.0

- Support for v11.

# 0.6.1

- For characters exported with v67 of Pathbuilder, rituals will now be added.

# 0.6.0

- You can now select which compendiums and orders will be used when looking up entries for a character. This is a setting in the setting menu for Pathmuncher.

# 0.5.8

- Handle Magical Experiment backgrounds.

# 0.5.7

- Child of Squalor/the Puddles mapping
- Prepared Wizard spells came in odd slots.

# 0.5.6

- Map Mystic to Nexian Mystic for @Whirlmeister#2484

# 0.5.5

- Fix up for granted feats added before other feats, resulting in some bad dialogs for things like Multifarious Muse.
- Dwarfes should no longer ask about Clan Dagger/Clan Pistol choices.
- In some rare cases granted items would not always be granted. (I can't find an "in the wild" example of this happening).

# 0.5.4

- Work around for sometimes incorrect key ability on champions in Pathbuilder JSON.
- Some name matching updates between Pathbuilder/Foundry.

# 0.5.3

- Enhanced detection for some feats and features such as the Scholar backgorund.

# 0.5.2

- Support having multiple containers with the same name.

# 0.5.1

- Container support. Items now appear in containers! Neat!

# 0.5.0

- Some underlying changes for upcoming custom/third party compendium support.
- Support new prepared spells in Pathbuilder v66 export.
- Support changes to familiar data in Pathbuilder v66.
- Abilities are now set properly, rather than as an override, thanks to changes in Pathbuilder v66 export.

# 0.4.4

- Characters would not get focus points set as available.
- Removed Focus Spells warning, as Pathbuilder now supplies tradition.

# 0.4.3

- Familiars would not create a correctly named folder.

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
