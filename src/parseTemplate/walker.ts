import { TemplateNode } from "./mod.ts";

type CallbackContext = {
  skip: () => void;
  replace: (node: TemplateNode) => void;
};

const walker = (
  ast: TemplateNode[],
  callback: (
    this: CallbackContext,
    node: TemplateNode,
    parents: TemplateNode[]
  ) => void
) => {
  for (const node of ast) {
    callback.call({
      replace: (node: TemplateNode) => {},
      skip: () => {},
    }, node, []);
  }
};

export default walker;
