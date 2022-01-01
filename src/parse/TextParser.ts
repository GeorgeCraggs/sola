import { TextNode } from "../ast/sfc.ts";
import LiteralTextParser from "./LiteralTextParser.ts";

class TextParser extends LiteralTextParser {
  getNodes(): TextNode[] {
    this.buffer = this.buffer.trim();

    return super.getNodes();
  }
}

export default TextParser;
