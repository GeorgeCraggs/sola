import { Node, HtmlTagNode } from "../ast/sfc.ts";
import { estree, Builder, generate } from "../ast/estree.ts";
import { rewriteState, ContextDescriptor } from "../state.ts";

const compileHtmlTag = (
  node: HtmlTagNode,
  addExpression: (expression: estree.Expression) => void,
  addQuasis: (text: string) => void,
  context: ContextDescriptor
) => {
  addQuasis("<" + node.tag);

  node.attributes.forEach((attribute) => {
    addQuasis(` ${attribute.name}="`);
    if (typeof attribute.body === "string") {
      addQuasis(attribute.body);
    } else {
      addExpression(
        new Builder()
          .id("escapeHtml")
          .call(rewriteState(attribute.body.expression, context))
          .build() as estree.Expression
      );
    }
    addQuasis(`"`);
  });

  if (
    [
      "area",
      "base",
      "br",
      "col",
      "embed",
      "hr",
      "img",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr",
    ].indexOf(node.tag) !== -1 &&
    node.children.length <= 0
  ) {
    addQuasis(" />");

    return;
  }

  addQuasis(">");
  if (node.children.length > 0) {
    addExpression(convertToAst(node.children, context));
  }
  addQuasis(`</${node.tag}>`);
};

const convertToAst = (
  tree: Node[],
  context: ContextDescriptor
): estree.Expression => {
  const expressions: estree.Expression[] = [];
  const quasis: estree.TemplateElement[] = [
    {
      type: "TemplateElement",
      value: {
        raw: "",
      },
      tail: false,
    },
  ];

  const addExpression = (expression: estree.Expression) => {
    expressions.push(expression);
    quasis.push({
      type: "TemplateElement",
      value: {
        raw: "",
      },
      tail: false,
    });
  };

  const addQuasis = (text: string) => {
    quasis[quasis.length - 1].value.raw += text;
  };

  tree.forEach((node) => {
    if (node.type === "Text") {
      addQuasis(node.text);
    }

    if (node.type === "HtmlTag") {
      compileHtmlTag(node, addExpression, addQuasis, context);
    }

    if (node.type === "Expression") {
      const rewritten = rewriteState(node.expression, context);
      const newExpression =
        node.expression.type === "CallExpression" &&
        node.expression.callee.type === "Identifier" &&
        ["toHtmlText", "toFormValue", "escapeHtml"].indexOf(
          node.expression.callee.name
        ) !== -1
          ? rewritten
          : (new Builder()
              .id("toHtmlText")
              .call(rewritten)
              .build() as estree.Expression);
      addExpression(newExpression);
    }

    if (node.type === "IfBlock") {
      addExpression({
        type: "ConditionalExpression",
        test: rewriteState(node.conditionExpression, context),
        consequent: convertToAst(node.children, context),
        alternate: convertToAst(node.elseChildren, context),
      });
    }

    if (node.type === "EachBlock") {
      const eachExpression = new Builder(rewriteState(node.iterator, context))
        .callMember(
          "map",
          generate.arrow(node.params, convertToAst(node.children, context))
        )
        .callMember("join", generate.str(""))
        .build() as estree.CallExpression;
      addExpression(eachExpression);
    }
  });

  quasis[quasis.length - 1].tail = true;

  if (expressions.length === 1 && quasis.every((q) => q.value.raw === "")) {
    return expressions[0];
  }

  return {
    type: "TemplateLiteral",
    expressions,
    quasis,
  };
};

export default convertToAst;
