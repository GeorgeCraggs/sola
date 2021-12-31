import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import { parseExpression } from "../acorn.ts";
import HtmlParser from "./HtmlParser.ts";

const parse = (str: string) => {
  const parser = new HtmlParser("filename");
  const results: boolean[] = [];

  for (const [index, character] of str.split("").entries()) {
    results.push(parser.processChar(character, index));
  }

  return { results, parser };
};

Deno.test({
  name: "self-closing empty tag",
  fn: () => {
    const { results, parser } = parse("<div />");

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

    assertEquals(results, [true, true, true, true, true, true, false]);
  },
});

Deno.test({
  name: "empty tag",
  fn: () => {
    const { results, parser } = parse("<div></div>");

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
        endIndex: 10,
      },
    ]);

    assertEquals(results, [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
  },
});

Deno.test({
  name: "nested tag",
  fn: () => {
    const { results, parser } = parse("<div><div></div></div>");

    assertEquals(parser.getNodes(), [
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
            type: "HtmlTag",
            tag: "div",
            attributes: {
              type: "AttributeList",
              attributes: [],
              directives: [],
            },
            children: [],
            fileIdentifier: "filename",
            startIndex: 5,
            endIndex: 15,
          },
        ],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 21,
      },
    ]);

    assertEquals(results, [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
  },
});

Deno.test({
  name: "multiple nested children",
  fn: () => {
    const { results, parser } = parse(`<form class="test">
        <h1>Something</h1>

        <button />
      </form>`);

    assertEquals(parser.getNodes(), [
      {
        type: "HtmlTag",
        tag: "form",
        attributes: {
          type: "AttributeList",
          attributes: [
            {
              name: "class",
              body: "test",
            },
          ],
          directives: [],
        },
        children: [
          {
            type: "HtmlTag",
            tag: "h1",
            attributes: {
              type: "AttributeList",
              attributes: [],
              directives: [],
            },
            children: [
              {
                type: "Text",
                text: "Something",
                fileIdentifier: "filename",
                startIndex: 32,
                endIndex: 40,
              },
            ],
            fileIdentifier: "filename",
            startIndex: 28,
            endIndex: 45,
          },
          {
            type: "HtmlTag",
            tag: "button",
            attributes: {
              type: "AttributeList",
              attributes: [],
              directives: [],
            },
            children: [],
            fileIdentifier: "filename",
            startIndex: 56,
            endIndex: 65,
          },
        ],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 79,
      },
    ]);

    assertEquals(results, [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
    ]);
  },
});

Deno.test({
  name: "nested tag with attribute",
  fn: () => {
    const { results, parser } = parse(`<div asdfasdfasdf="12">
      <div></div>
      </div>`);

    assertEquals(parser.getNodes(), [
      {
        type: "HtmlTag",
        tag: "div",
        attributes: {
          type: "AttributeList",
          attributes: [
            {
              name: "asdfasdfasdf",
              body: "12",
            },
          ],
          directives: [],
        },
        children: [
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
            startIndex: 30,
            endIndex: 40,
          },
        ],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 53,
      },
    ]);
  },
});

Deno.test({
  name: "script tag",
  fn: () => {
    const { results, parser } = parse(`<script asdf:asdfasdf={12}>
      <div></div>
      </script>`);

    assertEquals(parser.getNodes(), [
      {
        type: "HtmlTag",
        tag: "script",
        attributes: {
          type: "AttributeList",
          attributes: [],
          directives: [
            {
              type: "asdf",
              property: "asdfasdf",
              modifier: null,
              body: {
                type: "ScriptExpression",
                expression: parseExpression("12"),
                fileIdentifier: "filename",
                startIndex: 23,
                endIndex: 24,
              },
            },
          ],
        },
        children: [
          {
            type: "Text",
            text: "\n      <div></div>\n      ",
            fileIdentifier: "filename",
            startIndex: 27,
            endIndex: 51,
          },
        ],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 60,
      },
    ]);
  },
});
