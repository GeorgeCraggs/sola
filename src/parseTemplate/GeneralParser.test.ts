import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import GeneralParser from "./GeneralParser.ts";

const parse = (str: string) => {
  const parser = new GeneralParser("filename");
  const results: boolean[] = [];

  for (const [index, character] of str.split("").entries()) {
    assertEquals(parser.processChar(character, index), true);
    results.push(parser.isValid());
  }

  return { results, parser };
};

Deno.test({
  name: "self-closing empty tag",
  fn: () => {
    const { results, parser } = parse("<div />");

    assertEquals(results, [false, false, false, false, false, false, true]);

    assertEquals(parser.getNodes(), [
      {
        type: "HtmlTag",
        tag: "div",
        attributes: {
          type: "AttributeList",
          attributes: [],
          directives: [],
        },
        children: [],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 6,
      },
    ]);
  },
});

Deno.test({
  name: "expression",
  fn: () => {
    const { results, parser } = parse("{expr}");

    assertEquals(results, [false, false, false, false, false, true]);

    assertEquals(parser.getNodes(), [
      {
        type: "ScriptExpression",
        expression: "expr",
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 5,
      },
    ]);
  },
});

Deno.test({
  name: "tag in expression",
  fn: () => {
    const { results, parser } = parse("{#if condition}<div>Hello</div>{/if}");

    assertEquals(results, [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);

    assertEquals(parser.getNodes(), [
      {
        type: "IfBlock",
        conditionExpression: "condition",
        children: [
          {
            type: "HtmlTag",
            tag: "div",
            attributes: {
              type: "AttributeList",
              attributes: [],
              directives: [],
            },
            children: [
              {
                type: "Text",
                text: "Hello",
                fileIdentifier: "filename",
                startIndex: 20,
                endIndex: 24,
              },
            ],
            fileIdentifier: "filename",
            startIndex: 15,
            endIndex: 30,
          },
        ],
        elseChildren: [],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 35,
      },
    ]);
  },
});
