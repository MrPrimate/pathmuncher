import CONSTANTS from "../constants.js";
import {
  choiceSpecial,
  deityConflicts,
  deityDomains,
  deityFonts,
  deitySanctifications,
} from "./DeityChoices.js";
import { clip, escape, tile } from "./ChoiceTiles.js";

const { DialogV2 } = foundry.applications.api;

const local = (key) => game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.DeityConflict.${key}`);
const format = (key, data) => game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.DeityConflict.${key}`, data);

const FONT_IMAGES = {
  heal: "icons/magic/life/cross-worn-green.webp",
  harm: "systems/pf2e/icons/spells/harm.webp",
};

const SANCTIFICATION_ICONS = {
  holy: "fas fa-sun",
  unholy: "fas fa-skull",
  none: "fas fa-scale-balanced",
};

const DOMAIN_ICONS = {
  abomination: "fa-spaghetti-monster-flying", air: "fa-wind", ambition: "fa-crown", change: "fa-shuffle",
  cities: "fa-city", cold: "fa-snowflake", confidence: "fa-person-rays", creation: "fa-hammer",
  darkness: "fa-moon", death: "fa-skull", decay: "fa-biohazard", delirium: "fa-face-dizzy",
  destruction: "fa-explosion", dreams: "fa-cloud-moon", dust: "fa-smog", duty: "fa-shield-halved",
  earth: "fa-mountain", family: "fa-people-roof", fate: "fa-dice", fire: "fa-fire", freedom: "fa-dove",
  glyph: "fa-signature", healing: "fa-heart-pulse", indulgence: "fa-wine-glass", introspection: "fa-eye",
  knowledge: "fa-book-open", lightning: "fa-bolt", luck: "fa-clover", magic: "fa-wand-sparkles",
  metal: "fa-cubes", might: "fa-hand-fist", moon: "fa-moon", naga: "fa-staff-snake", nature: "fa-leaf",
  nightmares: "fa-ghost", pain: "fa-bone", passion: "fa-heart", perfection: "fa-gem", plague: "fa-virus",
  protection: "fa-shield", repose: "fa-bed", secrecy: "fa-user-secret", sorrow: "fa-face-sad-tear",
  soul: "fa-ankh", star: "fa-star", sun: "fa-sun", swarm: "fa-bugs", time: "fa-hourglass-half",
  toil: "fa-person-digging", travel: "fa-route", trickery: "fa-masks-theater", truth: "fa-scale-balanced",
  tyranny: "fa-gavel", undeath: "fa-skull-crossbones", vigil: "fa-tower-observation", void: "fa-circle-half-stroke",
  water: "fa-water", wealth: "fa-coins", wood: "fa-tree", wyrmkin: "fa-dragon", zeal: "fa-fire-flame-curved",
};

const titleCase = (slug) => String(slug).split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function domainLabel(slug) {
  const label = CONFIG.PF2E?.deityDomains?.[slug]?.label;
  return label ? game.i18n.localize(label) : titleCase(slug);
}

function domainDescription(slug) {
  const description = CONFIG.PF2E?.deityDomains?.[slug]?.description;
  return description ? game.i18n.localize(description) : "";
}

const fontLabel = (font) => local(`Font.${font}`);
const sanctificationLabel = (value) => local(`Sanctification.${value}`);

function weaponLabel(slug) {
  const label = CONFIG.PF2E?.baseWeaponTypes?.[slug] ?? CONFIG.PF2E?.baseShieldTypes?.[slug];
  return label ? game.i18n.localize(label) : titleCase(slug);
}

/** The deity's sanctification, as the deity sheet words it. */
function sanctificationText(deity) {
  const sanctification = deity.system?.sanctification;
  if (!sanctification?.what?.length) return game.i18n.localize("PF2E.Item.Deity.Sanctification.None");
  const modal = sanctification.modal === "must" ? "Must" : "Can";
  const what = sanctification.what.length > 1 ? "HolyUnholy" : titleCase(sanctification.what[0]);
  return game.i18n.localize(`PF2E.Item.Deity.Sanctification.${modal}.${what}`);
}

/** A tooltip listing what a deity allows its followers. */
function deityTooltip(deity) {
  const rows = [
    [game.i18n.localize("PF2E.Item.Deity.Domains.Primary"), deityDomains(deity).map(domainLabel).join(", ")],
    [game.i18n.localize("PF2E.Item.Deity.Domains.Alternate.Label"), (deity.system?.domains?.alternate ?? []).map(domainLabel).join(", ")],
    [game.i18n.localize("PF2E.Item.Deity.DivineFont.Label"), deityFonts(deity).map(fontLabel).join(", ")],
    [game.i18n.localize("PF2E.Item.Deity.Sanctification.Label"), sanctificationText(deity)],
    [game.i18n.localize("PF2E.Item.Deity.FavoredWeapons.Label"), (deity.system?.weapons ?? []).map(weaponLabel).join(", ")],
  ].filter(([, value]) => value);
  return `<div class="pathmuncher-deity-tooltip"><strong>${escape(deity.name)}</strong>
    <dl>${rows.map(([label, value]) => `<dt>${escape(label)}</dt><dd>${escape(value)}</dd>`).join("")}</dl></div>`;
}

/** What the conflicting choice is and why the deity does not allow it. */
function conflictText(conflict, deity) {
  switch (conflict.kind) {
    case "domain": return format("Conflicts.domain", { domain: domainLabel(conflict.value), deity: deity.name });
    case "font": return format("Conflicts.font", { font: fontLabel(conflict.value), deity: deity.name });
    case "sanctification": return format("Conflicts.sanctification", { sanctification: sanctificationLabel(conflict.value), deity: deity.name });
    case "cause": return format("Conflicts.cause", { cause: conflict.name, sanctification: sanctificationLabel(conflict.value), deity: deity.name });
    default: return conflict.special;
  }
}

/** The replacements the deity allows for a conflicting choice, as tiles. */
function conflictOptions(conflict, { deity, choices, causes }) {
  switch (conflict.kind) {
    case "domain": {
      // the build's other domains that the deity allows stay as they are
      const kept = new Set(choices.domains.map((d) => d.slug));
      return deityDomains(deity, choices.alternateDomains)
        .filter((slug) => !kept.has(slug) && !slug.endsWith("-apocryphal"))
        .map((slug) => ({
          value: slug,
          label: domainLabel(slug),
          icon: `fas ${DOMAIN_ICONS[slug] ?? "fa-circle-nodes"}`,
          tooltip: `<strong>${escape(domainLabel(slug))}</strong><p>${escape(domainDescription(slug))}</p>`,
          special: choiceSpecial("domain", slug),
        }));
    }
    case "font":
      return deityFonts(deity).map((font) => ({
        value: font,
        label: fontLabel(font),
        img: FONT_IMAGES[font],
        tooltip: `<p>${escape(local(`FontHint.${font}`))}</p>`,
        special: choiceSpecial("font", font),
      }));
    case "sanctification":
      return deitySanctifications(deity).map((value) => ({
        value,
        label: sanctificationLabel(value),
        icon: SANCTIFICATION_ICONS[value],
        tooltip: `<p>${escape(local(`SanctificationHint.${value}`))}</p>`,
        special: choiceSpecial("sanctification", value),
      }));
    case "cause":
      return causes.map((cause) => ({
        value: cause.uuid,
        label: cause.name,
        img: cause.img,
        tooltip: `<strong>${escape(cause.name)}</strong><p>${escape(clip(cause.description))}</p>`,
        special: choiceSpecial("cause", cause.value, cause.name),
      }));
    default:
      return [];
  }
}

function deityTile(deity) {
  return tile({
    name: "deity",
    value: deity.uuid,
    label: deity.name,
    img: deity.img,
    tooltip: deityTooltip(deity),
    data: `data-search="${escape(deity.name.toLowerCase())}"`,
  });
}

function renderContent(conflict) {
  const { deity, conflicts, deities } = conflict;
  const picks = conflicts.map((c, index) => {
    const options = conflictOptions(c, conflict);
    const tiles = options.length
      ? options.map((option) => tile({ ...option, name: `pick-${index}` })).join("")
      : `<p class="hint">${escape(local("NoOptions"))}</p>`;
    const choice = { cause: c.name, sanctification: sanctificationLabel(c.value) }[c.kind] ?? c.special;
    return `<fieldset class="pathmuncher-deity-pick" data-special="${escape(c.special)}" data-index="${index}">
      <legend>${escape(format(`Replace.${c.kind}`, { choice }))}</legend>
      <div class="pathmuncher-tiles">${tiles}</div>
    </fieldset>`;
  }).join("");

  const deityTiles = deities.map(deityTile).join("");

  return `<div class="pathmuncher-deity-conflict">
    <header class="pathmuncher-deity-current" data-tooltip-html="${escape(deityTooltip(deity))}">
      <img src="${escape(deity.img)}" alt="">
      <div>
        <span class="pathmuncher-deity-label">${escape(local("BuiltWith"))}</span>
        <span class="pathmuncher-deity-name">${escape(deity.name)}</span>
      </div>
    </header>
    <p class="hint">${escape(local("Content"))}</p>
    <ul class="pathmuncher-deity-conflicts">
      ${conflicts.map((c) => `<li><i class="fas fa-triangle-exclamation" inert></i> ${escape(conflictText(c, deity))}</li>`).join("")}
    </ul>

    <section class="pathmuncher-deity-route" data-route="choices">
      <label class="pathmuncher-deity-route-header">
        <input type="radio" name="route" value="choices">
        <span><strong>${escape(format("KeepDeity", { deity: deity.name }))}</strong>
        <span class="hint">${escape(local("KeepDeityHint"))}</span></span>
      </label>
      ${picks}
    </section>

    <section class="pathmuncher-deity-route" data-route="deity">
      <label class="pathmuncher-deity-route-header">
        <input type="radio" name="route" value="deity">
        <span><strong>${escape(local("KeepChoices"))}</strong>
        <span class="hint">${escape(format("KeepChoicesHint", { count: deities.length }))}</span></span>
      </label>
      <input type="search" class="pathmuncher-deity-search" placeholder="${escape(local("Search"))}" aria-label="${escape(local("Search"))}"
        ${deities.length ? "" : "hidden"}>
      <div class="pathmuncher-tiles pathmuncher-deity-tiles">${deityTiles}</div>
      <p class="hint pathmuncher-deity-none" ${deities.length ? "hidden" : ""}>${escape(local("NoDeities"))}</p>
      <button type="button" class="pathmuncher-drop-zone">
        <i class="fas fa-arrow-down-to-bracket" inert></i>
        <span>${escape(local("Drop"))}</span>
      </button>
    </section>
  </div>`;
}

export class DeityConflictDialog {

  /**
   * Asks how to settle the build's choices that its deity does not allow (see
   * Pathmuncher#findDeityConflict). Resolves to { deity: Item }, { specials: { old: new } }, {} to
   * import the build as it is, or null if the user cancels the import.
   */
  static async choose(conflict) {
    // deities dropped onto the dialog, by the uuid their tile was given
    const dropped = new Map();

    const selection = (form) => {
      const route = form.querySelector('input[name="route"]:checked')?.value;
      if (route === "deity") {
        const uuid = form.querySelector('input[name="deity"]:checked')?.value;
        return uuid ? { route, uuid } : null;
      }
      if (route === "choices") {
        const specials = {};
        for (const pick of form.querySelectorAll(".pathmuncher-deity-pick")) {
          const chosen = pick.querySelector("input:checked");
          if (!chosen) return null;
          specials[pick.dataset.special] = chosen.dataset.special;
        }
        return { route, specials };
      }
      return null;
    };

    const onRender = (_event, dialog) => {
      const form = dialog.element.querySelector("form") ?? dialog.element;
      const importButton = dialog.element.querySelector('button[data-action="import"]');

      const sync = () => {
        for (const section of form.querySelectorAll(".pathmuncher-deity-route")) {
          section.classList.toggle("active", section.querySelector('input[name="route"]').checked);
        }
        // a domain picked for one conflict is not offered for another
        const picked = [...form.querySelectorAll(".pathmuncher-deity-pick input:checked")];
        for (const input of form.querySelectorAll(".pathmuncher-deity-pick input")) {
          const takenElsewhere = picked.some((p) => p !== input && p.name !== input.name && p.dataset.special === input.dataset.special);
          input.disabled = takenElsewhere;
          input.closest(".pathmuncher-tile").classList.toggle("disabled", takenElsewhere);
        }
        if (importButton) importButton.disabled = !selection(form);
      };

      // choosing anything in a section chooses that way of settling the conflict
      form.addEventListener("change", (event) => {
        const section = event.target.closest(".pathmuncher-deity-route");
        if (event.target.name !== "route" && section) section.querySelector('input[name="route"]').checked = true;
        sync();
      });

      const search = form.querySelector(".pathmuncher-deity-search");
      search?.addEventListener("input", () => {
        const term = search.value.trim().toLowerCase();
        for (const deityTile of form.querySelectorAll(".pathmuncher-deity-tiles .pathmuncher-tile")) {
          deityTile.hidden = term !== "" && !deityTile.dataset.search.includes(term) && !deityTile.querySelector("input").checked;
        }
      });
      // Enter in the search box would otherwise submit the dialog
      search?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") event.preventDefault();
      });

      const zone = form.querySelector(".pathmuncher-drop-zone");
      zone.addEventListener("click", () => {
        const packs = conflict.packs.map((id) => game.packs.get(id)).filter(Boolean);
        (packs.find((p) => p.metadata.packageName === game.system.id) ?? packs[0])?.render({ force: true });
      });
      zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("drag-over");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
      zone.addEventListener("drop", async (event) => {
        event.preventDefault();
        zone.classList.remove("drag-over");
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
        const item = data?.type === "Item" ? await fromUuid(data.uuid) : null;
        if (item?.type !== "deity") {
          ui.notifications.warn(local("WrongType"));
          return;
        }
        const remaining = deityConflicts(item, conflict.choices);
        if (remaining.length > 0) {
          ui.notifications.warn(format("StillConflicts", { deity: item.name, count: remaining.length }));
        }
        dropped.set(item.uuid, item);
        const tiles = form.querySelector(".pathmuncher-deity-tiles");
        let input = [...tiles.querySelectorAll('input[name="deity"]')].find((i) => i.value === item.uuid);
        if (!input) {
          tiles.insertAdjacentHTML("afterbegin", deityTile({ name: item.name, img: item.img, uuid: item.uuid, system: item.system }));
          input = tiles.querySelector('input[name="deity"]');
          form.querySelector(".pathmuncher-deity-none").hidden = true;
        }
        input.closest(".pathmuncher-tile").hidden = false;
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.closest(".pathmuncher-tile").scrollIntoView({ block: "nearest" });
      });

      sync();
    };

    const result = await DialogV2.wait({
      window: { title: `${CONSTANTS.FLAG_NAME}.Dialogs.DeityConflict.Title`, icon: "fas fa-place-of-worship" },
      position: { width: 640 },
      classes: ["pathmuncher", "pathmuncher-deity-conflict-dialog"],
      content: renderContent(conflict),
      rejectClose: false,
      render: onRender,
      buttons: [
        {
          action: "import",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.DeityConflict.Import`,
          icon: "fas fa-file-import",
          default: true,
          callback: async (_event, button) => {
            const chosen = selection(button.form);
            if (!chosen) return "asBuilt";
            if (chosen.route === "choices") return { specials: chosen.specials };
            return { deity: dropped.get(chosen.uuid) ?? await fromUuid(chosen.uuid) };
          },
        },
        {
          action: "asBuilt",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.DeityConflict.AsBuilt`,
          icon: "fas fa-forward",
        },
        {
          action: "cancel",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.DeityConflict.Cancel`,
          icon: "fas fa-times",
        },
      ],
    });
    if (result === "asBuilt") return {};
    return result && result !== "cancel" ? result : null;
  }

}
