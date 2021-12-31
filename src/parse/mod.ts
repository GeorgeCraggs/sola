import GeneralParser from "./GeneralParser.ts";
import { estree } from "../ast/estree.ts";
import { acorn } from "../acorn.ts";
import walk from "./walker.ts";

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

export type Attribute = {
  name: string;
  body: string | ScriptExpression;
};

export type Directive = {
  type: string;
  property: string;
  modifier: string | null;
  body: string | ScriptExpression;
};

export type AttributeList = {
  type: "AttributeList";
  attributes: Attribute[];
  directives: Directive[];
};

export type HtmlTagNode = {
  type: "HtmlTag";
  tag: string;
  attributes: AttributeList;
  children: TemplateNode[];
  fileIdentifier: string;
  startIndex: number;
  endIndex: number;
};

export type TextNode = {
  type: "Text";
  text: string;
  fileIdentifier: string;
  startIndex: number;
  endIndex: number;
};

export type ScriptExpression = {
  type: "ScriptExpression";
  expression: estree.Expression;
  fileIdentifier: string;
  startIndex: number;
  endIndex: number;
};

export type IfBlock = {
  type: "IfBlock";
  conditionExpression: estree.Expression;
  children: TemplateNode[];
  elseChildren: TemplateNode[];
  fileIdentifier: string;
  startIndex: number;
  endIndex: number;
};

export type EachBlock = {
  type: "EachBlock";
  iterator: estree.Expression;
  params: estree.Pattern[];
  children: TemplateNode[];
  fileIdentifier: string;
  startIndex: number;
  endIndex: number;
};

export type ScriptBlock = IfBlock | EachBlock;

export type TemplateNode =
  | HtmlTagNode
  | TextNode
  | ScriptExpression
  | ScriptBlock;

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
        acorn.parse(
          (node.children[0] as TextNode).text,
          { ecmaVersion: 2022 }
        ) as estree.Node
      );
      this.replace(null);
    }

    if (node.type === "HtmlTag" && node.tag === "style") {
      styles.push((node.children[0] as TextNode).text);
      this.replace(null);
    }

    return true;
  });

  return { template: ast, scripts, styles };
};
