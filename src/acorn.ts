import * as acorn from "https://esm.sh/acorn";

export { acorn };

import { estree } from "./ast/estree.ts";

export const parseExpression = (expression: string) => {
  return acorn.parseExpressionAt(expression, 0, {
    ecmaVersion: 2022,
  }) as estree.Expression;
};
