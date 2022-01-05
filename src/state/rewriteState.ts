import { estree } from "../ast/estree.ts";
import { walk } from "https://esm.sh/estree-walker";

export default <T extends estree.Node>(
  ast: T,
  identifierNames: string[],
  callback: (node: estree.Identifier) => estree.Node
): T => {
  const anscestors: estree.Node[] = [];
  const skipWhenParent: estree.Node[] = [];
  const declaredIdentifiers: string[] = [];

  return walk(ast, {
    enter(_node, _parent, key) {
      const parent = _parent as estree.Node;
      const node = _node as estree.Node;

      if (skipWhenParent.indexOf(parent) !== -1) {
        this.skip();
        return;
      }

      anscestors.push(node);

      if (
        node.type === "Identifier" &&
        identifierNames.indexOf(node.name) !== -1
      ) {
        if (parent && parent.type === "VariableDeclarator" && anscestors.length === 4) {
          declaredIdentifiers.push(node.name);
          anscestors.pop();
          this.skip();

          return;
        }

        if (

          (parent && parent.type === "FunctionDeclaration") ||
          key === "params" ||
          (parent && parent.type === "MemberExpression" && key !== "object")
        ) {
          anscestors.pop();
          this.skip();
          return;
        }

        if (parent && parent.type === "Property" && key !== "value") {
          return;
        }

        this.replace(callback(node));
      }
    },
    leave(_node) {
      anscestors.pop();
    },
  }) as T;
};
