export function isArray(obj) {
    if (obj !== null) {
      return Object.prototype.toString.call(obj) === "[object Array]";
    } else {
      return false;
    }
  }

  export function isObject(obj) {
    if (obj !== null) {
      return Object.prototype.toString.call(obj) === "[object Object]";
    } else {
      return false;
    }
  }

  export function strictDeepEqual(first, second) {
    // Check the scalar case first.
    if (first === second) {
      return true;
    }

    // Check if they are the same type.
    var firstType = Object.prototype.toString.call(first);
    if (firstType !== Object.prototype.toString.call(second)) {
      return false;
    }
    // We know that first and second have the same type so we can just check the
    // first type from now on.
    if (isArray(first) === true) {
      // Short circuit if they're not the same length;
      if (first.length !== second.length) {
        return false;
      }
      for (var i = 0; i < first.length; i++) {
        if (strictDeepEqual(first[i], second[i]) === false) {
          return false;
        }
      }
      return true;
    }
    if (isObject(first) === true) {
      // An object is equal if it has the same key/value pairs.
      var keysSeen = {};
      for (var key in first) {
        if (hasOwnProperty.call(first, key)) {
          if (strictDeepEqual(first[key], second[key]) === false) {
            return false;
          }
          keysSeen[key] = true;
        }
      }
      // Now check that there aren't any keys in second that weren't
      // in first.
      for (var key2 in second) {
        if (hasOwnProperty.call(second, key2)) {
          if (keysSeen[key2] !== true) {
            return false;
          }
        }
      }
      return true;
    }
    return false;
  }

  export function isFalse(obj) {
    // From the spec:
    // A false value corresponds to the following values:
    // Empty list
    // Empty object
    // Empty string
    // False boolean
    // null value

    // First check the scalar values.
    if (obj === "" || obj === false || obj === null) {
        return true;
    } else if (isArray(obj) && obj.length === 0) {
        // Check for an empty array.
        return true;
    } else if (isObject(obj)) {
        // Check for an empty object.
        for (var key in obj) {
            // If there are any keys, then
            // the object is not empty so the object
            // is not false.
            if (obj.hasOwnProperty(key)) {
              return false;
            }
        }
        return true;
    } else {
        return false;
    }
  }

  export function objValues(obj) {
    var keys = Object.keys(obj);
    var values = [];
    for (var i = 0; i < keys.length; i++) {
      values.push(obj[keys[i]]);
    }
    return values;
  }

  export function merge(a, b) {
      var merged = {};
      for (var key in a) {
          merged[key] = a[key];
      }
      for (var key2 in b) {
          merged[key2] = b[key2];
      }
      return merged;
  }

  // Type constants used to define functions.
  export var TYPE_NUMBER = 0;
  export var TYPE_ANY = 1;
  export var TYPE_STRING = 2;
  export var TYPE_ARRAY = 3;
  export var TYPE_OBJECT = 4;
  export var TYPE_BOOLEAN = 5;
  export var TYPE_EXPREF = 6;
  export var TYPE_NULL = 7;
  export var TYPE_ARRAY_NUMBER = 8;
  export var TYPE_ARRAY_STRING = 9;
  export var TYPE_NAME_TABLE = {
    0: 'number',
    1: 'any',
    2: 'string',
    3: 'array',
    4: 'object',
    5: 'boolean',
    6: 'expression',
    7: 'null',
    8: 'Array<number>',
    9: 'Array<string>'
  };

  export var TOK_EOF = "EOF";
  export var TOK_UNQUOTEDIDENTIFIER = "UnquotedIdentifier";
  export var TOK_QUOTEDIDENTIFIER = "QuotedIdentifier";
  export var TOK_RBRACKET = "Rbracket";
  export var TOK_RPAREN = "Rparen";
  export var TOK_COMMA = "Comma";
  export var TOK_COLON = "Colon";
  export var TOK_RBRACE = "Rbrace";
  export var TOK_NUMBER = "Number";
  export var TOK_CURRENT = "Current";
  export var TOK_EXPREF = "Expref";
  export var TOK_PIPE = "Pipe";
  export var TOK_OR = "Or";
  export var TOK_AND = "And";
  export var TOK_EQ = "EQ";
  export var TOK_GT = "GT";
  export var TOK_LT = "LT";
  export var TOK_GTE = "GTE";
  export var TOK_LTE = "LTE";
  export var TOK_NE = "NE";
  export var TOK_FLATTEN = "Flatten";
  export var TOK_STAR = "Star";
  export var TOK_FILTER = "Filter";
  export var TOK_DOT = "Dot";
  export var TOK_NOT = "Not";
  export var TOK_LBRACE = "Lbrace";
  export var TOK_LBRACKET = "Lbracket";
  export var TOK_LPAREN= "Lparen";
  export var TOK_LITERAL= "Literal";

  // The "&", "[", "<", ">" tokens
  // are not in basicToken because
  // there are two token variants
  // ("&&", "[?", "<=", ">=").  This is specially handled
  // below.

  export var basicTokens = {
    ".": TOK_DOT,
    "*": TOK_STAR,
    ",": TOK_COMMA,
    ":": TOK_COLON,
    "{": TOK_LBRACE,
    "}": TOK_RBRACE,
    "]": TOK_RBRACKET,
    "(": TOK_LPAREN,
    ")": TOK_RPAREN,
    "@": TOK_CURRENT
  };

  export var operatorStartToken = {
      "<": true,
      ">": true,
      "=": true,
      "!": true
  };

  export var skipChars = {
      " ": true,
      "\t": true,
      "\n": true
  };


  export function isAlpha(ch) {
      return (ch >= "a" && ch <= "z") ||
             (ch >= "A" && ch <= "Z") ||
             ch === "_";
  }

  export function isNum(ch) {
      return (ch >= "0" && ch <= "9") ||
             ch === "-";
  }
  export function isAlphaNum(ch) {
      return (ch >= "a" && ch <= "z") ||
             (ch >= "A" && ch <= "Z") ||
             (ch >= "0" && ch <= "9") ||
             ch === "_";
  }



  export var bindingPower = {};
  bindingPower[TOK_EOF] = 0;
  bindingPower[TOK_UNQUOTEDIDENTIFIER] = 0;
  bindingPower[TOK_QUOTEDIDENTIFIER] = 0;
  bindingPower[TOK_RBRACKET] = 0;
  bindingPower[TOK_RPAREN] = 0;
  bindingPower[TOK_COMMA] = 0;
  bindingPower[TOK_RBRACE] = 0;
  bindingPower[TOK_NUMBER] = 0;
  bindingPower[TOK_CURRENT] = 0;
  bindingPower[TOK_EXPREF] = 0;
  bindingPower[TOK_PIPE] = 1;
  bindingPower[TOK_OR] = 2;
  bindingPower[TOK_AND] = 3;
  bindingPower[TOK_EQ] = 5;
  bindingPower[TOK_GT] = 5;
  bindingPower[TOK_LT] = 5;
  bindingPower[TOK_GTE] = 5;
  bindingPower[TOK_LTE] = 5;
  bindingPower[TOK_NE] = 5;
  bindingPower[TOK_FLATTEN] = 9;
  bindingPower[TOK_STAR] = 20;
  bindingPower[TOK_FILTER] = 21;
  bindingPower[TOK_DOT] = 40;
  bindingPower[TOK_NOT] = 45;
  bindingPower[TOK_LBRACE] = 50;
  bindingPower[TOK_LBRACKET] = 55;
  bindingPower[TOK_LPAREN] = 60;
