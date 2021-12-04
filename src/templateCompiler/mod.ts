import * as acorn from "https://esm.sh/acorn";
import { StateShape } from "../state.ts";
import tokenise from "./tokenise.ts";
import tokensToTree from "./tokenTree.ts";
import compileTree from "./compileTokenTree.ts";

export default (
  template: string,
  stateShape: StateShape,
  context: string[]
): acorn.Node => {
  const tokens = tokenise(template);
  const tree = tokensToTree(tokens);

  return compileTree(tree, stateShape, context);
};
