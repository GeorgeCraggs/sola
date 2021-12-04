import { unescapeHtml } from "../framework/mod.ts";
import { Token } from "./tokenise.ts";

export type PlainTreeToken = {
  type: "plain";
  content: string;
};

export type ScriptTreeToken = {
  type: "script";
  content: string;
};

export type IfTreeToken = {
  type: "if";
  content: string;
  children: TreeToken[];
  elseChildren: TreeToken[];
};

export type EachTreeToken = {
  type: "each";
  content: string;
  params: string;
  children: TreeToken[];
};

export type TreeToken =
  | PlainTreeToken
  | ScriptTreeToken
  | IfTreeToken
  | EachTreeToken;

export default (tokens: Token[]) => {
  const tokenTree: TreeToken[] = [];
  const currentDepth: (IfTreeToken | EachTreeToken)[] = [];
  let inElse = false;

  const getCurrentTokenTarget = () => {
    if (currentDepth.length === 0) {
      return tokenTree;
    }

    const current = currentDepth[currentDepth.length - 1];

    return inElse && current.type === "if"
      ? current.elseChildren
      : current.children;
  };

  const addTreeToken = (token: TreeToken) => {
    getCurrentTokenTarget().push(token);
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
      const [tagType, tagBody] = t.content.split(/ (.+)/);
      if (
        tagType === "else" &&
        currentDepth.length > 0 &&
        currentDepth[currentDepth.length - 1].type === "if"
      ) {
        inElse = true;
        continue;
      }

      if (tagType !== "if" && tagType !== "each") {
        throw new Error(
          `Unable to compile template: Invalid tag type '${tagType}'`
        );
      }

      let newToken: EachTreeToken | IfTreeToken = {
        type: "if",
        content: unescapeHtml(tagBody),
        children: [],
        elseChildren: [],
      };

      if (tagType === "each") {
        const [content, params] = unescapeHtml(tagBody).split(" as ");

        newToken = {
          type: "each",
          content: content,
          params: params,
          children: [],
        };
      }

      addTreeToken(newToken);
      currentDepth.push(newToken);
    } else if (t.type === "endblock") {
      const [tagType, tagBody] = t.content.split(/ (.+)/);

      if (tagType === "if") {
        inElse = false;
      }
      currentDepth.pop();
    }
  }

  return tokenTree;
};
