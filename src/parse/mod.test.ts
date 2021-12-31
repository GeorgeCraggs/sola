import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import { parseExpression } from "../acorn.ts";
import { parseTemplate } from "./mod.ts";

Deno.test({
  name: "empty string gives no nodes",
  fn: () => {
    const ast = parseTemplate("file", "");

    assertEquals(ast, []);
  },
});

Deno.test({
  name: "simple string gives text node",
  fn: () => {
    const ast = parseTemplate("file", "This is a simple string");

    assertEquals(ast, [
      {
        type: "Text",
        text: "This is a simple string",
        fileIdentifier: "file",
        startIndex: 0,
        endIndex: 22,
      },
    ]);
  },
});

Deno.test({
  name: "div gives html tag",
  fn: () => {
    const ast = parseTemplate("file", "<div></div>");

    assertEquals(ast, [
      {
        type: "HtmlTag",
        tag: "div",
        attributes: {
          type: "AttributeList",
          attributes: [],
          directives: [],
        },
        children: [],
        fileIdentifier: "file",
        startIndex: 0,
        endIndex: 10,
      },
    ]);
  },
});

Deno.test({
  name: "more complex example",
  fn: () => {
    const ast = parseTemplate(
      "file",
      `
      <form class="thing">
        <h1>Title</h1>

        <div>
          <input
            class="rounded border"
            type="text"
            bind:value="abcd"
            placeholder="Enter something"
          />
          <button
            class="test"
            on:click="doThing"
          >
            Something
          </button>
        </div>

        <ul>
          {#each things as thing, index}
          <li class="thing">{thing}</li>
          {/each}
        </ul>
      </form>

      <style>
      .aspect {
        aspect-ratio: 1 / 1;
      }
      </style>
    `
    );

    assertEquals(ast, [
      {
        attributes: {
          type: "AttributeList",
          attributes: [
            {
              body: "thing",
              name: "class",
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
                text: "Title",
                fileIdentifier: "file",
                startIndex: 40,
                endIndex: 44,
              },
            ],
            fileIdentifier: "file",
            startIndex: 36,
            endIndex: 49,
          },
          {
            attributes: {
              type: "AttributeList",
              attributes: [],
              directives: [],
            },
            children: [
              {
                attributes: {
                  attributes: [
                    {
                      body: "rounded border",
                      name: "class",
                    },
                    {
                      body: "text",
                      name: "type",
                    },
                    {
                      body: "Enter something",
                      name: "placeholder",
                    },
                  ],
                  directives: [
                    {
                      body: "abcd",
                      modifier: null,
                      property: "value",
                      type: "bind",
                    },
                  ],
                  type: "AttributeList",
                },
                children: [],
                endIndex: 225,
                fileIdentifier: "file",
                startIndex: 76,
                tag: "input",
                type: "HtmlTag",
              },
              {
                attributes: {
                  attributes: [
                    {
                      body: "test",
                      name: "class",
                    },
                  ],
                  directives: [
                    {
                      body: "doThing",
                      modifier: null,
                      property: "click",
                      type: "on",
                    },
                  ],
                  type: "AttributeList",
                },
                children: [
                  {
                    endIndex: 344,
                    fileIdentifier: "file",
                    startIndex: 312,
                    text: "Something",
                    type: "Text",
                  },
                ],
                endIndex: 353,
                fileIdentifier: "file",
                startIndex: 237,
                tag: "button",
                type: "HtmlTag",
              },
            ],
            endIndex: 368,
            fileIdentifier: "file",
            startIndex: 60,
            tag: "div",
            type: "HtmlTag",
          },
          {
            attributes: {
              attributes: [],
              directives: [],
              type: "AttributeList",
            },
            children: [
              {
                children: [
                  {
                    attributes: {
                      attributes: [
                        {
                          body: "thing",
                          name: "class",
                        },
                      ],
                      directives: [],
                      type: "AttributeList",
                    },
                    children: [
                      {
                        endIndex: 459,
                        expression: parseExpression("thing"),
                        fileIdentifier: "file",
                        startIndex: 453,
                        type: "ScriptExpression",
                      },
                    ],
                    endIndex: 464,
                    fileIdentifier: "file",
                    startIndex: 435,
                    tag: "li",
                    type: "HtmlTag",
                  },
                ],
                endIndex: 482,
                fileIdentifier: "file",
                iterator: parseExpression("things"),
                params: parseExpression("thing, index"),
                startIndex: 394,
                type: "EachBlock",
              },
            ],
            endIndex: 496,
            fileIdentifier: "file",
            startIndex: 379,
            tag: "ul",
            type: "HtmlTag",
          },
        ],
        endIndex: 510,
        fileIdentifier: "file",
        startIndex: 7,
        tag: "form",
        type: "HtmlTag",
      },
      {
        attributes: {
          attributes: [],
          directives: [],
          type: "AttributeList",
        },
        children: [
          {
            endIndex: 585,
            fileIdentifier: "file",
            startIndex: 526,
            text: "\n      .aspect {\n        aspect-ratio: 1 / 1;\n      }\n      ",
            type: "Text",
          },
        ],
        endIndex: 593,
        fileIdentifier: "file",
        startIndex: 519,
        tag: "style",
        type: "HtmlTag",
      },
    ]);
  },
});

Deno.test({
  name: "formatted attributes",
  fn: () => {
    const ast = parseTemplate(
      "file",
      `
      <button
        on:click="doThing"
      >
        Something
      </button>
    `
    );

    assertEquals(ast, [
      {
        type: "HtmlTag",
        tag: "button",
        attributes: {
          type: "AttributeList",
          attributes: [],
          directives: [
            {
              type: "on",
              property: "click",
              modifier: null,
              body: "doThing",
            },
          ],
        },
        children: [
          {
            type: "Text",
            text: "Something",
            fileIdentifier: "file",
            startIndex: 49,
            endIndex: 73,
          },
        ],
        fileIdentifier: "file",
        startIndex: 7,
        endIndex: 82,
      },
    ]);
  },
});
