import GeneralParser from "./GeneralParser.ts";
import { estree } from "../ast/estree.ts";
import { acorn } from "../acorn.ts";
import walk from "./walker.ts";
import { Node, TextNode } from "../ast/sfc.ts";

export class ParseErrorCollection extends Error {
  constructor(errors: ParseError[]) {
    if (errors.length === 0) {
      throw new Error("Tried to create an error collection with no errors");
    }

    super(errors[0].message);
  }
}

export class ParseError extends Error {
  public file;
  public index;
  constructor(message: string, file: string, index: number) {
    super(message);
    this.file = file;
    this.index = index;
  }
}

const indexToLineAndCol = (index: number, text: string) => {
  if (index < 0) {
    throw new Error("Index out of range (below zero)");
  }

  if (index >= text.length) {
    throw new Error("Index out of range");
  }

  const lines = text.substring(0, index + 1).split("\n");
  const lineNumber = lines.length;

  return { line: lineNumber, column: lines[lineNumber - 1].length };
};

export const parseTemplate = (fileIdentifier: string, template: string) => {
  const parser = new GeneralParser(fileIdentifier);

  for (const [index, character] of template.split("").entries()) {
    if (!parser.processChar(character, index)) {
      break;
    }
  }

  try {
    return parser.getNodes();
  } catch (e) {
    if (!(e instanceof ParseError)) {
      throw e;
    }

    const { line, column } = indexToLineAndCol(e.index, template);

    throw new Error(`${e.file}:${line}:${column} ${e.message}`);
  }
};

export default (fileIdentifier: string, fileContent: string) => {
  const ast = parseTemplate(fileIdentifier, fileContent);

  const styles: string[] = [];
  const scripts: estree.Node[] = [];

  walk(ast, function (node) {
    if (node.type === "HtmlTag" && node.tag === "script") {
      scripts.push(
        acorn.parse((node.children[0] as TextNode).text, {
          ecmaVersion: 2022,
          allowAwaitOutsideFunction: true,
        }) as estree.Node
      );
      this.replace(null);
    }

    if (node.type === "HtmlTag" && node.tag === "style") {
      styles.push((node.children[0] as TextNode).text);
      this.replace(null);
    }

    return true;
  });

  const getNextAndPrevSiblings = (
    node: Node,
    parents: Node[],
    prop: "children" | "elseChildren" | null
  ): { previous: Node | null, next: Node | null } => {
    const parent = parents.length > 0 ? parents[parents.length - 1] : null;

    const siblings =
      /** @ts-ignore */
      prop && parent && prop in parent ? parent[prop] : ast;
    const index = siblings.indexOf(node);

    return {
      previous: siblings[index - 1] || null,
      next: siblings[index + 1] || null,
    };
  };

  // Remove whitespace between HtmlTags and other nodes
  walk(ast, function (node, parents, prop) {
    if (node.type !== "Text") {
      return;
    }

    const { previous, next } = getNextAndPrevSiblings(node, parents, prop);

    if (previous === null || previous.type !== "Expression") {
      node.text = node.text.trimStart();
    }

    if (next === null || next.type !== "Expression") {
      node.text = node.text.trimEnd();
    }

    if (node.text === "") {
      this.remove();
    }
  });

  return { markup: ast, scripts, styles };
};
