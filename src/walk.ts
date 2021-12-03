import * as parse5 from "https://cdn.skypack.dev/parse5?dts";
import * as treeAdapter from "https://cdn.skypack.dev/parse5-htmlparser2-tree-adapter?dts";

const walk = (
  node: parse5.Node | parse5.DocumentFragment,
  callback: (node: parse5.Node | parse5.DocumentFragment) => boolean | void
) => {
  if (callback(node) === false) {
    return false;
  }

  const childNodes = treeAdapter.getChildNodes(node);

  if (!(childNodes && childNodes.length > 0)) {
    return;
  }

  let i = 0;
  let childNode = childNodes[i];

  while (childNode !== undefined) {
    if (walk(childNode, callback) === false) {
      return true;
    }

    childNode = childNodes[++i];
  }
};

export default walk;
