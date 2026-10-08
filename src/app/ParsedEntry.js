/**
 * A Pathbuilder entry (a feat, special, piece of equipment, weapon or armor) and what the import did
 * with it. The status is the single record of that: matching skips entries already settled, and the
 * post-import report lists the ones left unmatched.
 */
export class ParsedEntry {

  static STATUS = {
    // not looked at yet
    PENDING: "pending",
    // an item was made for it from a compendium
    CREATED: "created",
    // another item granted the item it stands for
    GRANTED: "granted",
    // it answers a choice on another item
    CHOSEN: "chosen",
    // the item it stands for is part of a feature already added (a class feature)
    INCLUDED: "included",
    // Pathbuilder lists it, but it needs no item of its own
    IGNORED: "ignored",
    // nothing matched it; a later pass may still settle it
    UNMATCHED: "unmatched",
  };

  /** data: the entry's fields (name, originalName, type, level, ...), and status, itemId and reason if already settled. */
  constructor({ status = ParsedEntry.STATUS.PENDING, itemId = null, reason = null, ...data } = {}) {
    Object.assign(this, data);
    this.status = status;
    this.itemId = itemId;
    this.reason = reason;
  }

  /** Whether the entry is settled: anything but pending or unmatched. */
  get added() {
    return ![ParsedEntry.STATUS.PENDING, ParsedEntry.STATUS.UNMATCHED].includes(this.status);
  }

  /** The id of the item that stands for the entry, if there is one. */
  get addedId() {
    return this.itemId;
  }

  /** Settles the entry: what happened to it, the item standing for it, and why, if that needs saying. */
  settle(status, { itemId = null, reason = null } = {}) {
    this.status = status;
    this.itemId = itemId;
    this.reason = reason;
    return this;
  }

  /** Records that nothing matched the entry, and why. */
  unmatched(reason) {
    return this.settle(ParsedEntry.STATUS.UNMATCHED, { reason });
  }

}
