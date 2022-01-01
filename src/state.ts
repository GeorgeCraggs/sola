import { estree } from "./ast/estree.ts";
import { Node } from "./ast/sfc.ts";
import { walk as walkJs } from "https://esm.sh/estree-walker";
import walkHtml from "./parse/walker.ts";
import { generate } from "./ast/estree.ts";

type Values = string | number | bigint | boolean | RegExp | null | undefined;

export type StateShape = {
  [key: string]: {
    defaultValue:
      | Values
      | (estree.Expression | estree.Property | estree.SpreadElement | null)[];
    ast: estree.Node;
    type: "string" | "number" | "array" | "object";
  };
};

const getDeclarationNames = (
  declarations: (estree.VariableDeclarator | estree.Pattern | null)[]
) => {
  const names: string[] = [];

  declarations.forEach((declaration) => {
    if (declaration === null) return;

    switch (declaration.type) {
      case "Identifier":
        names.push(declaration.name);
        break;
      case "ObjectPattern":
        declaration.properties.forEach((property) => {
          if (property.type === "RestElement") {
            names.push(...getDeclarationNames([property]));
          } else if (
            property.key.type === "Identifier" ||
            property.key.type === "MemberExpression"
          ) {
            names.push(...getDeclarationNames([property.key]));
          }
        });
        break;
      case "ArrayPattern":
        names.push(...getDeclarationNames(declaration.elements));
        break;
      case "RestElement":
        names.push(...getDeclarationNames([declaration.argument]));
        break;
      case "AssignmentPattern":
        break;
      case "MemberExpression":
        break;
      case "VariableDeclarator":
        names.push(...getDeclarationNames([declaration.id]));
        break;
    }
  });

  return names;
};

export const parseState = (ast: estree.Node) => {
  const state: StateShape = {};
  const context: string[] = [];

  walkJs(ast, {
    enter(_node, _parent) {
      const parent = _parent as estree.Node;
      const node = _node as estree.Node;

      // Check context
      if (node.type === "FunctionDeclaration" && parent.type === "Program") {
        const name = node.id?.name;

        if (name) {
          context.push(name);
        }
      } else if (node.type === "VariableDeclaration" && node.kind === "const") {
        context.push(...getDeclarationNames(node.declarations));
      }
      // TODO: Add more

      // Check state
      if (
        node.type === "VariableDeclaration" &&
        node.kind === "let"
      ) {
        node.declarations.forEach((declaration) => {
          if (declaration.id.type !== "Identifier") {
            console.error(
              "Identifier must be specified when creating state (destructuring not yet supported)"
            );
            this.skip();
            return;
          }

          if (
            typeof declaration.init === "undefined" ||
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
  ast: estree.Node,
  stateShape: StateShape,
  context: string[]
) => {
  const stateNames = Object.keys(stateShape);

  return walkJs(ast, {
    enter(_node, _) {
      const node = _node as estree.Node;

      if (
        node.type === "Identifier" &&
        (stateNames.indexOf(node.name) !== -1 || context.indexOf(node.name) !== -1)
      ) {
        this.skip();

        const memberExpression: estree.MemberExpression = {
          type: "MemberExpression",
          object: {
            type: "MemberExpression",
            object: {
              type: "ThisExpression",
            },
            property: {
              type: "Identifier",
              name: stateNames.indexOf(node.name) !== -1 ? "state" : "context",
            },
            computed: false,
            optional: false,
          },
          property: {
            type: "Identifier",
            name: node.name,
          },
          computed: false,
          optional: false,
        }
        this.replace(memberExpression);
      }
    },
  }) as estree.Expression;
};

export const updateFormState = (
  ast: Node[],
  stateShape: StateShape
) => {
  walkHtml(ast, function (node) {
    if (node.type === "HtmlTag" && node.tag === "form") {
      const methodAttr = node.attributes.find(
        (a) => a.name === "method"
      );
      if (!methodAttr) {
        node.attributes.push({ name: "method", body: "post" });
        Object.keys(stateShape).forEach((stateName) => {
          node.children.push({
            type: "HtmlTag",
            tag: "input",
            attributes: [
              {
                name: "type",
                body: "hidden",
              },
              {
                name: "name",
                body: stateName,
              },
              {
                name: "value",
                body: {
                  type: "Expression",
                  expression: generate.id(stateName),
                },
              },
            ],
            directives: [],
            children: [],
          });
        });
        this.skip();
      }
    }
  });
};
