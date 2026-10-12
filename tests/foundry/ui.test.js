// The user interface: the sheet button, the importer window, the compendium selector and the
// settings menus.
(() => {
  const { test } = pmt;
  const api = () => game.modules.get("pathmuncher").api;
  const fixture = (name) => foundry.utils.deepClone(pmt.fixtures[name]);

  test("ui: the importer fits the screen, its form scrolling with the import button below it", async (t) => {
    const actor = await pmt.actor(t, "ui fits");
    const app = await pmt.openImporter(actor);
    t.cleanup(() => app.close());
    const style = (selector) => getComputedStyle(selector ? app.element.querySelector(selector) : app.element);
    t.ok(style().maxHeight !== "none", `the window is no taller than the screen: ${style().maxHeight}`);
    t.equal(style(".pathmuncher-importer-body").overflowY, "auto", "the form scrolls");
    const body = app.element.querySelector(".pathmuncher-importer-body").getBoundingClientRect();
    const button = app.element.querySelector("button[type='submit']").getBoundingClientRect();
    t.ok(button.top >= body.bottom - 1, "the import button is below the form, not in it");
  });

  test("ui: the character sheet has a Pathmuncher button that opens the importer once", async (t) => {
    const actor = await pmt.actor(t, "sheet button");
    await actor.sheet.render(true);
    t.cleanup(() => actor.sheet.close());
    for (let i = 0; i < 50 && !actor.sheet.rendered; i++) await pmt.sleep(100);
    const sheetElement = actor.sheet.element?.[0] ?? actor.sheet.element;
    const button = sheetElement.querySelector(".pathmuncher-open");
    t.ok(button, "no Pathmuncher button in the sheet header");

    // Application v1 wires header buttons 500 ms after rendering
    await pmt.sleep(700);
    const id = `pathmuncher-importer-${actor.id}`;
    button.click();
    for (let i = 0; i < 50 && !foundry.applications.instances.get(id)?.rendered; i++) await pmt.sleep(100);
    const importer = foundry.applications.instances.get(id);
    t.cleanup(() => importer?.close());
    t.ok(importer?.rendered, "importer not opened");
    t.ok(importer.title.includes(actor.name), `title "${importer.title}" should name the actor`);

    button.click();
    await pmt.sleep(300);
    const open = [...foundry.applications.instances.values()].filter((a) => a.id === id);
    t.equal(open.length, 1, "a second click should reuse the open importer");
  });

  test("ui: a Pathbuilder JSON file imports the character", async (t) => {
    const exportJson = fixture("314710-gunslinger1");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "file import");

    const state = await pmt.submitImporter(actor, { file: exportJson });

    t.ok(state.closed, "importer should close after the import");
    t.equal(actor.class?.name, "Gunslinger");
  });

  test("ui: choosing the file source without a file says so and changes nothing", async (t) => {
    const actor = await pmt.actor(t, "file missing");
    const notes = pmt.captureNotifications(t);
    const app = await pmt.openImporter(actor);
    t.cleanup(() => app.close());
    app.element.querySelector("[data-action='setSource'][data-source='file']").click();
    app.element.querySelector("button[type='submit']").click();
    await pmt.sleep(500);
    t.ok(notes.some((n) => n.type === "error" && n.message.includes("JSON file")), JSON.stringify(notes));
    t.equal(actor.items.size, 0, "items");
    t.equal(app.element.querySelector("button[type='submit']").disabled, false, "import button usable again");
  });

  test("ui: the importer remembers the options of the last import", async (t) => {
    const exportJson = fixture("314710-gunslinger1");
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "remember options");
    await pmt.submitImporter(actor, { json: exportJson, options: { addMoney: false, addLores: false } });
    t.equal(actor.inventory.coins.gp, 0, "money was not imported");

    const app = await pmt.openImporter(actor);
    t.cleanup(() => app.close());
    const checked = (key) => app.element.querySelector(`input[name='options.${key}']`).checked;
    t.equal(checked("addMoney"), false, "money");
    t.equal(checked("addLores"), false, "lores");
    t.equal(checked("addFeats"), true, "feats");
  });

  test("ui: All and None set every option in a group", async (t) => {
    const actor = await pmt.actor(t, "select all");
    const app = await pmt.openImporter(actor);
    t.cleanup(() => app.close());
    const group = (id) => [...app.element.querySelectorAll(`fieldset[data-group='${id}'] input[type='checkbox']`)];

    app.element.querySelector("[data-action='selectAll'][data-group='Inventory'][data-value='false']").click();
    t.ok(group("Inventory").every((i) => !i.checked), "inventory none");
    t.ok(group("Character").every((i) => i.checked), "other groups untouched");
    app.element.querySelector("[data-action='selectAll'][data-group='Inventory'][data-value='true']").click();
    t.ok(group("Inventory").every((i) => i.checked), "inventory all");
  });

  test("ui: blended slots can only be chosen while spells are imported", async (t) => {
    const actor = await pmt.actor(t, "blended toggle");
    const app = await pmt.openImporter(actor);
    t.cleanup(() => app.close());
    const spells = app.element.querySelector("input[name='options.addSpells']");
    const blended = app.element.querySelector("input[name='options.adjustBlendedSlots']");
    t.equal(blended.disabled, false, "enabled with spells");
    spells.checked = false;
    spells.dispatchEvent(new Event("change"));
    t.equal(blended.disabled, true, "disabled without spells");
  });

  test("ui: the compendium selector adds, orders and resets a lookup's compendiums", async (t) => {
    const before = foundry.utils.deepClone(game.settings.get("pathmuncher", "custom-compendium-mappings"));
    t.cleanup(() => game.settings.set("pathmuncher", "custom-compendium-mappings", before));
    const app = new (api().CompendiumSelector)();
    await app.render({ force: true });
    t.cleanup(() => app.close());
    const wait = async (fn) => {
      for (let i = 0; i < 50 && !fn(); i++) await pmt.sleep(100);
    };
    await wait(() => app.element?.querySelector("select[name='type']"));

    const typeSelect = app.element.querySelector("select[name='type']");
    typeSelect.value = "feats";
    typeSelect.dispatchEvent(new Event("change"));
    await wait(() => app.element.querySelector("select[name='available']"));
    const searched = () => game.settings.get("pathmuncher", "custom-compendium-mappings").feats;
    const start = [...searched()];

    // add the first available compendium; it goes to the end of the search order
    const available = app.element.querySelector("select[name='available']");
    const added = available.options[0].value;
    available.options[0].selected = true;
    app.element.querySelector("[data-action='add']").click();
    await wait(() => searched().includes(added));
    t.equal(searched().at(-1), added, "added last");

    // move it up one place
    await wait(() => app.element.querySelector(`select[name='searched'] option[value='${added}']`));
    app.element.querySelector(`select[name='searched'] option[value='${added}']`).selected = true;
    app.element.querySelector("[data-action='up']").click();
    await wait(() => searched().at(-2) === added);
    t.equal(searched().at(-2), added, "moved up");

    app.element.querySelector("[data-action='reset']").click();
    await wait(() => searched().length === start.length && !searched().includes(added));
    t.deepEqual(searched(), api().CONSTANTS.GET_DEFAULT_SETTINGS()["custom-compendium-mappings"].default.feats, "reset to defaults");
  });

  test("ui: ammunition is split, dragged onto guns and added to in the ammunition dialog", async (t) => {
    // the gunslinger's Axe Musket and Coat Pistol each take their own rounds
    const exportJson = fixture("314710-gunslinger1");
    exportJson.build.equipment.push(["Bullets (10 rounds)", 10, "Invested"]);
    await pmt.useBuildVariants(t, exportJson.build);
    pmt.answerPrompts(t, exportJson.build);
    const actor = await pmt.actor(t, "ammunition dialog");
    const seen = {};
    const hook = Hooks.on("renderDialogV2", (dialog) => {
      if (!dialog.options.classes?.includes("pathmuncher-ammunition-dialog")) return;
      const el = dialog.element;
      const zone = (target) => el.querySelector(`.pathmuncher-ammo-zone[data-target="${target}"]`);
      const stacks = (target) => [...zone(target).querySelectorAll(".pathmuncher-ammo-stack")];
      const drag = (stack, target) => {
        const dataTransfer = new DataTransfer();
        stack.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer }));
        const into = zone(target).querySelector(".pathmuncher-ammo-stacks");
        into.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }));
        into.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
        stack.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer }));
      };
      seen.zones = [...el.querySelectorAll(".pathmuncher-ammo-zone")].map((z) => z.dataset.target).sort();

      stacks("")[0].querySelector('[data-ammo-action="split"]').click();
      seen.split = stacks("").map((s) => s.querySelector("input").value);
      const [first, second] = stacks("");
      drag(first, "rounds-axe-musket");
      drag(second, "rounds-coat-pistol");
      zone("rounds-coat-pistol").querySelector('[data-ammo-action="add"]').click();
      const added = stacks("rounds-coat-pistol").at(-1).querySelector("input");
      added.value = "3";
      added.dispatchEvent(new Event("input", { bubbles: true }));
      seen.totals = ["rounds-axe-musket", "rounds-coat-pistol"].map((target) => zone(target).querySelector(".pathmuncher-ammo-total").textContent);
      seen.left = stacks("").length;
      setTimeout(() => el.querySelector("button[data-action='import']").click(), 20);
    });
    t.cleanup(() => Hooks.off("renderDialogV2", hook));

    const state = await pmt.submitImporter(actor, { json: exportJson });

    t.ok(state.closed, "imported");
    t.deepEqual(seen.zones, ["", "rounds-axe-musket", "rounds-coat-pistol"], "the unassigned stacks and a zone for each gun");
    t.deepEqual(seen.split, ["5", "5"], "split in two");
    t.equal(seen.left, 0, "nothing left unassigned");
    t.deepEqual(seen.totals, ["5", "8"], "totals");
    const ammunition = Object.fromEntries(actor.itemTypes.ammo.map((i) => [i.name, i.quantity]));
    t.deepEqual(ammunition, { "Rounds (Axe Musket)": 5, "Rounds (Coat Pistol)": 8 }, "ammunition");
  });

  test("ui: cancelling the reset settings menu leaves the settings alone", async (t) => {
    const before = game.settings.get("pathmuncher", "log-level");
    const menu = game.settings.menus.get("pathmuncher.resetToDefaults");
    const confirm = new Promise((resolve) => {
      const hook = Hooks.on("renderDialogV2", (dialog) => {
        Hooks.off("renderDialogV2", hook);
        resolve(dialog);
      });
    });
    const opened = new menu.type().render(true);
    const dialog = await confirm;
    t.ok(dialog.element.innerText.includes(game.i18n.localize("pathmuncher.Dialogs.ResetSettings.Content")), "asks first");
    dialog.element.querySelector("button[data-action='no']").click();
    await opened;
    t.equal(game.settings.get("pathmuncher", "log-level"), before);
  });
})();
