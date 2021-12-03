import * as parse5 from "https://cdn.skypack.dev/parse5?dts";
import * as treeAdapter from "https://cdn.skypack.dev/parse5-htmlparser2-tree-adapter?dts";
import walk from "./walk.ts";

const parseDirectives = (id: string, ast: parse5.Node) => {
  const directives: {
    [key: string]: {
      id: string;
      type: "on" | "bind" | "class";
      name: string;
      modifier: string;
      value: string;
    };
  } = {};

  walk(ast, (node) => {
    const eventAttributes = treeAdapter
      .getAttrList(node)
      .filter(({ name }) => /^[^:]+:/.test(name));

    eventAttributes.forEach(({ name, value }) => {
      const key = id + Object.keys(directives).length;

      const matches = name.match(/^([^:]+):([^\.]+).?(.*)/);
      const directiveType = matches?.at(1);
      const directiveName = matches?.at(2);
      const directiveModifier = matches?.at(3);

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
        name: directiveName || "",
        modifier: directiveModifier || "",
        value,
      };

      if (
        directiveType === "on" &&
        directiveName === "click" &&
        treeAdapter.getTagName(node) === "button"
      ) {
        treeAdapter.adoptAttributes(node, [
          {
            name: "type",
            value: "submit",
          },
          {
            name: "name",
            value: "submit",
          },
          {
            name: "value",
            value: key,
          },
        ]);
      } else if (directiveType === "bind" && directiveName) {
        if (directiveName === "value") {
          treeAdapter.adoptAttributes(node, [
            {
              name: "name",
              value: key,
            },
          ]);
        }

        treeAdapter.adoptAttributes(node, [
          {
            name: directiveName,
            value: `{${value}}`,
          },
        ]);
      }
    });
  });

  return directives;
};

export default parseDirectives;
