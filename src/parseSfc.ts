import * as acorn from "https://esm.sh/acorn";
import * as parse5 from "https://cdn.skypack.dev/parse5?dts";
import * as treeAdapter from "https://cdn.skypack.dev/parse5-htmlparser2-tree-adapter?dts";
import walk from "./walk.ts";

const parseSfc = async (filePath: string) => {
  const ast = parse5.parseFragment(await Deno.readTextFile(filePath), {
    treeAdapter: treeAdapter,
  });

  const styles: string[] = [];
  const scripts: acorn.Node[] = [];

  walk(ast, (node) => {
    if (treeAdapter.getTagName(node) === "root") {
      return true;
    }

    if (treeAdapter.getTagName(treeAdapter.getParentNode(node)) !== "root") {
      return false;
    }

    // Extract scripts
    if (treeAdapter.getTagName(node) === "script") {
      scripts.push(
        acorn.parse(
          treeAdapter.getTextNodeContent(treeAdapter.getFirstChild(node)),
          { ecmaVersion: 2022 }
        )
      );
      treeAdapter.detachNode(node);
    }

    // Extract styles
    if (treeAdapter.getTagName(node) === "style") {
      const textNode = treeAdapter.getFirstChild(node);
      if (textNode) {
        styles.push(treeAdapter.getTextNodeContent(textNode));
      }
      treeAdapter.detachNode(node);
    }
  });

  walk(ast, (node) => {
    // Cleanup empty spaces
    if (
      treeAdapter.getTagName(node) === undefined &&
      /^[\n\t\r]*$/.test(treeAdapter.getTextNodeContent(node))
    ) {
      treeAdapter.detachNode(node);
    }
  });

  return { template: ast, scripts, styles };
};

export default parseSfc;
