/* eslint-disable no-void */
/* eslint-disable default-param-last */
import logger from "../logger.js";

// This is a reworking of the PredicatePF2e class in the Pathfinder system, as it's not exposed by the system.


function isObject(value) {
  return typeof value === "object" && value !== null;
}

function convertLegacyData(predicate) {
  var _a;
  const keys = Object.keys(predicate);
  if (keys.length === 0) return [];
  if (keys.length === 1 && Array.isArray(predicate.all)) {
    return deepClone(predicate.all);
  }
  if (keys.length === 1 && Array.isArray(predicate.any) && predicate.any.length === 1) {
    return deepClone(predicate.any);
  }
  return deepClone(
    [
      (_a = predicate.all) !== null && _a !== void 0 ? _a : [],
      Array.isArray(predicate.any) ? { or: predicate.any } : [],
      Array.isArray(predicate.not)
        ? predicate.not.length === 1
          ? { not: predicate.not[0] }
          : { nor: predicate.not }
        : [],
    ].flat()
  );
}

class StatementValidator {
  static validate(statement) {
    return this.isStatement(statement);
  }

  static isStatement(statement) {
    return statement instanceof Object
      ? this.isCompound(statement) || this.isBinaryOp(statement)
      : typeof statement === "string"
        ? this.isAtomic(statement)
        : false;
  }

  static isAtomic(statement) {
    return (typeof statement === "string" && statement.length > 0) || this.isBinaryOp(statement);
  }

  static isBinaryOp(statement) {
    if (!isObject(statement)) return false;
    const entries = Object.entries(statement);
    if (entries.length > 1) return false;
    const [operator, operands] = entries[0];
    return (
      this.binaryOperators.has(operator)
      && Array.isArray(operands)
      && operands.length === 2
      && typeof operands[0] === "string"
      && ["string", "number"].includes(typeof operands[1])
    );
  }

  static isCompound(statement) {
    return (
      isObject(statement)
      && (this.isAnd(statement)
        || this.isOr(statement)
        || this.isNand(statement)
        || this.isNor(statement)
        || this.isNot(statement)
        || this.isIf(statement))
    );
  }

  static isAnd(statement) {
    return (
      Object.keys(statement).length === 1
      && Array.isArray(statement.and)
      && statement.and.every((subProp) => this.isStatement(subProp))
    );
  }

  static isNand(statement) {
    return (
      Object.keys(statement).length === 1
      && Array.isArray(statement.nand)
      && statement.nand.every((subProp) => this.isStatement(subProp))
    );
  }

  static isOr(statement) {
    return (
      Object.keys(statement).length === 1
      && Array.isArray(statement.or)
      && statement.or.every((subProp) => this.isStatement(subProp))
    );
  }

  static isNor(statement) {
    return (
      Object.keys(statement).length === 1
      && Array.isArray(statement.nor)
      && statement.nor.every((subProp) => this.isStatement(subProp))
    );
  }

  static isNot(statement) {
    return Object.keys(statement).length === 1 && !!statement.not && this.isStatement(statement.not);
  }

  static isIf(statement) {
    return Object.keys(statement).length === 2 && this.isStatement(statement.if) && this.isStatement(statement.then);
  }
}
StatementValidator.binaryOperators = new Set(["eq", "gt", "gte", "lt", "lte"]);

class PredicatePF2e extends Array {
  constructor(...statements) {
    if (Array.isArray(statements[0])) {
      super(...statements[0]);
    } else {
      super(...statements);
    }
    this.isValid = PredicatePF2e.isValid(this);
  } /** Structurally validate the predicates */

  static isValid(statements) {
    return this.isArray(statements);
  } /** Is this an array of predicatation statements? */

  static isArray(statements) {
    return super.isArray(statements) && statements.every((s) => StatementValidator.validate(s));
  } /** Test if the given predicate passes for the given list of options. */

  static test(predicate = [], options) {
    return predicate instanceof PredicatePF2e ? predicate.test(options) : new PredicatePF2e(...predicate).test(options);
  } /** Create a predicate from unknown data, with deprecation support for legacy objects */

  static create(data, warn = false) {
    if (data instanceof PredicatePF2e) return data.clone();
    if (Array.isArray(data)) return new PredicatePF2e(data);
    if (isObject(data)) {
      if (warn) {
        foundry.utils.logCompatibilityWarning("Predicate data must be an array", {
          mode: CONST.COMPATIBILITY_MODES.WARNING,
          since: "4.2.0",
          until: "4.5.0",
        });
      }
      return new PredicatePF2e(convertLegacyData(data));
    }
    return new PredicatePF2e();
  } /** Test this predicate against a domain of discourse */

  test(options) {
    if (!this.isValid) {
      logger.error("PF2e System | The provided predicate set is malformed.");
      return false;
    }
    const domain = options instanceof Set ? options : new Set(options);
    return this.every((s) => this.isTrue(s, domain));
  }

  toObject() {
    return deepClone([...this]);
  }

  clone() {
    return new PredicatePF2e(this.toObject());
  } /** Is the provided statement true? */

  isTrue(statement, domain) {
    return (
      (typeof statement === "string" && domain.has(statement))
      || (StatementValidator.isBinaryOp(statement) && this.testBinaryOp(statement, domain))
      || (StatementValidator.isCompound(statement) && this.testCompound(statement, domain))
    );
  }

  // eslint-disable-next-line class-methods-use-this
  testBinaryOp(statement, domain) {
    if ("eq" in statement) {
      return domain.has(`${statement.eq[0]}:${statement.eq[1]}`);
    } else {
      const operator = Object.keys(statement)[0]; // Allow for tests of partial statements against numeric values // E.g., `{ "gt": ["actor:level", 5] }` would match against "actor:level:6" and "actor:level:7"
      const [left, right] = Object.values(statement)[0];
      const domainArray = Array.from(domain);
      const leftValues
        = typeof left === "number" || !Number.isNaN(Number(left))
          ? [Number(left)]
          : domainArray.flatMap((d) => {
            var _a;
            return d.startsWith(left)
              ? Number((_a = (/:(-?\d+)$/).exec(d)) === null || _a === void 0 ? void 0 : _a[1])
              : [];
          });
      const rightValues
        = typeof right === "number" || !Number.isNaN(Number(right))
          ? [Number(right)]
          : domainArray.flatMap((d) => {
            var _a;
            return d.startsWith(right)
              ? Number((_a = (/:(-?\d+)$/).exec(d)) === null || _a === void 0 ? void 0 : _a[1])
              : [];
          });
      switch (operator) {
        case "gt":
          return leftValues.some((l) => rightValues.every((r) => l > r));
        case "gte":
          return leftValues.some((l) => rightValues.every((r) => l >= r));
        case "lt":
          return leftValues.some((l) => rightValues.every((r) => l < r));
        case "lte":
          return leftValues.some((l) => rightValues.every((r) => l <= r));
        default:
          logger.warn("PF2e System | Malformed binary operation encounter");
          return false;
      }
    }
  } /** Is the provided compound statement true? */

  testCompound(statement, domain) {
    return (
      ("and" in statement && statement.and.every((subProp) => this.isTrue(subProp, domain)))
      || ("nand" in statement && !statement.nand.every((subProp) => this.isTrue(subProp, domain)))
      || ("or" in statement && statement.or.some((subProp) => this.isTrue(subProp, domain)))
      || ("nor" in statement && !statement.nor.some((subProp) => this.isTrue(subProp, domain)))
      || ("not" in statement && !this.isTrue(statement.not, domain))
      || ("if" in statement && !(this.isTrue(statement.if, domain) && !this.isTrue(statement.then, domain)))
    );
  }
}


export { PredicatePF2e, convertLegacyData };
