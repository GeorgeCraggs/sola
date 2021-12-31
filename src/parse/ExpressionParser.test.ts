import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import { parseExpression } from "../acorn.ts";
import ExpressionParser from "./ExpressionParser.ts";

const parse = (str: string) => {
  const parser = new ExpressionParser("filename");
  const results: boolean[] = [];

  for (const [index, character] of str.split("").entries()) {
    results.push(parser.processChar(character, index));
  }

  for (let i = 0; i < results.length; i++) {
    assertEquals(results[i], i === results.length - 1 ? false : true);
  }

  return { results, parser };
};

Deno.test({
  name: "simple expression",
  fn: () => {
    const { parser } = parse("{expression}");

    assertEquals(parser.getNodes(), [
      {
        type: "ScriptExpression",
        expression: parseExpression("expression"),
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 11,
      },
    ]);
  },
});

Deno.test({
  name: "object expression",
  fn: () => {
    const { parser } = parse("{{ something: count > 12 }}");

    assertEquals(parser.getNodes(), [
      {
        type: "ScriptExpression",
        expression: parseExpression("{ something: count > 12 }"),
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 26,
      },
    ]);
  },
});

Deno.test({
  name: "if block",
  fn: () => {
    const { parser } = parse("{#if condition > 99 }{/if}");

    assertEquals(parser.getNodes(), [
      {
        type: "IfBlock",
        conditionExpression: parseExpression("condition > 99"),
        children: [],
        elseChildren: [],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 25,
      },
    ]);
  },
});

Deno.test({
  name: "if block with text content",
  fn: () => {
    const { parser } = parse("{#if condition > 99 } some content{/if}");

    assertEquals(parser.getNodes(), [
      {
        type: "IfBlock",
        conditionExpression: parseExpression("condition > 99"),
        children: [
          {
            type: "Text",
            text: "some content",
            fileIdentifier: "filename",
            startIndex: 21,
            endIndex: 33,
          },
        ],
        elseChildren: [],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 38,
      },
    ]);
  },
});
Deno.test({
  name: "if else block with text content",
  fn: () => {
    const { parser } = parse(
      "{#if condition > 99 } first {#else} content {/if}"
    );

    assertEquals(parser.getNodes(), [
      {
        type: "IfBlock",
        conditionExpression: parseExpression("condition > 99"),
        children: [
          {
            type: "Text",
            text: "first",
            fileIdentifier: "filename",
            startIndex: 21,
            endIndex: 27,
          },
        ],
        elseChildren: [
          {
            type: "Text",
            text: "content",
            fileIdentifier: "filename",
            startIndex: 35,
            endIndex: 43,
          },
        ],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 48,
      },
    ]);
  },
});

Deno.test({
  name: "if block with html content",
  fn: () => {
    const { parser } = parse("{#if thing }<p>this is a thing</p>{/if}");

    assertEquals(parser.getNodes(), [
      {
        type: "IfBlock",
        conditionExpression: parseExpression("thing"),
        children: [
          {
            type: "HtmlTag",
            tag: "p",
            attributes: {
              type: "AttributeList",
              attributes: [],
              directives: [],
            },
            children: [
              {
                type: "Text",
                text: "this is a thing",
                fileIdentifier: "filename",
                startIndex: 15,
                endIndex: 29,
              },
            ],
            fileIdentifier: "filename",
            startIndex: 12,
            endIndex: 33,
          },
        ],
        elseChildren: [],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 38,
      },
    ]);
  },
});

Deno.test({
  name: "each block",
  fn: () => {
    const { parser } = parse("{#each iterable as value, index}{value}{/each}");

    assertEquals(parser.getNodes(), [
      {
        type: "EachBlock",
        iterator: parseExpression("iterable"),
        params: parseExpression("value, index"),
        children: [
          {
            type: "ScriptExpression",
            expression: parseExpression("value"),
            fileIdentifier: "filename",
            startIndex: 32,
            endIndex: 38,
          },
        ],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 45,
      },
    ]);
  },
});

Deno.test({
  name: "nested block",
  fn: () => {
    const { parser } = parse(
      `{#each iterable as value, index}
        <h1>This is an iteration</h1>
        {#if index === 0}
          This is the first iteration
        {/if}
      {/each}`
    );

    assertEquals(parser.getNodes(), [
      {
        type: "EachBlock",
        iterator: parseExpression("iterable"),
        params: parseExpression("value, index"),
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
                text: "This is an iteration",
                fileIdentifier: "filename",
                startIndex: 45,
                endIndex: 64,
              },
            ],
            fileIdentifier: "filename",
            startIndex: 41,
            endIndex: 69,
          },
          {
            type: "IfBlock",
            conditionExpression: parseExpression("index === 0"),
            children: [
              {
                type: "Text",
                text: "This is the first iteration",
                fileIdentifier: "filename",
                startIndex: 96,
                endIndex: 142,
              },
            ],
            elseChildren: [],
            fileIdentifier: "filename",
            startIndex: 79,
            endIndex: 147,
          },
        ],
        fileIdentifier: "filename",
        startIndex: 0,
        endIndex: 161,
      },
    ]);
  },
});
