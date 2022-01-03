import { acorn } from "./acorn.ts";
import { estree, Builder, generate as b } from "./ast/estree.ts";
import { walk } from "https://esm.sh/estree-walker";
import { generate } from "https://deno.land/x/astring/src/astring.js";
import { rewriteState, ContextDescriptor } from "./state.ts";
import { ExpressionNode } from "./ast/sfc.ts";
import { Directive, AttributeBind, Event } from "./parseDirectives.ts";

// TODO: Make POST check only generate if there is state
// TODO: Escape styles
const build = (
  template: estree.Expression,
  script: estree.Node,
  context: ContextDescriptor,
  directives: Directive[],
  styles: string
): string => {
  const binds: AttributeBind[] = directives.filter(
    (d) => d.type === "bind"
  ) as AttributeBind[];
  const events = directives.filter((d) => d.type === "event") as Event[];

  const outputTemplate = `
import { toHtmlText, toFormValue, fromFormValue, escapeHtml } from "../../src/framework/mod.ts";

const _runner = async function () {
  \`CODE\`;

  return {
    render: function () { return (\`TEMPLATE\`) },
    context: (\`CONTEXTS\`),
  };
};

export const Component = async function (req) {
  const clickHandlers = \`CLICK_HANDLERS\`;
  const binds = \`BINDS\`;
  const state = {};

  let result = {};

  if (req.method === "POST") {
    let action;
    const formData = await req.formData();

    const actionDetails = JSON.parse(formData.get("submit"));
    if (actionDetails.h in clickHandlers) {
      action = clickHandlers[actionDetails.h]
    }

    formData.forEach((value, name) => {
      if (name === "submit") return;

      if (name in binds) {
        state[binds[name].toState] = binds[name].parseAsInput
          ? value.toString()
          : fromFormValue(value.toString());
      }
    });

    while (typeof action === "function") {
      result = await _runner.call({state});
      action = action.call({state, context: result.context, actionDetails});
    }
  }

  result = await _runner.call({state});

  return result.render.call({state, context: result.context});
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
            properties: events.map((event) => {
              const loopScopeDefs = event.loopContexts.flatMap((c, i) => [
                b.def(
                  "let",
                  c.param,
                  new Builder()
                    .this()
                    .get(b.id("actionDetails"))
                    .get(b.id("i"))
                    .get(b.num(i), true)
                    .build()
                ),
                b.def(
                  "let",
                  c.vars,
                  new Builder(rewriteState(c.iterator, context))
                    .get(
                      c.param,
                      true
                    )
                    .build()
                ),
              ]);
              return {
                type: "Property",
                method: false,
                shorthand: false,
                computed: false,
                key: b.str(event.key),
                kind: "init",
                value: b.fn(
                  [],
                  b.block([
                    ...loopScopeDefs,
                    b.return(rewriteState(event.expression, context)),
                  ])
                ),
              };
            }),
          };

          this.replace(expression);
        } else if (elementValue === "BINDS") {
          const bindNames = binds.map((b) => b.bindTo.name);
          const bindsProps: estree.Property[] = binds.map((bind) => {
            return {
              type: "Property",
              method: false,
              shorthand: false,
              computed: false,
              key: b.str(bind.key),
              value: {
                type: "ObjectExpression",
                properties: [
                  {
                    type: "Property",
                    method: false,
                    shorthand: false,
                    computed: false,
                    key: b.str("toState"),
                    value: b.str(bind.bindTo.name),
                    kind: "init",
                  },
                  {
                    type: "Property",
                    method: false,
                    shorthand: false,
                    computed: false,
                    key: b.str("parseAsInput"),
                    value: b.bool(true),
                    kind: "init",
                  },
                ],
              },
              kind: "init",
            };
          });
          const stateProps: estree.Property[] = Object.keys(context.state)
            .filter((n) => bindNames.indexOf(n) === -1)
            .map((name) => ({
              type: "Property",
              method: false,
              shorthand: false,
              computed: false,
              key: b.str(name),
              value: {
                type: "ObjectExpression",
                properties: [
                  {
                    type: "Property",
                    method: false,
                    shorthand: false,
                    computed: false,
                    key: b.str("toState"),
                    value: b.str(name),
                    kind: "init",
                  },
                  {
                    type: "Property",
                    method: false,
                    shorthand: false,
                    computed: false,
                    key: b.str("parseAsInput"),
                    value: b.bool(false),
                    kind: "init",
                  },
                ],
              },
              kind: "init",
            }));
          const expression: estree.ObjectExpression = {
            type: "ObjectExpression",
            properties: [...bindsProps, ...stateProps],
          };
          this.replace(expression);
        } else if (elementValue === "CODE") {
          this.replace(script);
        } else if (elementValue === "CONTEXTS") {
          const expression: estree.ObjectExpression = {
            type: "ObjectExpression",
            properties: Object.keys(context.defs).map((identifier) => ({
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
        }
      }
    },
  });

  return generate(outputAst);
};

export default build;
