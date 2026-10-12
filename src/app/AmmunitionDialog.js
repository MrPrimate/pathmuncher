import CONSTANTS from "../constants.js";
import { render } from "./Templates.js";

const { DialogV2 } = foundry.applications.api;

const local = (key) => game.i18n.localize(`${CONSTANTS.FLAG_NAME}.Dialogs.Ammunition.${key}`);
const format = (key, data) => game.i18n.format(`${CONSTANTS.FLAG_NAME}.Dialogs.Ammunition.${key}`, data);

/** A stack added by hand starts as a compendium stack does. */
const ADDED_QUANTITY = 10;

const quantity = (stack) => Math.max(0, Math.floor(Number(stack.querySelector("input").value) || 0));

export class AmmunitionDialog {

  /**
   * Asks which of the build's weapons gets the ammunition Pathbuilder lists once (see
   * EquipmentBuilder#assignAmmunition). stacks: [{ id, name, qty }], the build's entries; targets:
   * [{ id, name, img, weapons: [{ name, img }] }], the ammunition each weapon takes. Stacks are dragged
   * onto weapons, and can be split, removed or added. Resolves to [{ source (a stack's id, or null for
   * one added here), target, qty }] for the stacks given to a weapon, or null if the user cancels.
   */
  static async choose({ stacks, targets }) {
    // a stack added by hand, ready to add at once
    const addedStack = await render("ammoStack", { source: "", name: local("Added"), qty: ADDED_QUANTITY });
    const onRender = (_event, dialog) => {
      const root = dialog.element.querySelector(".pathmuncher-ammunition");
      let dragged = null;

      const refresh = () => {
        for (const stack of root.querySelectorAll(".pathmuncher-ammo-stack")) {
          stack.querySelector('[data-ammo-action="split"]').disabled = quantity(stack) < 2;
        }
        for (const zone of root.querySelectorAll(".pathmuncher-ammo-weapons .pathmuncher-ammo-zone")) {
          const total = [...zone.querySelectorAll(".pathmuncher-ammo-stack")].reduce((sum, stack) => sum + quantity(stack), 0);
          zone.querySelector(".pathmuncher-ammo-total").textContent = total > 0 ? String(total) : "";
        }
      };

      root.addEventListener("click", (event) => {
        const button = event.target.closest("[data-ammo-action]");
        if (!button) return;
        const stack = button.closest(".pathmuncher-ammo-stack");
        switch (button.dataset.ammoAction) {
          case "split": {
            const qty = quantity(stack);
            if (qty < 2) return;
            const half = stack.cloneNode(true);
            stack.querySelector("input").value = Math.ceil(qty / 2);
            half.querySelector("input").value = Math.floor(qty / 2);
            stack.after(half);
            break;
          }
          case "remove":
            stack.remove();
            break;
          case "add":
            button.closest(".pathmuncher-ammo-zone").querySelector(".pathmuncher-ammo-stacks").insertAdjacentHTML("beforeend", addedStack);
            break;
          // no default
        }
        refresh();
      });
      root.addEventListener("input", refresh);
      // Enter in a quantity would otherwise submit the dialog
      root.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && event.target.matches("input")) event.preventDefault();
      });

      // a stack is dragged by anything but its quantity and buttons, so the quantity can be selected
      root.addEventListener("pointerdown", (event) => {
        const stack = event.target.closest(".pathmuncher-ammo-stack");
        if (stack) stack.draggable = !event.target.closest("input, button");
      });
      root.addEventListener("dragstart", (event) => {
        dragged = event.target.closest?.(".pathmuncher-ammo-stack") ?? null;
        if (!dragged) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-pathmuncher-ammo", dragged.dataset.source);
        dragged.classList.add("dragging");
      });
      root.addEventListener("dragend", () => {
        dragged?.classList.remove("dragging");
        dragged = null;
        for (const zone of root.querySelectorAll(".drag-over")) zone.classList.remove("drag-over");
      });
      root.addEventListener("dragover", (event) => {
        const zone = event.target.closest(".pathmuncher-ammo-zone");
        if (!dragged || !zone) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        zone.classList.add("drag-over");
      });
      root.addEventListener("dragleave", (event) => {
        const zone = event.target.closest(".pathmuncher-ammo-zone");
        if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove("drag-over");
      });
      root.addEventListener("drop", (event) => {
        const zone = event.target.closest(".pathmuncher-ammo-zone");
        if (!dragged || !zone) return;
        event.preventDefault();
        event.stopPropagation();
        zone.classList.remove("drag-over");
        zone.querySelector(".pathmuncher-ammo-stacks").append(dragged);
        refresh();
      });

      refresh();
    };

    const result = await DialogV2.wait({
      window: { title: `${CONSTANTS.FLAG_NAME}.Dialogs.Ammunition.Title`, icon: "fas fa-person-rifle" },
      position: { width: 640 },
      classes: ["pathmuncher", "pathmuncher-ammunition-dialog"],
      content: await render("ammunition", {
        stacks: stacks.map((s) => ({ source: s.id, name: s.name, qty: s.qty })),
        targets: targets.map((target) => ({
          id: target.id,
          img: target.weapons[0]?.img ?? target.img,
          weapons: target.weapons.map((w) => w.name).join(", "),
          takes: format("Takes", { ammo: target.name }),
        })),
      }),
      rejectClose: false,
      render: onRender,
      buttons: [
        {
          action: "import",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.Ammunition.Import`,
          icon: "fas fa-file-import",
          default: true,
          callback: (_event, button) => [...button.form.querySelectorAll(".pathmuncher-ammo-weapons .pathmuncher-ammo-zone")]
            .flatMap((zone) => [...zone.querySelectorAll(".pathmuncher-ammo-stack")].map((stack) => ({
              source: stack.dataset.source || null,
              target: zone.dataset.target,
              qty: quantity(stack),
            })))
            .filter((a) => a.qty > 0),
        },
        {
          action: "cancel",
          label: `${CONSTANTS.FLAG_NAME}.Dialogs.Ammunition.Cancel`,
          icon: "fas fa-times",
        },
      ],
    });
    return Array.isArray(result) ? result : null;
  }

}
