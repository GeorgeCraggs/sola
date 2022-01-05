import { Node } from "../ast/sfc.ts";

export type CallbackContext = {
  skip: () => void;
  replace: (node: Node | null) => void;
  remove: () => void;
};

export type CallbackFunction = (
  this: CallbackContext,
  node: Node,
  parents: Node[],
  prop: "children" | "elseChildren" | null
) => boolean | void;

export const walkNode = (
  parents: Node[],
  node: Node,
  prop: "children" | "elseChildren" | null,
  callback: CallbackFunction,
  replace: (node: Node | null) => void
): boolean => {
  let skip = false;

  const skipChildren = callback.call(
    {
      replace,
      skip: () => {
        skip = true;
      },
      remove: () => replace(null),
    },
    node,
    parents,
    prop
  );

  if (skip) return true;

  if (!skip && !skipChildren) {
    if ("children" in node) {
      walker(node.children, callback, "children", [...parents, node]);
    }

    if ("elseChildren" in node) {
      walker(node.elseChildren, callback, "elseChildren", [...parents, node]);
    }
  }

  return false;
};

const walker = (
  ast: Node[],
  callback: CallbackFunction,
  prop?: "children" | "elseChildren" | null,
  parents?: Node[]
) => {
  for (const [index, node] of ast.entries()) {
    if (
      walkNode(parents ?? [], node, prop ?? null, callback, (newNode) => {
        if (newNode) {
          ast.splice(index, 1, newNode);
        } else {
          ast.splice(index, 1);
        }
      })
    ) {
      break;
    }
  }
};

export default walker;
