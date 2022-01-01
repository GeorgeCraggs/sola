import { Node } from "../ast/sfc.ts";

class Parser {
  protected buffer = "";
  protected fileIdentifier;

  constructor(fileIdentifier: string) {
    if (this.constructor === Parser) {
      throw new Error("Can't instantiate abstract class!");
    }

    this.fileIdentifier = fileIdentifier;
  }
  /**
   *  Process the next character in the string. Returns false when no more
   *  characters can be accepted.
   */
  processChar(_character: string, _index: number): boolean {
    throw new Error("Method 'processChar()' must be implemented.");
  }
  /**
   * Returns generated Nodes - will throw ParseErrorCollection if there
   * was an error parsing (only call when processChar returns false, or
   * characters have been exhausted)
   */
  getNodes(): Node[] {
    throw new Error("Method 'getNodes()' must be implemented.");
  }
}

export default Parser;
