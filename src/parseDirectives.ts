import { TemplateNode, ScriptExpression } from "./parse/mod.ts";
import walk from "./parse/walker.ts";
import { generate } from "./ast/estree.ts";

const parseDirectives = (id: string, ast: TemplateNode[]) => {
  const directives: {
    [key: string]: {
      id: string;
      type: "on" | "bind" | "class";
      name: string;
      modifier: string;
      value: string | ScriptExpression;
    };
  } = {};

  walk(ast, (node) => {
    if (node.type !== "HtmlTag") return;

    node.attributes.directives.forEach(({type: directiveType, property, modifier, body}) => {
      const key = id + Object.keys(directives).length;

      if (
        directiveType !== "on" &&
        directiveType !== "bind" &&
        directiveType !== "class"
      ) {
        throw new Error(`Invalid directive "${directiveType}"`);
      }

      directives[key] = {
        id: key,
        type: directiveType,
        name: property || "",
        modifier: modifier || "",
        value: body,
      };

      if (
        directiveType === "on" &&
        property === "click" &&
        node.tag === "button"
      ) {
        node.attributes.attributes.push(
          {
            name: "type",
            body: "submit",
          },
          {
            name: "name",
            body: "submit",
          },
          {
            name: "value",
            body: key,
          },
        );
      } else if (directiveType === "bind" && property) {
        if (property === "value") {
          node.attributes.attributes.push({
            name: "name",
            body: key,
          });
        }

        if (typeof body === "string") {
          node.attributes.attributes.push({
            name: property,
            body: {
              type: "ScriptExpression",
              expression: generate.id(body),
              fileIdentifier: "",
              startIndex: -1,
              endIndex: -1,
            },
          });
        }
      }
    });
  });

  return directives;
};

export default parseDirectives;
