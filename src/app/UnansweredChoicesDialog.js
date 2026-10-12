import CONSTANTS from "../constants.js";
import { clip, escape, tile } from "./ChoiceTiles.js";

const { DialogV2 } = foundry.applications.api;

const local = (key) => game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.UnansweredChoices.${key}`);

/** Above this many options, a choice gets a filter box. */
const FILTER_FROM = 12;

/**
 * Where a choice's item comes from, and what other copies of it already chose (a second Assurance
 * cannot take a skill the first has): "Granted by Gnome Obsession. Already chosen on another
 * Assurance: Occultism (from Scholar)."
 */
function notes(entry) {
  const format = (key, data) => game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.UnansweredChoices.${key}`, data);
  const lines = [];
  if (entry.origin) lines.push(format("GrantedBy", { item: entry.origin }));
  if (entry.taken?.length) {
    const list = entry.taken.map((t) => (t.source ? format("TakenFrom", { choice: t.label, source: t.source }) : t.label)).join(", ");
    lines.push(format("Taken", { item: entry.item.name.split("(")[0].trim(), list }));
  }
  return lines.map((line) => `<p class="hint pathmuncher-choice-note">${escape(line)}</p>`).join("");
}

/** The localized label of a trait, whichever list it is in. */
function traitLabel(trait) {
  const lists = ["featTraits", "classTraits", "actionTraits", "ancestryTraits", "weaponTraits", "rarityTraits"];
  const key = lists.map((list) => CONFIG.PF2E?.[list]?.[trait]).find(Boolean);
  return key ? game.i18n.localize(key) : trait;
}

/**
 * What the item asking is, to help choose: its category and level and traits, the Pathbuilder slot it
 * was taken in, and its description, which scrolls when it is long.
 */
function details(entry, description) {
  const info = entry.details;
  if (!info) return "";
  const format = (key, data) => game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.UnansweredChoices.${key}`, data);
  const category = info.category
    ? game.i18n.localize(CONFIG.PF2E?.featCategories?.[info.category] ?? info.category)
    : game.i18n.localize(CONFIG.Item?.typeLabels?.[entry.item.type] ?? entry.item.type);
  const kind = info.level ? format("Level", { kind: category, level: info.level }) : category;
  const traits = [...(info.rarity && info.rarity !== "common" ? [info.rarity] : []), ...info.traits]
    .map((t) => `<span class="pathmuncher-choice-trait">${escape(traitLabel(t))}</span>`).join("");
  const slot = info.slot
    ? `<p class="hint pathmuncher-choice-note">${escape(format("Slot", { slot: info.slot.type, level: info.slot.level ?? "?" }))}</p>`
    : "";
  return `<div class="pathmuncher-choice-meta"><span class="pathmuncher-choice-kind">${escape(kind)}</span>${traits}</div>
    ${slot}
    ${description ? `<div class="pathmuncher-choice-description">${description}</div>` : ""}`;
}

function renderContent(unanswered, descriptions = []) {
  const rows = unanswered.map((entry, index) => {
    const tiles = entry.choices.map((choice) => tile({
      name: entry.id,
      value: choice.value,
      label: choice.label,
      img: choice.img,
      icon: "fas fa-circle-question",
      data: `data-search="${escape(choice.label.toLowerCase())}" ${choice.uuid ? `data-uuid="${escape(choice.uuid)}"` : ""}`,
    })).join("");
    const filter = entry.choices.length > FILTER_FROM
      ? `<input type="search" class="pathmuncher-choice-search" placeholder="${escape(local("Search"))}" aria-label="${escape(local("Search"))}">`
      : "";
    return `<fieldset class="pathmuncher-unanswered" data-id="${escape(entry.id)}">
      <legend>
        <img src="${escape(entry.item.img)}" alt="">
        <span>${escape(entry.item.name)}</span>
        <button type="button" class="pathmuncher-choice-clear" data-tooltip="${escape(local("Clear"))}" aria-label="${escape(local("Clear"))}" hidden>
          <i class="fas fa-rotate-left" inert></i>
        </button>
      </legend>
      ${details(entry, descriptions[index])}
      ${notes(entry)}
      ${entry.prompt ? `<p class="pathmuncher-choice-prompt">${escape(entry.prompt)}</p>` : ""}
      ${filter}
      <div class="pathmuncher-tiles pathmuncher-choice-tiles">${tiles}</div>
    </fieldset>`;
  }).join("");
  return `<div class="pathmuncher-unanswered-choices">
    <p class="hint">${escape(local("Content"))}</p>
    ${rows}
  </div>`;
}

/** Shows a compendium option's description on hover, loaded the first time it is hovered. */
async function describeOnHover(optionTile) {
  if (optionTile.dataset.tooltipHtml !== undefined || optionTile.dataset.loading) return;
  optionTile.dataset.loading = "true";
  const item = await fromUuid(optionTile.dataset.uuid);
  delete optionTile.dataset.loading;
  if (!item) return;
  const traits = (item.system?.traits?.value ?? []).map((t) => game.i18n.localize(CONFIG.PF2E?.weaponTraits?.[t] ?? CONFIG.PF2E?.featTraits?.[t] ?? t));
  optionTile.dataset.tooltipHtml = `<strong>${escape(item.name)}</strong>
    ${traits.length ? `<p><em>${escape(traits.join(", "))}</em></p>` : ""}
    <p>${escape(clip(item.system?.description?.value))}</p>`;
  if (optionTile.matches(":hover")) game.tooltip.activate(optionTile);
}

export class UnansweredChoicesDialog {

  /**
   * Asks for the choices the build doesn't answer, all at once, before the actor is changed (see
   * Pathmuncher#unansweredChoiceList). Resolves to the picks by choice id ({ id: value }); a choice
   * left unpicked is asked by the system during the import. Resolves to null if the user cancels.
   */
  static async choose(unanswered) {
    // each item's description, its links and inline rolls made ready to show
    const enrich = (html) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", { secrets: false });
    const descriptions = await Promise.all(unanswered.map((entry) => (entry.details?.description ? enrich(entry.details.description) : "")));
    const onRender = (_event, dialog) => {
      const form = dialog.element.querySelector("form") ?? dialog.element;

      for (const row of form.querySelectorAll(".pathmuncher-unanswered")) {
        const clear = row.querySelector(".pathmuncher-choice-clear");
        row.addEventListener("change", () => {
          clear.hidden = !row.querySelector("input[type=radio]:checked");
        });
        clear.addEventListener("click", () => {
          for (const input of row.querySelectorAll("input[type=radio]")) input.checked = false;
          clear.hidden = true;
        });

        const search = row.querySelector(".pathmuncher-choice-search");
        search?.addEventListener("input", () => {
          const term = search.value.trim().toLowerCase();
          for (const option of row.querySelectorAll(".pathmuncher-tile")) {
            option.hidden = term !== "" && !option.dataset.search.includes(term) && !option.querySelector("input").checked;
          }
        });
        // Enter in the filter box would otherwise submit the dialog
        search?.addEventListener("keydown", (event) => {
          if (event.key === "Enter") event.preventDefault();
        });
      }

      for (const option of form.querySelectorAll(".pathmuncher-tile[data-uuid]")) {
        option.addEventListener("pointerenter", () => describeOnHover(option));
      }
    };

    const result = await DialogV2.wait({
      window: { title: `${CONSTANTS.FLAG_NAME}.Dialogs.UnansweredChoices.Title`, icon: "fas fa-list-check" },
      position: { width: 640 },
      classes: ["pathmuncher", "pathmuncher-unanswered-choices-dialog"],
      content: renderContent(unanswered, descriptions),
      rejectClose: false,
      render: onRender,
      buttons: [
        {
          action: "import",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.UnansweredChoices.Import`,
          icon: "fas fa-file-import",
          default: true,
          callback: (_event, button) => Object.fromEntries(unanswered
            .map((entry) => [entry.id, button.form.querySelector(`input[name="${CSS.escape(entry.id)}"]:checked`)?.value])
            .filter(([, value]) => value !== undefined)),
        },
        {
          action: "cancel",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.UnansweredChoices.Cancel`,
          icon: "fas fa-times",
        },
      ],
    });
    return result && result !== "cancel" ? result : null;
  }

}
