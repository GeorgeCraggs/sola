import { estree } from "./estree.ts";

export type Attribute = {
  name: string;
  body: string | ExpressionNode;
};

export type Directive = {
  type: string;
  property: string;
  modifier: string | null;
  body: string | ExpressionNode;
};

export type AttributeList = {
  type: "AttributeList";
  attributes: Attribute[];
  directives: Directive[];
};

export type HtmlTagNode = {
  type: "HtmlTag";
  tag: string;
  attributes: Attribute[];
  directives: Directive[]
  children: Node[];
  fileIdentifier?: string;
  startIndex?: number;
  endIndex?: number;
};

export type TextNode = {
  type: "Text";
  text: string;
  fileIdentifier?: string;
  startIndex?: number;
  endIndex?: number;
};

export type ExpressionNode = {
  type: "Expression";
  expression: estree.Expression;
  fileIdentifier?: string;
  startIndex?: number;
  endIndex?: number;
};

export type IfBlockNode = {
  type: "IfBlock";
  conditionExpression: estree.Expression;
  children: Node[];
  elseChildren: Node[];
  fileIdentifier?: string;
  startIndex?: number;
  endIndex?: number;
};

export type EachBlockNode = {
  type: "EachBlock";
  iterator: estree.Expression;
  params: estree.Pattern[];
  children: Node[];
  fileIdentifier?: string;
  startIndex?: number;
  endIndex?: number;
};

export type BlockNode = IfBlockNode | EachBlockNode;

export type Node =
  | HtmlTagNode
  | TextNode
  | ExpressionNode
  | BlockNode;
