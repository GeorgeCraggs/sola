import Parser from "./Parser.ts";
import {
  ParseError,
  ScriptExpression,
  IfBlock,
  EachBlock,
  TemplateNode,
} from "./mod.ts";
import GeneralParser from "./GeneralParser.ts";
import { parseExpression } from "../acorn.ts";
import { validateEachParams } from "../compile/estreeHelper.ts";

class ExpressionParser extends Parser {
  private depth = 0;
  private parser: GeneralParser | null = null;
  private block: IfBlock | EachBlock | null = null;
  private blockName = "";
  private useElse = false;
  private startIndex: number | null = null;
  private endIndex: number | null = null;

  processChar(character: string, index: number) {
    if (this.startIndex === null) {
      this.startIndex = index;
    }
    this.endIndex = index;

    if (this.parser === null) {
      if (character === "{") {
        this.depth++;
      }

      if (character === "}") {
        this.depth--;
      }

      if (
        !(
          (character === "{" && this.depth === 1) ||
          (character === "}" && this.depth === 0)
        )
      ) {
        this.buffer += character;
      }

      if (this.buffer === "#if ") {
        this.blockName = "if";
        this.block = {
          type: "IfBlock",
          conditionExpression: {
            type: "Identifier",
            name: "",
          },
          children: [],
          elseChildren: [],
          fileIdentifier: this.fileIdentifier,
          startIndex: this.startIndex === null ? -1 : this.startIndex,
          endIndex: -1,
        };
        this.buffer = "";
      }

      if (this.buffer === "#each ") {
        this.blockName = "each";
        this.block = {
          type: "EachBlock",
          iterator: {
            type: "Identifier",
            name: "",
          },
          params: [{
            type: "Identifier",
            name: "",
          }],
          children: [],
          fileIdentifier: this.fileIdentifier,
          startIndex: this.startIndex === null ? -1 : this.startIndex,
          endIndex: -1,
        };
        this.buffer = "";
      }

      if (this.depth === 0 && this.block !== null) {
        this.parser = new GeneralParser(this.fileIdentifier);

        if (this.block.type === "IfBlock") {
          this.block.conditionExpression = parseExpression(this.buffer.trim());
        } else {
          const [iterator, params] = this.buffer.trim().split(" as ");
          this.block.iterator = parseExpression(iterator);
          this.block.params = validateEachParams(parseExpression(params));
        }

        this.buffer = "";

        return true;
      }

      return this.depth === 0 ? false : true;
    }

    if (this.block === null) {
      throw new Error("There should be a block by now");
    }

    this.buffer += character;
    if (this.parser.isValid() && "{#else}" === this.buffer) {
      this.useElse = true;
      this.buffer = "";
      this.block.children = this.parser.getNodes();
      this.parser = new GeneralParser(this.fileIdentifier);
    }

    if (this.parser.isValid() && `{/${this.blockName}}` === this.buffer) {
      this.block.endIndex = index;
      if (this.useElse && this.block.type === "IfBlock") {
        this.block.elseChildren = this.parser.getNodes();
      } else {
        this.block.children = this.parser.getNodes();
      }
      this.parser = null;

      return false;
    }

    if (
      this.parser.isValid() &&
      ("{#else}".slice(0, this.buffer.length) === this.buffer ||
        `{/${this.blockName}}`.slice(0, this.buffer.length) === this.buffer)
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

  getNodes(): (ScriptExpression | IfBlock | EachBlock)[] {
    if (this.depth > 0) {
      throw new ParseError("Missing matching '}' for '{' on ...", "", -1);
    }

    if (this.block && this.block.endIndex === -1) {
      throw new ParseError(
        `Missing '{/${this.block?.type === "IfBlock" ? "if" : "each"}}`,
        "",
        -1
      );
    }

    return this.block === null
      ? [
          {
            type: "ScriptExpression",
            expression: parseExpression(this.buffer.trim()),
            fileIdentifier: this.fileIdentifier,
            startIndex: this.startIndex === null ? -1 : this.startIndex,
            endIndex: this.endIndex === null ? -1 : this.endIndex,
          },
        ]
      : [this.block];
  }
}

export default ExpressionParser;
