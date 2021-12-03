import * as parse5 from "https://cdn.skypack.dev/parse5?dts";
import * as treeAdapter from "https://cdn.skypack.dev/parse5-htmlparser2-tree-adapter?dts";
import walk from "./walk.ts";

const parseBinds = (ast: parse5.Node) => {
  walk(ast, (node) => {
    const bindAttrs = treeAdapter
      .getAttrList(node)
      .filter(({ name }) => /^bind:*/.test(name));

    if (bindAttrs.length > 0) {
      treeAdapter.adoptAttributes(
        node,
        bindAttrs.map(({ name, value }) => ({
          name: name.substring(5),
          value: `{${value}}`,
        }))
      );
    }
  });
};

export default parseBinds;
