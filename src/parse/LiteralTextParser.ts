import Parser from "./Parser.ts";
import { TextNode } from "./mod.ts";

class LiteralTextParser extends Parser {
  private startIndex: number | null = null;
  private endIndex: number | null = null;

  processChar(character: string | null, index: number) {
    if (this.startIndex === null) {
      this.startIndex = index;
    }
    this.endIndex = index;

    this.buffer += character;

    return true;
  }

  getNodes(): TextNode[] {
    return this.buffer.length > 0
      ? [
          {
            type: "Text",
            text: this.buffer,
            fileIdentifier: this.fileIdentifier,
            startIndex: this.startIndex === null ? -1 : this.startIndex,
            endIndex: this.endIndex === null ? -1 : this.endIndex,
          },
        ]
      : [];
  }
}

export default LiteralTextParser;
