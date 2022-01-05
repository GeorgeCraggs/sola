import { Node, HtmlTagNode, ExpressionNode, EachBlockNode } from "./ast/sfc.ts";
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
  loopContexts: {
    param: estree.Identifier,
    vars: estree.Pattern,
    iterator: estree.Expression,
    eachBlock: EachBlockNode,
  }[],
  node: HtmlTagNode;
  key: string;
};

export type Directive = AttributeBind | Event;

const processDirectives = (markup: Node[], componentId: string): Directive[] => {
  const directives: Directive[] = [];

  walk(markup, (node, parents) => {
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

          const loopParents = parents.filter(p => p.type === "EachBlock") as EachBlockNode[];
          const clickLoopContexts = loopParents.map(p => {
            if (p.params.length <= 1) {
              p.params.push(generate.id("index"));
            }
            const indexParam = p.params[p.params.length - 1];
            if (indexParam.type !== "Identifier") {
              throw new Error("Index parameter for loop isn't Identifier");
            }

            return {
              param: indexParam,
              vars: p.params[0],
              iterator: p.iterator,
              eachBlock: p,
            };
          });

          directives.push({
            type: "event",
            eventName: property,
            expression: body.expression,
            loopContexts: clickLoopContexts,
            key,
            node,
          });

          const valueObj: ExpressionNode = {
            type: "Expression",
            expression: new Builder().id("JSON").callMember("stringify",
              new Builder().obj().defineProp("h", generate.str(key)).defineProp("i", generate.array(clickLoopContexts.map(a => a.param))).build()
            ).build(),
          };

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
              body: valueObj,
            },
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

export default processDirectives;
