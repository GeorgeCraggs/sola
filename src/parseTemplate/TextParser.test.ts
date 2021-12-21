import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import TextParser from "./TextParser.ts";

const parse = (str: string) => {
  const parser = new TextParser("filename");

  for (const [index, character] of str.split("").entries()) {
    assertEquals(parser.processChar(character, index), true);
  }

  return parser;
};

Deno.test({
  name: "no input",
  fn: () => {
    const parser = parse("");
    assertEquals(parser.getNodes(), []);
  },
});

Deno.test({
  name: "simple string",
  fn: () => {
    const parser = parse("this is a test ");
    assertEquals(parser.getNodes(), [
      {
        type: "Text",
        text: "this is a test",
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 14,
      },
    ]);
  },
});

Deno.test({
  name: "multi-line string",
  fn: () => {
    const parser = parse(`this is 
      a test `);
    assertEquals(parser.getNodes(), [
      {
        type: "Text",
        text: "this is \n      a test",
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 21,
      },
    ]);
  },
});

Deno.test({
  name: "multi-line string with leading and trailing newlines",
  fn: () => {
    const parser = parse(`
    this is 
      a test 
      `);
    assertEquals(parser.getNodes(), [
      {
        type: "Text",
        text: "this is \n      a test",
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 33,
      },
    ]);
  },
});
