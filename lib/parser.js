import {
  TYPE_ANY,
  TOK_AND,
  TOK_COLON,
  TOK_COMMA,
  TOK_CURRENT,
  TYPE_ARRAY,
  TOK_DOT,TOK_EOF,TOK_EQ,TOK_EXPREF,TOK_FILTER,TOK_FLATTEN,TOK_GT,TOK_GTE,TOK_LBRACE,TOK_LBRACKET,TOK_LITERAL,TOK_LPAREN,TOK_LT,TOK_LTE,TOK_NE,TOK_NOT,TOK_NUMBER,TOK_OR,TOK_PIPE,TOK_QUOTEDIDENTIFIER,TOK_RBRACE,TOK_RBRACKET,TOK_RPAREN,TOK_STAR,TOK_UNQUOTEDIDENTIFIER,TYPE_ARRAY_NUMBER,TYPE_ARRAY_STRING,TYPE_BOOLEAN,TYPE_EXPREF,TYPE_NAME_TABLE,TYPE_NULL,TYPE_NUMBER,TYPE_OBJECT,TYPE_STRING,isAlpha,isAlphaNum,isArray,isFalse,isNum,isObject,basicTokens,bindingPower,objValues,operatorStartToken,skipChars,strictDeepEqual
} from "./utils.js"
import { Lexer } from "./lexer.js";
export function Parser() {
}

Parser.prototype = {
    parse: function(expression) {
        this._loadTokens(expression);
        this.index = 0;
        var ast = this.expression(0);
        if (this._lookahead(0) !== TOK_EOF) {
            var t = this._lookaheadToken(0);
            var error = new Error(
                "Unexpected token type: " + t.type + ", value: " + t.value);
            error.name = "ParserError";
            throw error;
        }
        return ast;
    },

    _loadTokens: function(expression) {
        var lexer = new Lexer();
        var tokens = lexer.tokenize(expression);
        tokens.push({type: TOK_EOF, value: "", start: expression.length});
        this.tokens = tokens;
    },

    expression: function(rbp) {
        var leftToken = this._lookaheadToken(0);
        this._advance();
        var left = this.nud(leftToken);
        var currentToken = this._lookahead(0);
        while (rbp < bindingPower[currentToken]) {
            this._advance();
            left = this.led(currentToken, left);
            currentToken = this._lookahead(0);
        }
        return left;
    },

    _lookahead: function(number) {
        return this.tokens[this.index + number].type;
    },

    _lookaheadToken: function(number) {
        return this.tokens[this.index + number];
    },

    _advance: function() {
        this.index++;
    },

    nud: function(token) {
      var left;
      var right;
      var expression;
      switch (token.type) {
        case TOK_LITERAL:
          return {type: "Literal", value: token.value};
        case TOK_UNQUOTEDIDENTIFIER:
          return {type: "Field", name: token.value};
        case TOK_QUOTEDIDENTIFIER:
          var node = {type: "Field", name: token.value};
          if (this._lookahead(0) === TOK_LPAREN) {
              throw new Error("Quoted identifier not allowed for function names.");
          }
          return node;
        case TOK_NOT:
          right = this.expression(bindingPower.Not);
          return {type: "NotExpression", children: [right]};
        case TOK_STAR:
          left = {type: "Identity"};
          right = null;
          if (this._lookahead(0) === TOK_RBRACKET) {
              // This can happen in a multiselect,
              // [a, b, *]
              right = {type: "Identity"};
          } else {
              right = this._parseProjectionRHS(bindingPower.Star);
          }
          return {type: "ValueProjection", children: [left, right]};
        case TOK_FILTER:
          return this.led(token.type, {type: "Identity"});
        case TOK_LBRACE:
          return this._parseMultiselectHash();
        case TOK_FLATTEN:
          left = {type: TOK_FLATTEN, children: [{type: "Identity"}]};
          right = this._parseProjectionRHS(bindingPower.Flatten);
          return {type: "Projection", children: [left, right]};
        case TOK_LBRACKET:
          if (this._lookahead(0) === TOK_NUMBER || this._lookahead(0) === TOK_COLON) {
              right = this._parseIndexExpression();
              return this._projectIfSlice({type: "Identity"}, right);
          } else if (this._lookahead(0) === TOK_STAR &&
                     this._lookahead(1) === TOK_RBRACKET) {
              this._advance();
              this._advance();
              right = this._parseProjectionRHS(bindingPower.Star);
              return {type: "Projection",
                      children: [{type: "Identity"}, right]};
          }
          return this._parseMultiselectList();
        case TOK_CURRENT:
          return {type: TOK_CURRENT};
        case TOK_EXPREF:
          expression = this.expression(bindingPower.Expref);
          return {type: "ExpressionReference", children: [expression]};
        case TOK_LPAREN:
          var args = [];
          while (this._lookahead(0) !== TOK_RPAREN) {
            if (this._lookahead(0) === TOK_CURRENT) {
              expression = {type: TOK_CURRENT};
              this._advance();
            } else {
              expression = this.expression(0);
            }
            args.push(expression);
          }
          this._match(TOK_RPAREN);
          return args[0];
        default:
          this._errorToken(token);
      }
    },

    led: function(tokenName, left) {
      var right;
      switch(tokenName) {
        case TOK_DOT:
          var rbp = bindingPower.Dot;
          if (this._lookahead(0) !== TOK_STAR) {
              right = this._parseDotRHS(rbp);
              return {type: "Subexpression", children: [left, right]};
          }
          // Creating a projection.
          this._advance();
          right = this._parseProjectionRHS(rbp);
          return {type: "ValueProjection", children: [left, right]};
        case TOK_PIPE:
          right = this.expression(bindingPower.Pipe);
          return {type: TOK_PIPE, children: [left, right]};
        case TOK_OR:
          right = this.expression(bindingPower.Or);
          return {type: "OrExpression", children: [left, right]};
        case TOK_AND:
          right = this.expression(bindingPower.And);
          return {type: "AndExpression", children: [left, right]};
        case TOK_LPAREN:
          var name = left.name;
          var args = [];
          var expression, node;
          while (this._lookahead(0) !== TOK_RPAREN) {
            if (this._lookahead(0) === TOK_CURRENT) {
              expression = {type: TOK_CURRENT};
              this._advance();
            } else {
              expression = this.expression(0);
            }
            if (this._lookahead(0) === TOK_COMMA) {
              this._match(TOK_COMMA);
            }
            args.push(expression);
          }
          this._match(TOK_RPAREN);
          node = {type: "Function", name: name, children: args};
          return node;
        case TOK_FILTER:
          var condition = this.expression(0);
          this._match(TOK_RBRACKET);
          if (this._lookahead(0) === TOK_FLATTEN) {
            right = {type: "Identity"};
          } else {
            right = this._parseProjectionRHS(bindingPower.Filter);
          }
          return {type: "FilterProjection", children: [left, right, condition]};
        case TOK_FLATTEN:
          var leftNode = {type: TOK_FLATTEN, children: [left]};
          var rightNode = this._parseProjectionRHS(bindingPower.Flatten);
          return {type: "Projection", children: [leftNode, rightNode]};
        case TOK_EQ:
        case TOK_NE:
        case TOK_GT:
        case TOK_GTE:
        case TOK_LT:
        case TOK_LTE:
          return this._parseComparator(left, tokenName);
        case TOK_LBRACKET:
          var token = this._lookaheadToken(0);
          if (token.type === TOK_NUMBER || token.type === TOK_COLON) {
              right = this._parseIndexExpression();
              return this._projectIfSlice(left, right);
          }
          this._match(TOK_STAR);
          this._match(TOK_RBRACKET);
          right = this._parseProjectionRHS(bindingPower.Star);
          return {type: "Projection", children: [left, right]};
        default:
          this._errorToken(this._lookaheadToken(0));
      }
    },

    _match: function(tokenType) {
        if (this._lookahead(0) === tokenType) {
            this._advance();
        } else {
            var t = this._lookaheadToken(0);
            var error = new Error("Expected " + tokenType + ", got: " + t.type);
            error.name = "ParserError";
            throw error;
        }
    },

    _errorToken: function(token) {
        var error = new Error("Invalid token (" +
                              token.type + "): \"" +
                              token.value + "\"");
        error.name = "ParserError";
        throw error;
    },


    _parseIndexExpression: function() {
        if (this._lookahead(0) === TOK_COLON || this._lookahead(1) === TOK_COLON) {
            return this._parseSliceExpression();
        } else {
            var node = {
                type: "Index",
                value: this._lookaheadToken(0).value};
            this._advance();
            this._match(TOK_RBRACKET);
            return node;
        }
    },

    _projectIfSlice: function(left, right) {
        var indexExpr = {type: "IndexExpression", children: [left, right]};
        if (right.type === "Slice") {
            return {
                type: "Projection",
                children: [indexExpr, this._parseProjectionRHS(bindingPower.Star)]
            };
        } else {
            return indexExpr;
        }
    },

    _parseSliceExpression: function() {
        // [start:end:step] where each part is optional, as well as the last
        // colon.
        var parts = [null, null, null];
        var index = 0;
        var currentToken = this._lookahead(0);
        while (currentToken !== TOK_RBRACKET && index < 3) {
            if (currentToken === TOK_COLON) {
                index++;
                this._advance();
            } else if (currentToken === TOK_NUMBER) {
                parts[index] = this._lookaheadToken(0).value;
                this._advance();
            } else {
                var t = this._lookahead(0);
                var error = new Error("Syntax error, unexpected token: " +
                                      t.value + "(" + t.type + ")");
                error.name = "Parsererror";
                throw error;
            }
            currentToken = this._lookahead(0);
        }
        this._match(TOK_RBRACKET);
        return {
            type: "Slice",
            children: parts
        };
    },

    _parseComparator: function(left, comparator) {
      var right = this.expression(bindingPower[comparator]);
      return {type: "Comparator", name: comparator, children: [left, right]};
    },

    _parseDotRHS: function(rbp) {
        var lookahead = this._lookahead(0);
        var exprTokens = [TOK_UNQUOTEDIDENTIFIER, TOK_QUOTEDIDENTIFIER, TOK_STAR];
        if (exprTokens.indexOf(lookahead) >= 0) {
            return this.expression(rbp);
        } else if (lookahead === TOK_LBRACKET) {
            this._match(TOK_LBRACKET);
            return this._parseMultiselectList();
        } else if (lookahead === TOK_LBRACE) {
            this._match(TOK_LBRACE);
            return this._parseMultiselectHash();
        }
    },

    _parseProjectionRHS: function(rbp) {
        var right;
        if (bindingPower[this._lookahead(0)] < 10) {
            right = {type: "Identity"};
        } else if (this._lookahead(0) === TOK_LBRACKET) {
            right = this.expression(rbp);
        } else if (this._lookahead(0) === TOK_FILTER) {
            right = this.expression(rbp);
        } else if (this._lookahead(0) === TOK_DOT) {
            this._match(TOK_DOT);
            right = this._parseDotRHS(rbp);
        } else {
            var t = this._lookaheadToken(0);
            var error = new Error("Sytanx error, unexpected token: " +
                                  t.value + "(" + t.type + ")");
            error.name = "ParserError";
            throw error;
        }
        return right;
    },

    _parseMultiselectList: function() {
        var expressions = [];
        while (this._lookahead(0) !== TOK_RBRACKET) {
            var expression = this.expression(0);
            expressions.push(expression);
            if (this._lookahead(0) === TOK_COMMA) {
                this._match(TOK_COMMA);
                if (this._lookahead(0) === TOK_RBRACKET) {
                  throw new Error("Unexpected token Rbracket");
                }
            }
        }
        this._match(TOK_RBRACKET);
        return {type: "MultiSelectList", children: expressions};
    },

    _parseMultiselectHash: function() {
      var pairs = [];
      var identifierTypes = [TOK_UNQUOTEDIDENTIFIER, TOK_QUOTEDIDENTIFIER];
      var keyToken, keyName, value, node;
      for (;;) {
        keyToken = this._lookaheadToken(0);
        if (identifierTypes.indexOf(keyToken.type) < 0) {
          throw new Error("Expecting an identifier token, got: " +
                          keyToken.type);
        }
        keyName = keyToken.value;
        this._advance();
        this._match(TOK_COLON);
        value = this.expression(0);
        node = {type: "KeyValuePair", name: keyName, value: value};
        pairs.push(node);
        if (this._lookahead(0) === TOK_COMMA) {
          this._match(TOK_COMMA);
        } else if (this._lookahead(0) === TOK_RBRACE) {
          this._match(TOK_RBRACE);
          break;
        }
      }
      return {type: "MultiSelectHash", children: pairs};
    }
};