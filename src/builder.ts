import { acorn } from "./acorn.ts";
import { estree, generate as b } from "./ast/estree.ts";
import { walk } from "https://esm.sh/estree-walker";
import { generate } from "https://deno.land/x/astring/src/astring.js";
import { rewriteState, StateShape } from "./state.ts";
import { ScriptExpression } from "./parse/mod.ts";

// TODO: Make POST check only generate if there is state
// TODO: Escape styles
const build = (
  template: estree.Expression,
  script: estree.Node,
  stateShape: StateShape,
  context: string[],
  directives: {
    [key: string]: {
      id: string;
      type: "on" | "bind" | "class";
      name: string;
      modifier: string;
      value: string | ScriptExpression;
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

export const Styles = \`${styles}\`;
  `.trim();

  const outputAst = acorn.parse(outputTemplate, {
    ecmaVersion: 2022,
    sourceType: "module",
  }) as estree.Node;

  walk(outputAst, {
    enter(_node) {
      const node = _node as estree.Node;

      if (
        node.type === "TemplateLiteral" &&
        node.quasis.length === 1 &&
        node.quasis[0].type === "TemplateElement"
      ) {
        const elementValue = node.quasis[0].value.raw;

        if (elementValue === "TEMPLATE") {
          this.replace(template);
        } else if (elementValue === "CLICK_HANDLERS") {
          const expression: estree.ObjectExpression = {
            type: "ObjectExpression",
            properties: Object.values(directives)
              .filter(({ type, name }) => type === "on" && name === "click")
              .map(({ id, value }) => ({
                type: "Property",
                method: false,
                shorthand: false,
                computed: false,
                key: b.id(id),
                kind: "init",
                value: b.fn(
                  [],
                  b.block([
                    b.return(
                      rewriteState(
                        typeof value === "string" ? acorn.parseExpressionAt(value, 0, {
                          ecmaVersion: 2022,
                        }) as estree.Expression : value.expression,
                        stateShape,
                        context
                      ) as estree.Expression
                    ),
                  ])
                ),
              })),
          };

          this.replace(expression);
        } else if (elementValue === "BINDS") {
          const expression: estree.ObjectExpression = {
            type: "ObjectExpression",
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
                value: typeof value === "string" ? {
                  type: "Literal",
                  value: value,
                  raw: `"${value}"`,
                } : value.expression,
                kind: "init",
              })),
          };
          this.replace(expression);
        } else if (elementValue === "CODE") {
          this.replace(script);
        } else if (elementValue === "CONTEXTS") {
          const expression: estree.ObjectExpression = {
            type: "ObjectExpression",
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
          };
          this.replace(expression);
        } else if (elementValue === "STATE") {
          const expression: estree.ObjectExpression = {
            type: "ObjectExpression",
            properties: Object.entries(stateShape).map(([name, { ast }]) => ({
              type: "Property",
              method: false,
              shorthand: false,
              computed: false,
              key: b.str(name),
              value: ast as estree.Expression,
              kind: "init",
            })),
          };
          this.replace(expression);
        } else if (elementValue === "STATE_TYPES") {
          const expression: estree.ObjectExpression = {
            type: "ObjectExpression",
            properties: Object.entries(stateShape).map(([name, { type }]) => ({
              type: "Property",
              method: false,
              shorthand: false,
              computed: false,
              key: b.str(name),
              value: b.str(type),
              kind: "init",
            })),
          };
          this.replace(expression);
        }
      }
    },
  });

  return generate(outputAst);
};

export default build;
