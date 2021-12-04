import { parse, Node } from "https://esm.sh/acorn";
import { walk, BaseNode } from "https://esm.sh/estree-walker";
import * as acorn from "https://esm.sh/acorn";
import { generate } from "https://deno.land/x/astring/src/astring.js";
import { rewriteState, StateShape } from "./state.ts";

// TODO: Make POST check only generate if there is state
// TODO: Escape styles
const build = (
  template: Node,
  script: Node,
  stateShape: StateShape,
  context: string[],
  directives: {
    [key: string]: {
      id: string;
      type: "on" | "bind" | "class";
      name: string;
      modifier: string;
      value: string;
    };
  },
  styles: string
): string => {
  const outputTemplate = `
import { escapeHtml, parseFormValue } from "../../src/framework/mod.ts";

const _template = function () {
  return (\`TEMPLATE\`);
};

const _runner = function (_action) {
  const extra = (function () {
    \`CODE\`

    return \`CONTEXTS\`;
  }).call(this);

  const _context = {...this, context: extra};

  if (_action) {
    let _result = _action;
    while (_result instanceof Function) {
      _result = _result.call(_context);
    }
  }

  return _template.call(_context);
};

export const Component = async function (req) {
  const clickHandlers = \`CLICK_HANDLERS\`;
  const binds = \`BINDS\`;
  const stateTypes = \`STATE_TYPES\`;
  const state = \`STATE\`;

  let action;

  if (req.method === "POST") {
    const formData = await req.formData();

    const actionName = formData.get("submit");
    if (actionName in clickHandlers) {
      action = clickHandlers[actionName]
    }

    formData.forEach((value, name) => {
      if (name === "submit") return;

      if (name in state) {
        state[name] = parseFormValue(value.toString(), stateTypes[name]);
      }
    });

    formData.forEach((value, name) => {
      if (name === "submit") return;

      if (name in binds) {
        state[binds[name]] = parseFormValue(value.toString(), stateTypes[binds[name]]);
      }
    });
  }

  return _runner.call({state}, action);
};

export const Styles = "${styles}";
  `.trim();

  const outputAst = parse(outputTemplate, {
    ecmaVersion: 2022,
    sourceType: "module",
  });

  walk(outputAst, {
    enter(node) {
      if (
        node.type === "TemplateLiteral" &&
        /** @ts-ignore */
        node.quasis.length === 1 &&
        /** @ts-ignore */
        node.quasis[0].type === "TemplateElement"
      ) {
        /** @ts-ignore */
        const elementValue = node.quasis[0].value.raw;

        if (elementValue === "TEMPLATE") {
          this.replace(template);
        } else if (elementValue === "CLICK_HANDLERS") {
          this.replace({
            type: "ObjectExpression",
            /** @ts-ignore */
            properties: Object.values(directives)
              .filter(({ type, name }) => type === "on" && name === "click")
              .map(({ id, value }) => ({
                type: "Property",
                method: false,
                shorthand: false,
                computed: false,
                key: {
                  type: "Literal",
                  value: id,
                  raw: `"${id}"`,
                },
                value: {
                  type: "FunctionExpression",
                  id: null,
                  expression: false,
                  generator: false,
                  async: false,
                  params: [],
                  body: {
                    type: "BlockStatement",
                    body: [
                      {
                        type: "ReturnStatement",
                        argument: rewriteState(
                          acorn.parseExpressionAt(value, 0, {
                            ecmaVersion: 2022,
                          }),
                          stateShape,
                          context
                        ),
                      },
                    ],
                  },
                },
                kind: "init",
              })),
          });
        } else if (elementValue === "BINDS") {
          this.replace({
            type: "ObjectExpression",
            /** @ts-ignore */
            properties: Object.values(directives)
              .filter(({ type, name }) => type === "bind" && name === "value")
              .map(({ id, value }) => ({
                type: "Property",
                method: false,
                shorthand: false,
                computed: false,
                key: {
                  type: "Literal",
                  value: id,
                  raw: `"${id}"`,
                },
                value: {
                  type: "Literal",
                  value: value,
                  raw: `"${value}"`,
                },
                kind: "init",
              })),
          });
        } else if (elementValue === "CODE") {
          this.replace(script);
        } else if (elementValue === "CONTEXTS") {
          this.replace({
            type: "ObjectExpression",
            /** @ts-ignore */
            properties: context.map((identifier) => ({
              type: "Property",
              method: false,
              shorthand: true,
              computed: false,
              key: {
                type: "Identifier",
                name: identifier,
              },
              kind: "init",
              value: {
                type: "Identifier",
                name: identifier,
              },
            })),
          });
        } else if (elementValue === "STATE") {
          this.replace({
            type: "ObjectExpression",
            /** @ts-ignore */
            properties: Object.entries(stateShape).map(([name, { ast }]) => ({
              type: "Property",
              method: false,
              shorthand: false,
              computed: false,
              key: {
                type: "Literal",
                value: name,
                raw: `"${name}"`,
              },
              value: ast,
              kind: "init",
            })),
          });
        } else if (elementValue === "STATE_TYPES") {
          this.replace({
            type: "ObjectExpression",
            /** @ts-ignore */
            properties: Object.entries(stateShape).map(([name, { type }]) => ({
              type: "Property",
              method: false,
              shorthand: false,
              computed: false,
              key: {
                type: "Literal",
                value: name,
                raw: `"${name}"`,
              },
              value: {
                type: "Literal",
                value: type,
                raw: `"${type}"`,
              },
              kind: "init",
            })),
          });
        }
      }
    },
  });

  return generate(outputAst);
};

export default build;
