import CONSTANTS from "../constants.js";
import { escape, tile } from "./ChoiceTiles.js";

const { DialogV2 } = foundry.applications.api;

const format = (key, data) => game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Companion.${key}`, data);

/**
 * Asks which character a companion with no actor linked yet goes to: a new one, or one of the
 * characters it could take over (BFFBuilder.candidates).
 */
export class CompanionDialog {

  /**
   * @param {object} request  { master, pet, name, candidates } from BFFBuilder
   * @returns {Promise<{create: true}|{actor: Actor}|null>}  null to leave the companion out
   */
  static async choose({ master, pet, name, candidates }) {
    const tiles = [
      tile({ name: "companion", value: "", label: format("New", { name }), icon: "fas fa-user-plus" }),
      ...candidates.map((actor) => tile({ name: "companion", value: actor.id, label: actor.name, img: actor.img })),
    ].join("");
    const content = `<p class="hint">${escape(format("Content", { master: master.name, pet: pet.name ?? pet.animal }))}</p>
      <div class="pathmuncher-tiles pathmuncher-companion-tiles">${tiles}</div>`;

    return DialogV2.wait({
      window: { title: `${CONSTANTS.FLAG_NAME}.Dialogs.Companion.Title`, icon: "fas fa-paw" },
      position: { width: 560 },
      classes: ["pathmuncher", "pathmuncher-companion-dialog"],
      content,
      rejectClose: false,
      render: (_event, dialog) => {
        dialog.element.querySelector('input[name="companion"]').checked = true;
      },
      buttons: [
        {
          action: "import",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.Companion.Import`,
          icon: "fas fa-file-import",
          default: true,
          callback: (_event, button) => {
            const id = button.form.querySelector('input[name="companion"]:checked')?.value;
            const actor = id ? candidates.find((a) => a.id === id) : null;
            return actor ? { actor } : { create: true };
          },
        },
        { action: "skip", label: `${CONSTANTS.FLAG_NAME}.Dialogs.Companion.Skip`, icon: "fas fa-forward" },
      ],
    }).then((result) => (result === "skip" || !result ? null : result));
  }

}
