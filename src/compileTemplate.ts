import * as acorn from "https://esm.sh/acorn";
import { rewriteState, StateShape } from "./state.ts";
import { unescapeHtml } from "./framework/mod.ts";

type PlainTreeToken = {
  type: "plain";
  content: string;
};

type ScriptTreeToken = {
  type: "script";
  content: string;
};

type IfTreeToken = {
  type: "if";
  content: string;
  children: TreeToken[];
};

type EachTreeToken = {
  type: "each";
  content: string;
  children: TreeToken[];
};

type TreeToken = PlainTreeToken | ScriptTreeToken | IfTreeToken | EachTreeToken;

type Token = {
  type: "plain" | "script" | "block" | "endblock";
  content: string;
};

const tokensToTree = (tokens: Token[]) => {
  const tokenTree: TreeToken[] = [];
  const currentDepth: (IfTreeToken | EachTreeToken)[] = [];

  const addTreeToken = (token: TreeToken) => {
    if (currentDepth.length === 0) {
      tokenTree.push(token);

      return;
    }

    currentDepth[currentDepth.length - 1].children.push(token);
  };

  for (const t of tokens) {
    if (t.type === "plain") {
      addTreeToken({
        type: "plain",
        content: t.content,
      });
    } else if (t.type === "script") {
      addTreeToken({
        type: "script",
        content: unescapeHtml(t.content),
      });
    } else if (t.type === "block") {
      const splitContent = t.content.split(/ (.+)/);
      if (splitContent[0] !== "if" && splitContent[0] !== "each") {
        throw new Error(
          "Unable to compile template: Invalid tag type '" +
            splitContent[0] +
            '"'
        );
      }
      const newToken: EachTreeToken | IfTreeToken = {
        type: splitContent[0],
        content: unescapeHtml(splitContent[1]),
        children: [],
      };
      addTreeToken(newToken);
      currentDepth.push(newToken);
    } else if (t.type === "endblock") {
      currentDepth.pop();
    }
  }

  return tokenTree;
};

const alternatePlain = (tree: TreeToken[]) => {
  for (let i = 0; i < tree.length; i++) {
    const item = tree[i];

    if ("children" in item) {
      alternatePlain(item.children);
    }

    if (i % 2 === 0 && tree[i].type !== "plain") {
      tree.splice(i, 0, {
        type: "plain",
        content: "",
      });
    }
  }

  if (tree[tree.length - 1].type !== "plain") {
    tree.push({
      type: "plain",
      content: "",
    });
  }
};

const convertToAst = (
  tree: TreeToken[],
  stateShape: StateShape,
  context: string[]
): acorn.Node => {
  const expressionTokens = tree.filter((t) => t.type !== "plain");
  const plainTokens = tree.filter((t) => t.type === "plain");

  return {
    type: "TemplateLiteral",
    /** @ts-ignore */
    expressions: expressionTokens.map((t) => {
      let contentAst = acorn.parseExpressionAt(t.content, 0, {
        ecmaVersion: 2022,
      });

      /** @ts-ignore */
      contentAst = rewriteState(contentAst, stateShape, context);

      switch (t.type) {
        case "script":
          return {
            type: "CallExpression",
            callee: {
              type: "Identifier",
              name: "escapeHtml",
            },
            arguments: [contentAst],
            optional: false,
          };
        case "if":
          return {
            type: "ConditionalExpression",
            test: contentAst,
            consequent: convertToAst(t.children, stateShape, context),
            alternate: {
              type: "Literal",
              value: "",
              raw: `""`,
            },
          };
        case "each":
          return {};
      }
    }),
    quasis: plainTokens.map((t, index) => ({
      type: "TemplateElement",
      value: {
        raw: t.content,
      },
      tail: index === plainTokens.length - 1,
    })),
  };
};

const compileTemplate = (
  template: string,
  stateShape: StateShape,
  context: string[]
): acorn.Node => {
  let depth = 0;

  const tokens: Token[] = [
    {
      type: "plain",
      content: "",
    },
  ];

  let currentToken = tokens[0];

  for (const character of template) {
    if (character === "{") {
      depth++;
    }
    if (character === "}") {
      depth--;
    }
    if (
      character === "#" &&
      currentToken.type === "script" &&
      currentToken.content === ""
    ) {
      currentToken.type = "block";
      continue;
    }
    if (
      character === "/" &&
      currentToken.type === "script" &&
      currentToken.content === ""
    ) {
      currentToken.type = "endblock";
      continue;
    }

    if (
      (depth !== 0 && currentToken.type === "plain") ||
      (depth === 0 &&
        (currentToken.type === "script" ||
          currentToken.type === "block" ||
          currentToken.type === "endblock"))
    ) {
      // Add new token
      tokens.push({
        type: depth === 0 ? "plain" : "script",
        content: "",
      });
      currentToken = tokens[tokens.length - 1];
    }

    if (character === "{" || character === "}") {
      continue;
    }

    currentToken.content = currentToken.content + character;
  }

  const tokenTree = tokensToTree(tokens);
  alternatePlain(tokenTree);

  return convertToAst(tokenTree, stateShape, context);
};

export default compileTemplate;
