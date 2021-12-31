import { StateShape } from "../state.ts";
import { TemplateNode, HtmlTagNode } from "../parse/mod.ts";
import { estree, Builder, generate } from "../ast/estree.ts";
import { rewriteState } from "../state.ts";

const compileHtmlTag = (
  node: HtmlTagNode,
  addExpression: (expression: estree.Expression) => void,
  addQuasis: (text: string) => void,
  stateShape: StateShape,
  context: string[]
) => {
  addQuasis("<" + node.tag);

  node.attributes.attributes.forEach((attribute) => {
    addQuasis(` ${attribute.name}="`);
    if (typeof attribute.body === "string") {
      addQuasis(attribute.body);
    } else {
      addExpression(
        new Builder()
          .id("escapeHtml")
          .call(rewriteState(attribute.body.expression, stateShape, context))
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
    addExpression(convertToAst(node.children, stateShape, context));
  }
  addQuasis(`</${node.tag}>`);
};

const convertToAst = (
  tree: TemplateNode[],
  stateShape: StateShape,
  context: string[]
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
      compileHtmlTag(node, addExpression, addQuasis, stateShape, context);
    }

    if (node.type === "ScriptExpression") {
      addExpression(
        new Builder()
          .id("escapeHtml")
          .call(rewriteState(node.expression, stateShape, context))
          .build() as estree.Expression
      );
    }

    if (node.type === "IfBlock") {
      addExpression({
        type: "ConditionalExpression",
        test: rewriteState(node.conditionExpression, stateShape, context),
        consequent: convertToAst(node.children, stateShape, context),
        alternate: convertToAst(node.elseChildren, stateShape, context),
      });
    }

    if (node.type === "EachBlock") {
      const eachExpression = new Builder(
        rewriteState(node.iterator, stateShape, context)
      )
        .callMember(
          "map",
          generate.arrow(
            node.params,
            convertToAst(node.children, stateShape, context)
          )
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
