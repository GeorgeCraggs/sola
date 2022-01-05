import Parser from "./Parser.ts";
import { ParseError } from "./mod.ts";
import { ExpressionNode, Attribute, Directive } from "../ast/sfc.ts";
import { parseExpression } from "../acorn.ts";

class AttributeBodyParser extends Parser {
  private delimeter;

  private depth = 1;
  private isComplete = false;
  private startIndex: number | null = null;
  private latestIndex: number | null = null;

  constructor(delimeter: "{" | `"`, fileIdentifier: string) {
    super(fileIdentifier);
    this.delimeter = delimeter;
  }

  processChar(character: string, index: number) {
    if (this.startIndex === null) {
      this.startIndex = index;
    }
    this.latestIndex = index;

    if (this.delimeter === `"` && character === `"`) {
      this.isComplete = true;
      return false;
    }

    if (this.delimeter === "{" && character === "{") {
      this.depth++;
    }

    if (this.delimeter === "{" && character === "}") {
      this.depth--;
    }

    if (this.delimeter === "{" && this.depth === 0) {
      this.isComplete = true;
      return false;
    }

    this.buffer += character;

    return true;
  }

  getBody(): string | ExpressionNode {
    if (!this.isComplete) {
      throw new ParseError("Failed to parse attribute", "", -1);
    }

    return this.delimeter === `"`
      ? this.buffer
      : {
          type: "Expression",
          expression: parseExpression(this.buffer),
          fileIdentifier: this.fileIdentifier,
          startIndex: this.startIndex === null ? -1 : this.startIndex,
          endIndex: (this.latestIndex || 0) - 1,
        };
  }

  isBodyValid() {
    return this.isComplete;
  }
}

class HtmlAttributeParser extends Parser {
  private attributes: { attributes: Attribute[], directives: Directive[] } = {
    attributes: [],
    directives: [],
  };
  private bodyParser: AttributeBodyParser | null = null;
  private parsedName: ReturnType<typeof this.parseSection> | null = null;

  parseSection(section: string):
    | { isDirective: false; name: string }
    | {
        isDirective: true;
        type: string;
        property: string;
        modifier: string | null;
      } {
    const matches = section.match(/([^:]+)(?::([^\.]+)(?:\.(.+))?)?/);
    const t = matches?.at(1);
    const property = matches?.at(2);
    const modifier = matches?.at(3);

    if (typeof t === "undefined") {
      throw new ParseError("Couldn't find attribute name", "", -1);
    }

    if (typeof property === "undefined" && typeof modifier === "undefined") {
      return {
        isDirective: false,
        name: section,
      };
    }

    if (typeof property === "undefined") {
      throw new ParseError("No property for directive", "", -1);
    }

    return {
      isDirective: true,
      type: t,
      property: property,
      modifier: modifier || null,
    };
  }

  processChar(character: string, index: number) {
    if (character === " " && this.bodyParser === null && this.buffer !== "") {
      const sec = this.parseSection(this.buffer);

      if (sec.isDirective) {
        this.attributes.directives.push({
          type: sec.type,
          property: sec.property,
          modifier: sec.modifier,
          body: "",
        });
      } else {
        this.attributes.attributes.push({
          name: sec.name.trim(),
          body: sec.name.trim(),
        });
      }

      this.buffer = "";

      return true;
    }

    if (
      (character === " " || character === "\n") &&
      this.bodyParser === null &&
      this.buffer === ""
    ) {
      return true;
    }

    if (character === "=" && this.bodyParser === null && this.buffer !== "") {
      this.parsedName = this.parseSection(this.buffer);

      this.buffer = "";

      return true;
    }

    if (this.parsedName !== null && this.bodyParser === null) {
      if (character !== "{" && character !== `"`) {
        throw new ParseError("Invalid character after =", "", -1);
      }

      this.bodyParser = new AttributeBodyParser(character, this.fileIdentifier);

      return true;
    }

    if (this.bodyParser && this.parsedName) {
      if (!this.bodyParser.processChar(character, index)) {
        if (this.parsedName.isDirective) {
          this.attributes.directives.push({
            type: this.parsedName.type,
            property: this.parsedName.property,
            modifier: this.parsedName.modifier,
            body: this.bodyParser.getBody(),
          });
        } else {
          this.attributes.attributes.push({
            name: this.parsedName.name.trim(),
            body: this.bodyParser.getBody(),
          });
        }

        this.bodyParser = null;
        this.parsedName = null;
      }

      return true;
    }

    this.buffer += character;

    return true;
  }

  getAttributeList() {
    if (
      this.bodyParser === null &&
      this.parsedName === null &&
      this.buffer !== ""
    ) {
      const sec = this.parseSection(this.buffer);

      if (sec.isDirective) {
        this.attributes.directives.push({
          type: sec.type,
          property: sec.property,
          modifier: sec.modifier,
          body: "",
        });
      } else {
        this.attributes.attributes.push({
          name: sec.name.trim(),
          body: sec.name.trim(),
        });
      }
    }

    return this.attributes;
  }

  isValid() {
    return this.parsedName === null;
  }
}

export default HtmlAttributeParser;
