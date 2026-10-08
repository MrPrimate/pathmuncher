/**
 * The choices a Pathbuilder build makes that its deity has to allow: domains, divine font and
 * sanctification (a cleric's, or the one a champion's cause needs). Pathbuilder lets any of these be
 * picked whatever the deity, and pf2e only offers the ones the deity allows.
 *
 * Deities here are compendium index entries or item data: { name, system: { domains, font, sanctification } }.
 */

/** Pathbuilder domain names that pf2e calls something else. */
const DOMAIN_ALIASES = {
  dragon: "wyrmkin",
};

const FONT_SPECIALS = {
  "Healing Font": "heal",
  "Harmful Font": "harm",
};

const SANCTIFICATION_SPECIALS = {
  Holy: "holy",
  Unholy: "unholy",
  Neither: "none",
};

const CAUSE_PATTERN = /^(.+) Cause(?: \((Holy|Unholy)\))?$/;

/** The deity categories pf2e lets a cleric or champion follow. */
export const FOLLOWABLE_DEITY_CATEGORIES = ["deity", "pantheon", "covenant"];

export function domainSlug(name) {
  const slug = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return DOMAIN_ALIASES[slug] ?? slug;
}

const titleCase = (slug) => slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

/**
 * The deity-dependent choices in a build's specials:
 * { domains: [{ special, slug }], font: { special, value }, sanctification: { special, value }, cause: { special, name, value },
 *   alternateDomains }
 * A cause's value is the sanctification it needs, or null if it needs none. alternateDomains is true
 * when a feat (Expanded Domain Initiate) opens the deity's alternate domains too.
 */
export function buildDeityChoices(specials = [], feats = []) {
  const choices = {
    domains: [],
    font: null,
    sanctification: null,
    cause: null,
    alternateDomains: feats.some((feat) => (Array.isArray(feat) ? feat[0] : feat) === "Expanded Domain Initiate"),
  };
  for (const special of specials.filter((s) => typeof s === "string")) {
    const domain = special.match(/^Domain: (.+)$/);
    const cause = special.match(CAUSE_PATTERN);
    if (domain) {
      choices.domains.push({ special, slug: domainSlug(domain[1]) });
    } else if (FONT_SPECIALS[special]) {
      choices.font = { special, value: FONT_SPECIALS[special] };
    } else if (SANCTIFICATION_SPECIALS[special]) {
      choices.sanctification = { special, value: SANCTIFICATION_SPECIALS[special] };
    } else if (cause) {
      choices.cause = { special, name: cause[1], value: cause[2]?.toLowerCase() ?? null };
    }
  }
  return choices;
}

/** The domains a deity grants: its primary ones, which pf2e offers its followers, and with the feat for them its alternate ones. */
export function deityDomains(deity, alternate = false) {
  const domains = deity?.system?.domains;
  return [...(domains?.primary ?? []), ...(alternate ? domains?.alternate ?? [] : [])];
}

export function deityFonts(deity) {
  return deity?.system?.font ?? [];
}

/** The sanctifications a follower of the deity may take: some of holy, unholy and none. */
export function deitySanctifications(deity) {
  const sanctification = deity?.system?.sanctification;
  const allowed = [...(sanctification?.what ?? [])];
  if (sanctification?.modal !== "must") allowed.push("none");
  return allowed;
}

/**
 * The build's choices the deity does not allow, as [{ kind, special, value }].
 * kind is "domain", "font", "sanctification" or "cause".
 */
export function deityConflicts(deity, choices) {
  const conflicts = [];
  const domains = deityDomains(deity, choices.alternateDomains);
  for (const domain of choices.domains) {
    if (!domains.includes(domain.slug)) conflicts.push({ kind: "domain", special: domain.special, value: domain.slug });
  }
  if (choices.font && !deityFonts(deity).includes(choices.font.value)) {
    conflicts.push({ kind: "font", ...choices.font });
  }
  const sanctifications = deitySanctifications(deity);
  if (choices.sanctification && !sanctifications.includes(choices.sanctification.value)) {
    conflicts.push({ kind: "sanctification", ...choices.sanctification });
  }
  if (choices.cause?.value && !sanctifications.includes(choices.cause.value)) {
    conflicts.push({ kind: "cause", ...choices.cause });
  }
  return conflicts;
}

/** The Pathbuilder special for a replacement choice, so the import reads it as if Pathbuilder had. */
export function choiceSpecial(kind, value, causeName) {
  switch (kind) {
    case "domain": return `Domain: ${titleCase(value)}`;
    case "font": return Object.keys(FONT_SPECIALS).find((key) => FONT_SPECIALS[key] === value);
    case "sanctification": return Object.keys(SANCTIFICATION_SPECIALS).find((key) => SANCTIFICATION_SPECIALS[key] === value);
    case "cause": return `${causeName} Cause${value && value !== "none" ? ` (${titleCase(value)})` : ""}`;
    default: return undefined;
  }
}

/** Replaces specials in a build, by { old: new }. */
export function replaceSpecials(specials, replacements) {
  return specials.map((special) => replacements[special] ?? special);
}
