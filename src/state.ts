import * as acorn from "https://esm.sh/acorn";
import { walk as walkJs } from "https://esm.sh/estree-walker";
import * as parse5 from "https://cdn.skypack.dev/parse5?dts";
import * as treeAdapter from "https://cdn.skypack.dev/parse5-htmlparser2-tree-adapter?dts";
import walkHtml from "./walk.ts";

export type StateShape = {
  [key: string]: {
    defaultValue: string | number | any[] | object;
    ast: acorn.Node;
    type: "string" | "number" | "array" | "object";
  };
};

export const parseState = (ast: acorn.Node) => {
  const state: StateShape = {};
  const context: string[] = [];

  walkJs(ast, {
    enter(node, parent) {
      // Check context
      if (node.type === "FunctionDeclaration" && parent.type === "Program") {
        /** @ts-ignore */
        const name = node.id.name;

        context.push(name);
      }
      // TODO: Add more

      // Check state
      if (
        node.type === "VariableDeclaration" &&
        /** @ts-ignore */
        node.kind === "let"
      ) {
        /** @ts-ignore */
        node.declarations.forEach((declaration) => {
          if (declaration.id.type !== "Identifier") {
            console.error(
              "Identifier must be specified when creating state (destructuring not yet supported)"
            );
            this.skip();
            return;
          }

          if (
            declaration.init === null ||
            ["Literal", "ArrayExpression", "ObjectExpression"].indexOf(
              declaration.init.type
            ) === -1
          ) {
            console.error("Invalid data type for state");
            this.skip();
            return;
          }

          switch (declaration.init.type) {
            case "Literal":
              state[declaration.id.name] = {
                defaultValue: declaration.init.value,
                ast: declaration.init,
                type:
                  typeof declaration.init.value === "number"
                    ? "number"
                    : "string",
              };
              break;
            case "ArrayExpression":
              state[declaration.id.name] = {
                defaultValue: declaration.init.elements,
                ast: declaration.init,
                type: "array",
              };
              break;
            case "ObjectExpression":
              state[declaration.id.name] = {
                defaultValue: declaration.init.properties,
                ast: declaration.init,
                type: "object",
              };
              break;
          }

          this.remove();
        });
      }
    },
  });

  return { state, context };
};

export const rewriteState = (
  ast: acorn.Node,
  stateShape: StateShape,
  context: string[]
) => {
  const stateNames = Object.keys(stateShape);

  /** @ts-ignore */
  return walkJs(ast, {
    enter(node, parent) {
      /** @ts-ignore */
      const name = "name" in node ? node.name : null;

      if (
        node.type === "Identifier" &&
        (stateNames.indexOf(name) !== -1 || context.indexOf(name) !== -1)
      ) {
        this.skip();

        this.replace({
          type: "MemberExpression",
          /** @ts-ignore */
          object: {
            type: "MemberExpression",
            object: {
              type: "ThisExpression",
            },
            property: {
              type: "Identifier",
              name: stateNames.indexOf(name) !== -1 ? "state" : "context",
            },
            computed: false,
            optional: false,
          },
          property: {
            type: "Identifier",
            name,
          },
          computed: false,
          optional: false,
        });
      }
    },
  });
};

export const updateFormState = (ast: parse5.Node, stateShape: StateShape) => {
  walkHtml(ast, (node) => {
    if (treeAdapter.getTagName(node) === "form") {
      treeAdapter.adoptAttributes(node, [{ name: "method", value: "post" }]);

      Object.keys(stateShape).forEach((stateName) => {
        treeAdapter.appendChild(
          node,
          treeAdapter.createElement("input", "", [
            {
              name: "type",
              value: "hidden",
            },
            {
              name: "name",
              value: stateName,
            },
            {
              name: "bind:value",
              value: stateName,
            },
          ])
        );
      });
      return true;
    }
  });
};
