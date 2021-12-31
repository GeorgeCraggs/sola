import { estree } from "../acorn.ts";

const ident = (name: string): estree.Identifier => ({
  type: "Identifier",
  name,
});

const undef = (): estree.Identifier => {
  return ident("undefined");
};

export const generate = {
  ident,
  id: ident,

  num(num: number): estree.Literal {
    return {
      type: "Literal",
      value: num,
    };
  },
  str(str: string): estree.Literal {
    return {
      type: "Literal",
      value: str,
    };
  },
  bool(val: boolean): estree.Literal {
    return {
      type: "Literal",
      value: val,
    };
  },
  null(): estree.Literal {
    return {
      type: "Literal",
      value: null,
    };
  },
  this(): estree.ThisExpression {
    return {
      type: "ThisExpression",
    };
  },
  undef,

  if(
    test: estree.Expression,
    consequent: estree.Statement,
    alternate?: estree.Statement
  ): estree.IfStatement {
    return {
      type: "IfStatement",
      test,
      consequent,
      alternate,
    };
  },
  ternary(
    test: estree.Expression,
    consequent: estree.Expression,
    alternate?: estree.Expression
  ): estree.ConditionalExpression {
    return {
      type: "ConditionalExpression",
      test,
      consequent,
      alternate: alternate || undef(),
    };
  },

  call(
    callee: estree.Expression | estree.Super,
    args: (estree.Expression | estree.SpreadElement)[],
    optional = false
  ): estree.CallExpression {
    return {
      type: "CallExpression",
      callee,
      arguments: args,
      optional,
    };
  },
  fn(
    params: estree.Pattern[],
    body: estree.BlockStatement
  ): estree.FunctionExpression {
    return {
      type: "FunctionExpression",
      params,
      body,
    };
  },
  arrow(
    params: estree.Pattern[],
    body: estree.BlockStatement | estree.Expression
  ): estree.ArrowFunctionExpression {
    return {
      type: "ArrowFunctionExpression",
      expression: true,
      generator: false,
      async: false,
      params,
      body,
    };
  },

  get(
    obj: estree.Expression | estree.Super,
    prop: estree.Expression | estree.PrivateIdentifier
  ): estree.MemberExpression {
    return {
      type: "MemberExpression",
      object: obj,
      property: prop,
      computed: false,
      optional: false,
    };
  },

  block(
    body: estree.Statement[],
  ): estree.BlockStatement {
    return {
      type: "BlockStatement",
      body,
    };
  },

  return(
    argument?: estree.Expression | null,
  ): estree.ReturnStatement {
    return {
      type: "ReturnStatement",
      argument,
    };
  },
};

const propToAssignmentProp = (prop: estree.Property | estree.SpreadElement): estree.AssignmentProperty => {
  if (prop.type !== "Property") {
    throw new Error("");
  }

  if (prop.kind !== "init") {
    throw new Error("");
  }

  if (prop.method !== false) {
    throw new Error("");
  }

  if (prop.value.type !== "MemberExpression") {
    throw new Error("");
  }

  return prop as estree.AssignmentProperty;
};

export const validateEachParams = (exp: estree.Expression | estree.SpreadElement): estree.Pattern[] => {
  if (exp.type === "Identifier") {
    return [exp];
  }

  if (exp.type === "SequenceExpression") {
    return exp.expressions.flatMap(validateEachParams);
  }

  if (exp.type === "ArrayExpression") {
    return [{
      type: "ArrayPattern",
      elements: exp.elements.flatMap(exp => exp === null ? null : validateEachParams(exp)),
    }];
  }

  if (exp.type === "ObjectExpression") {
    return [
      {
        type: "ObjectPattern",
        properties: exp.properties.map(propToAssignmentProp),
      }
    ];
  }

  throw new Error(`Invalid expression type: "${exp.type}"`);
};
