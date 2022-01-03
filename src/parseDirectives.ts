import { Node, HtmlTagNode, ExpressionNode } from "./ast/sfc.ts";
import { estree, Builder, generate } from "./ast/estree.ts";
import walk from "./parse/walker.ts";

export type AttributeBind = {
  type: "bind";
  attributeName: string;
  node: HtmlTagNode;
  bindTo: estree.Identifier,
  key: string;
};

export type Event = {
  type: "event";
  eventName: "click";
  expression: estree.Expression,
  node: HtmlTagNode;
  key: string;
};

export type Directive = AttributeBind | Event;

const processDirectives = (markup: Node[], componentId: string): Directive[] => {
  const directives: Directive[] = [];

  walk(markup, (node) => {
    if (node.type !== "HtmlTag") return;

    node.directives.forEach(
      ({ type: directiveType, property, modifier, body }) => {
        const key = componentId + Object.keys(directives).length;

        if (directiveType === "on" && property === "click") {
          if (node.tag !== "button") {
            throw new Error(`on:click must be on button tag`);
          }

          if (modifier) {
            throw new Error(`Unknown modifier ${modifier}`);
          }

          if (typeof body === "string") {
            throw new Error(`on:click must not be string`);
          }

          directives.push({
            type: "event",
            eventName: property,
            expression: body.expression,
            key,
            node,
          });

          node.attributes.push(
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

          return;
        }

        if (directiveType === "bind" && property === "value") {
          if (node.tag !== "input") {
            throw new Error(`bind must be on an input`);
          }

          if (modifier) {
            throw new Error(`Unknown modifier ${modifier}`);
          }

          if (typeof body === "string") {
            throw new Error(`bind directive must not be string`);
          }

          if (body.expression.type !== "Identifier") {
            throw new Error(`bind directive must be identifier`);
          }

          directives.push({
            type: "bind",
            attributeName: property,
            bindTo: body.expression,
            key,
            node,
          });

          node.attributes.push(
            {
              name: "name",
              body: key,
            },
            {
              name: "value",
              body,
            }
          );

          return;
        }

        throw new Error(`Directive not supported ${directiveType}:${property}`);
      }
    );
  });

  return directives;
};

const parseDirectives = (id: string, ast: Node[]) => {
  const directives: {
    [key: string]: {
      id: string;
      type: "on" | "bind" | "class";
      name: string;
      modifier: string;
      value: string | ExpressionNode;
    };
  } = {};

  walk(ast, (node) => {
    if (node.type !== "HtmlTag") return;

    node.directives.forEach(
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
          node.attributes.push(
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
            node.attributes.push(
              {
                name: "name",
                body: key,
              },
              {
                name: "value",
                body: key,
              }
            );
          }
        }
      }
    );
  });

  return directives;
};

export default processDirectives;
