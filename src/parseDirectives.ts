import { TemplateNode, ScriptExpression } from "./parse/mod.ts";
import walk from "./parse/walker.ts";

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

    node.attributes.directives.forEach(
      ({ type: directiveType, property, modifier, body }) => {
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
          if (typeof body === "string") {
            throw new Error("on:click directive can't be string");
          }
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
            }
          );
        } else if (directiveType === "bind" && property) {
          if (typeof body === "string") {
            throw new Error(
              'bind directive can\'t be string (bind:a="b" should be bind:a={b})'
            );
          }
          if (property === "value") {
            node.attributes.attributes.push({
              name: "name",
              body: key,
            });
          }
        }
      }
    );
  });

  return directives;
};

export default parseDirectives;
