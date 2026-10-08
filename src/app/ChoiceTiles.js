/** The option tiles the import dialogs share: an icon or image with a name, picked like a radio button. */

export const escape = (text) => foundry.utils.escapeHTML(String(text ?? ""));

/** Plain text of a description, cut down to a tooltip. */
export function clip(html, length = 400) {
  const text = String(html ?? "").replace(/@\w+\[[^\]]*\](?:\{([^}]*)\})?/g, (_, label) => label ?? "")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

export const tile = ({ name, value, label, img, icon, tooltip, special, data = "" }) => `
  <label class="pathmuncher-tile" ${tooltip ? `data-tooltip-html="${escape(tooltip)}"` : ""} ${data}>
    <input type="radio" name="${escape(name)}" value="${escape(value)}" ${special ? `data-special="${escape(special)}"` : ""}>
    ${img ? `<img src="${escape(img)}" alt="" loading="lazy">` : `<i class="${escape(icon)}" inert></i>`}
    <span>${escape(label)}</span>
  </label>`;
