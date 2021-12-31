import { TemplateNode } from "./mod.ts";

export type CallbackContext = {
  skip: () => void;
  replace: (node: TemplateNode | null) => void;
};

export type CallbackFunction = (
  this: CallbackContext,
  node: TemplateNode,
  parents: TemplateNode[]
) => boolean | void;

export const walkNode = (
  parents: TemplateNode[],
  node: TemplateNode,
  callback: CallbackFunction,
  replace: (node: TemplateNode | null) => void
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

const walker = (ast: TemplateNode[], callback: CallbackFunction, parents?: TemplateNode[]) => {
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
