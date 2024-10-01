import {Lexer} from "./lexer.js"
import {Parser} from "./parser.js"
import {Runtime} from "./runtime.js"
import {TreeInterpreter} from "./tree-interpreter.js"

export function compile(stream) {
    var parser = new Parser();
    var ast = parser.parse(stream);
    return ast;
  }

  export function tokenize(stream) {
      var lexer = new Lexer();
      return lexer.tokenize(stream);
  }

  export function search(data, expression) {
      var parser = new Parser();
      // This needs to be improved.  Both the interpreter and runtime depend on
      // each other.  The runtime needs the interpreter to support exprefs.
      // There's likely a clean way to avoid the cyclic dependency.
      var runtime = new Runtime();
      var interpreter = new TreeInterpreter(runtime);
      runtime._interpreter = interpreter;
      var node = parser.parse(expression);
      return interpreter.search(node, data);
  }
