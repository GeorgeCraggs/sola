import { TemplateNode } from "./mod.ts";

type CallbackContext = {
  skip: () => void;
  replace: (node: TemplateNode | null) => void;
};

type CallbackFunction = (
  this: CallbackContext,
  node: TemplateNode,
  parents: TemplateNode[]
) => boolean | void;

const walkNode = (
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
    []
  );

  if (skip) return true;

  if (!skip && !skipChildren) {
    if ("children" in node) {
      walker(node.children, callback);
    }

    if ("elseChildren" in node) {
      walker(node.elseChildren, callback);
    }
  }

  return false;
};

const walker = (ast: TemplateNode[], callback: CallbackFunction) => {
  for (const [index, node] of ast.entries()) {
    if (walkNode(node, callback, (newNode) => {
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
