import { estree } from "./estree.ts";
import { generate as b } from "./estreeHelper.ts";

class BaseBuilder<T extends estree.Node | undefined> {
  protected currentNode: T | null = null;

  constructor(newNode?: T) {
    if (newNode) {
      this.currentNode = newNode;
    }
  }

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

  build(): T {
    if (this.currentNode === null) {
      throw new Error("currentNode is null");
    }

    return this.currentNode;
  }
}

class IdentifierBuilder extends BaseBuilder<estree.Identifier> {}
class LiteralBuilder extends BaseBuilder<estree.Literal> {}
class CallExpressionBuilder extends BaseBuilder<estree.CallExpression> {}
class MemberExpressionBuilder extends BaseBuilder<estree.MemberExpression> {}
class ThisBuilder extends BaseBuilder<estree.ThisExpression> {}

class Builder extends BaseBuilder<estree.Node> {
  id(name: string) {
    return new IdentifierBuilder(b.id(name));
  }
  str(str: string) {
    return new LiteralBuilder(b.str(str));
  }
  this() {
    return new ThisBuilder(b.this());
  }
}

export default Builder;
