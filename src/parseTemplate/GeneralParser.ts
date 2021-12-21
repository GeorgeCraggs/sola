import Parser from "./Parser.ts";
import { TemplateNode, ParseError, ParseErrorCollection } from "./mod.ts";
import HtmlParser from "./HtmlParser.ts";
import TextParser from "./TextParser.ts";
import ExpressionParser from "./ExpressionParser.ts";

/**
 * Parses a section containing one or more text nodes, html tag nodes and
 * expression nodes. E.g. The entire file or children of a html tag
 */

class GeneralParser extends Parser {
  private parser: Parser | null = null;
  private nodes: TemplateNode[] = [];
  private errors: ParseError[] = [];

  processChar(character: string, index: number) {
    if (
      this.parser instanceof TextParser &&
      (character === "{" || character === "<")
    ) {
      this.nodes.push(...this.parser.getNodes());
      this.parser = null;
    }

    if (this.parser === null) {
      this.parser =
        character === "{"
          ? new ExpressionParser(this.fileIdentifier)
          : character === "<"
          ? new HtmlParser(this.fileIdentifier)
          : new TextParser(this.fileIdentifier);
    }

    if (!this.parser.processChar(character, index)) {
      try {
        this.nodes.push(...this.parser.getNodes());
      } catch (e) {
        if (!(e instanceof ParseError)) {
          throw e;
        }

        this.errors.push(e);
      }

      this.parser = null;
    }

    return true;
  }

  getNodes() {
    if (this.errors.length > 0) {
      throw new ParseErrorCollection(this.errors);
    }

    const finalNodes = this.parser?.getNodes() || [];

    return [...this.nodes, ...finalNodes];
  }

  isValid() {
    return this.parser === null || this.parser instanceof TextParser;
  }
}

export default GeneralParser;
