import {
    TYPE_ANY,
    TOK_AND,
    TOK_COLON,
    TOK_COMMA,
    TOK_CURRENT,
    TYPE_ARRAY,
    TOK_DOT,TOK_EOF,TOK_EQ,TOK_EXPREF,TOK_FILTER,TOK_FLATTEN,TOK_GT,TOK_GTE,TOK_LBRACE,TOK_LBRACKET,TOK_LITERAL,TOK_LPAREN,TOK_LT,TOK_LTE,TOK_NE,TOK_NOT,TOK_NUMBER,TOK_OR,TOK_PIPE,TOK_QUOTEDIDENTIFIER,TOK_RBRACE,TOK_RBRACKET,TOK_RPAREN,TOK_STAR,TOK_UNQUOTEDIDENTIFIER,TYPE_ARRAY_NUMBER,TYPE_ARRAY_STRING,TYPE_BOOLEAN,TYPE_EXPREF,TYPE_NAME_TABLE,TYPE_NULL,TYPE_NUMBER,TYPE_OBJECT,TYPE_STRING,isAlpha,isAlphaNum,isArray,isFalse,isNum,isObject,basicTokens,bindingPower,objValues,operatorStartToken,skipChars,strictDeepEqual
  } from "./utils.js"
  
  export function Lexer() {
}
Lexer.prototype = {
    tokenize: function(stream) {
        var tokens = [];
        this._current = 0;
        var start;
        var identifier;
        var token;
        while (this._current < stream.length) {
            if (isAlpha(stream[this._current])) {
                start = this._current;
                identifier = this._consumeUnquotedIdentifier(stream);
                tokens.push({type: TOK_UNQUOTEDIDENTIFIER,
                             value: identifier,
                             start: start});
            } else if (basicTokens[stream[this._current]] !== undefined) {
                tokens.push({type: basicTokens[stream[this._current]],
                            value: stream[this._current],
                            start: this._current});
                this._current++;
            } else if (isNum(stream[this._current])) {
                token = this._consumeNumber(stream);
                tokens.push(token);
            } else if (stream[this._current] === "[") {
                // No need to increment this._current.  This happens
                // in _consumeLBracket
                token = this._consumeLBracket(stream);
                tokens.push(token);
            } else if (stream[this._current] === "\"") {
                start = this._current;
                identifier = this._consumeQuotedIdentifier(stream);
                tokens.push({type: TOK_QUOTEDIDENTIFIER,
                             value: identifier,
                             start: start});
            } else if (stream[this._current] === "'") {
                start = this._current;
                identifier = this._consumeRawStringLiteral(stream);
                tokens.push({type: TOK_LITERAL,
                             value: identifier,
                             start: start});
            } else if (stream[this._current] === "`") {
                start = this._current;
                var literal = this._consumeLiteral(stream);
                tokens.push({type: TOK_LITERAL,
                             value: literal,
                             start: start});
            } else if (operatorStartToken[stream[this._current]] !== undefined) {
                tokens.push(this._consumeOperator(stream));
            } else if (skipChars[stream[this._current]] !== undefined) {
                // Ignore whitespace.
                this._current++;
            } else if (stream[this._current] === "&") {
                start = this._current;
                this._current++;
                if (stream[this._current] === "&") {
                    this._current++;
                    tokens.push({type: TOK_AND, value: "&&", start: start});
                } else {
                    tokens.push({type: TOK_EXPREF, value: "&", start: start});
                }
            } else if (stream[this._current] === "|") {
                start = this._current;
                this._current++;
                if (stream[this._current] === "|") {
                    this._current++;
                    tokens.push({type: TOK_OR, value: "||", start: start});
                } else {
                    tokens.push({type: TOK_PIPE, value: "|", start: start});
                }
            } else {
                var error = new Error("Unknown character:" + stream[this._current]);
                error.name = "LexerError";
                throw error;
            }
        }
        return tokens;
    },

    _consumeUnquotedIdentifier: function(stream) {
        var start = this._current;
        this._current++;
        while (this._current < stream.length && isAlphaNum(stream[this._current])) {
            this._current++;
        }
        return stream.slice(start, this._current);
    },

    _consumeQuotedIdentifier: function(stream) {
        var start = this._current;
        this._current++;
        var maxLength = stream.length;
        while (stream[this._current] !== "\"" && this._current < maxLength) {
            // You can escape a double quote and you can escape an escape.
            var current = this._current;
            if (stream[current] === "\\" && (stream[current + 1] === "\\" ||
                                             stream[current + 1] === "\"")) {
                current += 2;
            } else {
                current++;
            }
            this._current = current;
        }
        this._current++;
        return JSON.parse(stream.slice(start, this._current));
    },

    _consumeRawStringLiteral: function(stream) {
        var start = this._current;
        this._current++;
        var maxLength = stream.length;
        while (stream[this._current] !== "'" && this._current < maxLength) {
            // You can escape a single quote and you can escape an escape.
            var current = this._current;
            if (stream[current] === "\\" && (stream[current + 1] === "\\" ||
                                             stream[current + 1] === "'")) {
                current += 2;
            } else {
                current++;
            }
            this._current = current;
        }
        this._current++;
        var literal = stream.slice(start + 1, this._current - 1);
        return literal.replace("\\'", "'");
    },

    _consumeNumber: function(stream) {
        var start = this._current;
        this._current++;
        var maxLength = stream.length;
        while (isNum(stream[this._current]) && this._current < maxLength) {
            this._current++;
        }
        var value = parseInt(stream.slice(start, this._current));
        return {type: TOK_NUMBER, value: value, start: start};
    },

    _consumeLBracket: function(stream) {
        var start = this._current;
        this._current++;
        if (stream[this._current] === "?") {
            this._current++;
            return {type: TOK_FILTER, value: "[?", start: start};
        } else if (stream[this._current] === "]") {
            this._current++;
            return {type: TOK_FLATTEN, value: "[]", start: start};
        } else {
            return {type: TOK_LBRACKET, value: "[", start: start};
        }
    },

    _consumeOperator: function(stream) {
        var start = this._current;
        var startingChar = stream[start];
        this._current++;
        if (startingChar === "!") {
            if (stream[this._current] === "=") {
                this._current++;
                return {type: TOK_NE, value: "!=", start: start};
            } else {
              return {type: TOK_NOT, value: "!", start: start};
            }
        } else if (startingChar === "<") {
            if (stream[this._current] === "=") {
                this._current++;
                return {type: TOK_LTE, value: "<=", start: start};
            } else {
                return {type: TOK_LT, value: "<", start: start};
            }
        } else if (startingChar === ">") {
            if (stream[this._current] === "=") {
                this._current++;
                return {type: TOK_GTE, value: ">=", start: start};
            } else {
                return {type: TOK_GT, value: ">", start: start};
            }
        } else if (startingChar === "=") {
            if (stream[this._current] === "=") {
                this._current++;
                return {type: TOK_EQ, value: "==", start: start};
            }
        }
    },

    _consumeLiteral: function(stream) {
        this._current++;
        var start = this._current;
        var maxLength = stream.length;
        var literal;
        while(stream[this._current] !== "`" && this._current < maxLength) {
            // You can escape a literal char or you can escape the escape.
            var current = this._current;
            if (stream[current] === "\\" && (stream[current + 1] === "\\" ||
                                             stream[current + 1] === "`")) {
                current += 2;
            } else {
                current++;
            }
            this._current = current;
        }
        var literalString = stream.slice(start, this._current).trimStart();
        literalString = literalString.replace("\\`", "`");
        if (this._looksLikeJSON(literalString)) {
            literal = JSON.parse(literalString);
        } else {
            // Try to JSON parse it as "<literal>"
            literal = JSON.parse("\"" + literalString + "\"");
        }
        // +1 gets us to the ending "`", +1 to move on to the next char.
        this._current++;
        return literal;
    },

    _looksLikeJSON: function(literalString) {
        var startingChars = "[{\"";
        var jsonLiterals = ["true", "false", "null"];
        var numberLooking = "-0123456789";

        if (literalString === "") {
            return false;
        } else if (startingChars.indexOf(literalString[0]) >= 0) {
            return true;
        } else if (jsonLiterals.indexOf(literalString) >= 0) {
            return true;
        } else if (numberLooking.indexOf(literalString[0]) >= 0) {
            try {
                JSON.parse(literalString);
                return true;
            } catch (ex) {
                return false;
            }
        } else {
            return false;
        }
    }
};