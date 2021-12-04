import * as acorn from "https://esm.sh/acorn";
import { rewriteState, StateShape } from "../state.ts";
import { TreeToken } from "./tokenTree.ts";

const convertToAst = (
  tree: TreeToken[],
  stateShape: StateShape,
  context: string[]
): acorn.Node => {
  const expressionTokens = tree.filter((t) => t.type !== "plain");
  const plainTokens = tree.filter((t) => t.type === "plain");

  return {
    type: "TemplateLiteral",
    /** @ts-ignore */
    expressions: expressionTokens.map((t) => {
      let contentAst = acorn.parseExpressionAt(t.content, 0, {
        ecmaVersion: 2022,
      });

      /** @ts-ignore */
      contentAst = rewriteState(contentAst, stateShape, context);

      switch (t.type) {
        case "script":
          return {
            type: "CallExpression",
            callee: {
              type: "Identifier",
              name: "escapeHtml",
            },
            arguments: [contentAst],
            optional: false,
          };
        case "if":
          return {
            type: "ConditionalExpression",
            test: contentAst,
            consequent: convertToAst(t.children, stateShape, context),
            alternate:
              t.elseChildren.length > 0
                ? convertToAst(t.elseChildren, stateShape, context)
                : {
                    type: "Literal",
                    value: "",
                    raw: `""`,
                  },
          };
        case "each": {
          const params = acorn.parseExpressionAt(t.params, 0, {
            ecmaVersion: 2022,
          });
          return {
            type: "CallExpression",
            callee: {
              type: "MemberExpression",
              object: {
                type: "CallExpression",
                callee: {
                  type: "MemberExpression",
                  object: contentAst,
                  property: {
                    type: "Identifier",
                    name: "map",
                  },
                  computed: false,
                  optional: false,
                },
                arguments: [
                  {
                    type: "ArrowFunctionExpression",
                    id: null,
                    expression: true,
                    generator: false,
                    async: false,
                    params:
                      params.type === "SequenceExpression"
                        ? /** @ts-ignore */
                          params.expressions
                        : [params],
                    body: convertToAst(t.children, stateShape, context),
                  },
                ],
              },
              property: {
                type: "Identifier",
                name: "join",
              },
            },
            arguments: [
              {
                type: "Literal",
                value: "",
                raw: `""`,
              },
            ],
            optional: false,
          };
        }
      }
    }),
    quasis: plainTokens.map((t, index) => ({
      type: "TemplateElement",
      value: {
        raw: t.content,
      },
      tail: index === plainTokens.length - 1,
    })),
  };
};

export default convertToAst;
