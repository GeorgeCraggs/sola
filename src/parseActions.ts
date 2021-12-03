import * as parse5 from "https://cdn.skypack.dev/parse5?dts";
import * as treeAdapter from "https://cdn.skypack.dev/parse5-htmlparser2-tree-adapter?dts";
import walk from "./walk.ts";
import * as acorn from "https://esm.sh/acorn";

const parseActions = (id: string, ast: parse5.Node) => {
  const actionHandlers: { [key: string]: acorn.Node } = {};

  walk(ast, (node) => {
    const onClickAttr = treeAdapter.getAttrList(node).find(({ name }) => name === "on:click");

    if (!onClickAttr) {
      return true;
    }

    const name = id + Object.keys(actionHandlers).length;

    const handlerAst = acorn.parseExpressionAt(onClickAttr.value, 0, { ecmaVersion: 2022 });
    actionHandlers[name] = handlerAst;

    treeAdapter.adoptAttributes(node, [
      { name: "type", value: "submit" },
      { name: "name", value: "submit" },
      { name: "value", value: name },
    ]);
  });

  return actionHandlers;
};

export default parseActions;
