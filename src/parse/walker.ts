import { Node } from "../ast/sfc.ts";

export type CallbackContext = {
  skip: () => void;
  replace: (node: Node | null) => void;
};

export type CallbackFunction = (
  this: CallbackContext,
  node: Node,
  parents: Node[]
) => boolean | void;

export const walkNode = (
  parents: Node[],
  node: Node,
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
    },
    node,
    parents,
  );

  if (skip) return true;

  if (!skip && !skipChildren) {
    if ("children" in node) {
      walker(node.children, callback, [...parents, node]);
    }

    if ("elseChildren" in node) {
      walker(node.elseChildren, callback, [...parents, node]);
    }
  }

  return false;
};

const walker = (ast: Node[], callback: CallbackFunction, parents?: Node[]) => {
  for (const [index, node] of ast.entries()) {
    if (walkNode(parents ?? [], node, callback, (newNode) => {
      if (newNode) {
        ast.splice(index, 1, newNode);
      } else {
        ast.splice(index, 1);
      }
    })) {
      break;
    }
  }
};

export default walker;
