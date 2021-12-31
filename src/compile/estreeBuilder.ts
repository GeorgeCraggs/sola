import { estree } from "../acorn.ts";
import { generate as b } from "./estreeHelper.ts";

class BaseBuilder {
  protected currentNode: estree.Node | null = null;

  constructor(newNode?: estree.Node) {
    if (newNode) {
      this.currentNode = newNode;
    }
  }

  build(): estree.Node {
    if (this.currentNode === null) {
      throw new Error("currentNode is null");
    }

    return this.currentNode;
  }
}

type Constructor = new (...args: any[]) => BaseBuilder;

function ExpressionOrSuperMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    call(
      ...args: (estree.Expression | estree.SpreadElement)[]
    ) {
      return new CallExpressionBuilder(
        b.call(this.currentNode as estree.Expression, args)
      );
    }

    callMember(
      identifier: string,
      ...args: (estree.Expression | estree.SpreadElement)[]
    ) {
      return new CallExpressionBuilder(
        b.call(b.get((this.currentNode as estree.Expression), b.id(identifier)), args)
      );
    }

    get(
      prop: estree.Expression | estree.PrivateIdentifier,
    ) {
      return new MemberExpressionBuilder(
        b.get((this.currentNode as estree.Expression), prop)
      );
    }
  };
}

class IdentifierBuilder extends ExpressionOrSuperMixin(BaseBuilder) {
  constructor(node: estree.Identifier) {
    super(node);
  }
}

class CallExpressionBuilder extends ExpressionOrSuperMixin(BaseBuilder) {
  constructor(node: estree.CallExpression) {
    super(node);
  }
}

class MemberExpressionBuilder extends ExpressionOrSuperMixin(BaseBuilder) {
  constructor(node: estree.MemberExpression) {
    super(node);
  }
}

class Builder extends ExpressionOrSuperMixin(BaseBuilder) {
  id(name: string): IdentifierBuilder {
    return new IdentifierBuilder(b.id(name));
  }
}

export default Builder;
