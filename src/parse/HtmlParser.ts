import Parser from "./Parser.ts";
import { ParseError } from "./mod.ts";
import { HtmlTagNode, Attribute, Directive, Node } from "../ast/sfc.ts";
import GeneralParser from "./GeneralParser.ts";
import LiteralTextParser from "./LiteralTextParser.ts";
import HtmlAttributeParser from "./HtmlAttributeParser.ts";

class HtmlParser extends Parser {
  private parser:
    | HtmlAttributeParser
    | GeneralParser
    | LiteralTextParser
    | null = null;
  private tag = "";
  private attributes: {
    attributes: Attribute[];
    directives: Directive[];
  } | null = null;
  private children: Node[] = [];
  private startIndex: number | null = null;
  private endIndex: number | null = null;
  private textTags = ["script", "style", "pre", "textarea"];

  processChar(character: string, index: number) {
    if (this.startIndex === null) {
      this.startIndex = index;
    }

    this.buffer += character;

    // Check if ending tag found
    if (
      `</${this.tag}>` === this.buffer &&
      ((this.parser instanceof GeneralParser && this.parser.isValid()) ||
        this.parser instanceof LiteralTextParser)
    ) {
      this.endIndex = index;
      this.children = this.parser.getNodes();
      this.parser = null;
      this.buffer = "";

      return false;
    }

    if (
      this.buffer.slice(-2) === "/>" &&
      this.parser instanceof HtmlAttributeParser &&
      this.parser.isValid()
    ) {
      this.attributes = this.parser.getAttributeList();
      this.parser = null;
      this.buffer = "";
      this.endIndex = index;

      return false;
    }

    // Do we need to start parsing the body
    if (this.tag === "" && this.parser === null && character === ">") {
      this.tag = this.buffer.slice(1, this.buffer.length - 1).trim();
      this.attributes = {
        attributes: [],
        directives: [],
      };
      this.buffer = "";
      this.parser =
        this.textTags.indexOf(this.tag) === -1
          ? new GeneralParser(this.fileIdentifier)
          : new LiteralTextParser(this.fileIdentifier);

      return true;
    }

    if (
      character === ">" &&
      this.parser instanceof HtmlAttributeParser &&
      this.parser.isValid()
    ) {
      this.attributes = this.parser.getAttributeList();
      this.buffer = "";
      this.parser =
        this.textTags.indexOf(this.tag) === -1
          ? new GeneralParser(this.fileIdentifier)
          : new LiteralTextParser(this.fileIdentifier);

      return true;
    }

    // Do we need to start parsing the attributes
    if (this.tag === "" && this.parser === null && character === " ") {
      this.tag = this.buffer.slice(1, this.buffer.length - 1).trim();
      this.buffer = "";
      this.parser = new HtmlAttributeParser(this.fileIdentifier);

      return true;
    }

    // Do we need to start parsing attributes
    if (character === " " && this.tag === "") {
      this.tag = this.buffer.slice(0, this.buffer.length - 2).trim();
      this.buffer = "";
      this.parser = new HtmlAttributeParser(this.fileIdentifier);

      return true;
    }

    if (this.parser === null) {
      return true;
    }

    if (
      (this.parser instanceof LiteralTextParser || this.parser.isValid()) &&
      this.buffer.length >= 1 &&
      (this.buffer === "/" ||
        `</${this.tag}>`.slice(0, this.buffer.length) === this.buffer)
    ) {
      return true;
    }

    let count = this.buffer.length - 1;
    for (const bufferedChar of this.buffer) {
      if (!this.parser.processChar(bufferedChar, index - count)) {
        throw new ParseError("Unknown error parsing", "", -1);
      }
      count--;
    }
    this.buffer = "";

    return true;
  }

  getNodes(): HtmlTagNode[] {
    if (this.endIndex === null) {
      throw new ParseError(
        `Unclosed "${this.tag}" tag found. Please ensure all tags have a matching closing tag or are self closing.`,
        this.fileIdentifier,
        this.startIndex === null ? -1 : this.startIndex
      );
    }

    if (this.tag === "") {
      throw new ParseError(
        "Failed to parse tag name",
        this.fileIdentifier,
        this.startIndex === null ? -1 : this.startIndex
      );
    }

    if (this.attributes === null) {
      throw new ParseError(
        "Failed to parse attributes",
        this.fileIdentifier,
        this.startIndex === null ? -1 : this.startIndex
      );
    }

    return [
      {
        type: "HtmlTag",
        tag: this.tag,
        ...this.attributes,
        children: this.children,
        fileIdentifier: this.fileIdentifier,
        startIndex: this.startIndex === null ? -1 : this.startIndex,
        endIndex: this.endIndex === null ? -1 : this.endIndex,
      },
    ];
  }
}

export default HtmlParser;
