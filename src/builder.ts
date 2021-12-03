import { parse, Node } from "https://esm.sh/acorn";
import { walk, BaseNode } from "https://esm.sh/estree-walker";
import { generate } from "https://deno.land/x/astring/src/astring.js";
import { StateShape } from "./state.ts";

// TODO: Make POST check only generate if there is state
// TODO: Escape styles
const build = (
  template: Node,
  script: Node,
  stateShape: StateShape,
  contexts: Node,
  actions: { [key: string]: BaseNode },
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
  })();

  const _context = {...this, ...extra};

  if (_action) {
    _action.call(_context);
  }

  return _template.call(_context);
};

export const Component = async function (req) {
  const actions = \`ACTIONS\`;

  const stateTypes = \`STATE_TYPES\`;
  const state = \`STATE\`;
  let action;

  if (req.method === "POST") {
    const formData = await req.formData();

    const actionName = formData.get("submit");
    if (actionName in actions) {
      action = actions[actionName]
    }

    formData.forEach((value, name) => {
      if (name in state) {
        state[name] = parseFormValue(value.toString(), stateTypes[name]);
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
        } else if (elementValue === "ACTIONS") {
          this.replace({
            type: "ObjectExpression",
            /** @ts-ignore */
            properties: Object.entries(actions).map(([name, val]) => ({
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
                type: "FunctionExpression",
                id: null,
                expression: false,
                generator: false,
                async: false,
                params: [],
                body: {
                  type: "BlockStatement",
                  body: [val],
                },
              },
              kind: "init",
            })),
          });
        } else if (elementValue === "CODE") {
          this.replace(script);
        } else if (elementValue === "CONTEXTS") {
          this.replace(contexts);
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
