import { estree } from "./ast/estree.ts";
import { Node } from "./ast/sfc.ts";
import { walk as walkJs } from "https://esm.sh/estree-walker";
import walkHtml from "./parse/walker.ts";
import { Builder, generate } from "./ast/estree.ts";
import { Directive, AttributeBind } from "./parseDirectives.ts";
import replaceIdentifiers from "./state/rewriteState.ts";

/*type Values = string | number | bigint | boolean | RegExp | null | undefined;

export type StateShape = {
  [key: string]: {
    defaultValue:
      | Values
      | (estree.Expression | estree.Property | estree.SpreadElement | null)[];
    ast: estree.Node;
    type: "string" | "number" | "array" | "object";
  };
};*/

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

export type ContextDescriptor = {
  state: {
    [key: string]: Record<never, never>;
  };
  defs: {
    [key: string]: Record<never, never>;
  };
};

export const extractContext = (ast: estree.Node) => {
  const context: ContextDescriptor = {
    state: {},
    defs: {},
  };

  walkJs(ast, {
    enter(_node, _parent) {
      const parent = _parent as estree.Node;
      const node = _node as estree.Node;

      if (node.type === "FunctionDeclaration" && parent.type === "Program") {
        const name = node.id?.name;
        if (name) {
          context.defs[name] = {};
        }
      } else if (node.type === "VariableDeclaration") {
        const declarationNames = getDeclarationNames(node.declarations);
        declarationNames.forEach((name) => {
          context[node.kind === "let" ? "state" : "defs"][name] = {};
        });

        if (node.kind === "let") {
          const assignments: estree.AssignmentExpression[] = [];
          node.declarations.forEach((declaration) => {
            if (declaration.init && declaration.id.type === "Identifier") {
              assignments.push({
                type: "AssignmentExpression",
                operator: "=",
                left: new Builder()
                  .this()
                  .get(generate.id("state"))
                  .get(declaration.id)
                  .build(),
                right: {
                  type: "ConditionalExpression",
                  test: {
                    type: "BinaryExpression",
                    left: generate.str(declaration.id.name),
                    operator: "in",
                    right: new Builder()
                      .this()
                      .get(generate.id("state"))
                      .build(),
                  },
                  consequent: new Builder()
                    .this()
                    .get(generate.id("state"))
                    .get(declaration.id)
                    .build(),
                  alternate: declaration.init,
                },
              });
            } else {
              throw new Error("Unable to handle state");
            }
          });

          const expression:
            | estree.SequenceExpression
            | estree.ExpressionStatement =
            assignments.length > 1
              ? {
                  type: "SequenceExpression",
                  expressions: assignments,
                }
              : {
                  type: "ExpressionStatement",
                  expression: assignments[0],
                };
          this.replace(expression);
        }
      }
    },
  });

  return context;
};

export const addStateMarkup = (
  ast: Node[],
  directives: Directive[],
  context: ContextDescriptor
) => {
  const bindDirectives = directives.filter(
    (d) => d.type === "bind" && d.attributeName === "value"
  ) as AttributeBind[];
  const boundState = bindDirectives.map((d) => d.bindTo.name);
  const stateToAdd = Object.keys(context.state).filter(
    (name) => boundState.indexOf(name) === -1
  );

  walkHtml(ast, function (node) {
    if (node.type === "HtmlTag" && node.tag === "form") {
      const methodAttr = node.attributes.find((a) => a.name === "method");
      if (!methodAttr) {
        node.attributes.push({ name: "method", body: "post" });
        stateToAdd.forEach((stateName) => {
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
                  expression: new Builder()
                    .id("toFormValue")
                    .call(generate.id(stateName))
                    .build(),
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

export const rewriteState = <T extends estree.Node>(
  ast: T,
  context: ContextDescriptor
): T => {
  const stateNames = Object.keys(context.state);

  return replaceIdentifiers(
    ast,
    [...Object.keys(context.defs), ...stateNames],
    (node) =>
      new Builder()
        .this()
        .get(
          generate.id(
            stateNames.indexOf(node.name) !== -1 ? "state" : "context"
          )
        )
        .get(node)
        .build()
  );
};

/*export const parseState = (ast: estree.Node) => {
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
      if (node.type === "VariableDeclaration" && node.kind === "let") {
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
        (stateNames.indexOf(node.name) !== -1 ||
          context.indexOf(node.name) !== -1)
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
        };
        this.replace(memberExpression);
      }
    },
  }) as estree.Expression;
};

export const updateFormState = (ast: Node[], stateShape: StateShape) => {
  walkHtml(ast, function (node) {
    if (node.type === "HtmlTag" && node.tag === "form") {
      const methodAttr = node.attributes.find((a) => a.name === "method");
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
                  expression: new Builder()
                    .id("toFormValue")
                    .call(generate.id(stateName))
                    .build(),
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
};*/
