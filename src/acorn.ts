// TODO: Make this safer
import * as estree from "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/f1238314d8d79a9c8d82bfee629190a673fd50aa/types/estree/index.d.ts";

import * as acorn from "https://esm.sh/acorn";

export { estree, acorn };

export const parseExpression = (expression: string) => {
  return acorn.parseExpressionAt(expression, 0, {
    ecmaVersion: 2022,
  }) as estree.Expression;
};
