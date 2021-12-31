import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import { parseExpression } from "../acorn.ts";
import HtmlAttributeParser from "./HtmlAttributeParser.ts";

const parse = (str: string) => {
  const parser = new HtmlAttributeParser("filename");
  const processTable: {
    c: string;
    ret: boolean;
    valid: boolean;
  }[] = [];

  for (const [index, character] of str.split("").entries()) {
    const result = {
      c: character,
      ret: parser.processChar(character, index),
      valid: parser.isValid(),
    };

    if (processTable.length === 0) {
      processTable.push(result);
      continue;
    }

    const lastInTable = processTable[processTable.length - 1];
    if (
      result.c !== "" &&
      result.ret === lastInTable.ret &&
      result.valid === lastInTable.valid
    ) {
      lastInTable.c += result.c;

      continue;
    }

    processTable.push(result);
  }

  return { processTable, parser };
};

Deno.test({
  name: "empty string gives empty attribute list",
  fn: () => {
    const { processTable, parser } = parse("");

    assertEquals(processTable, []);
    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [],
      directives: [],
    });
  },
});

Deno.test({
  name: "boolean attribute parsed",
  fn: () => {
    const { processTable, parser } = parse("hidden");

    assertEquals(processTable, [
      {
        c: "hidden",
        ret: true,
        valid: true,
      },
    ]);

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [
        {
          name: "hidden",
          body: "hidden",
        },
      ],
      directives: [],
    });
  },
});

Deno.test({
  name: "multiple boolean attributes parsed",
  fn: () => {
    const { parser } = parse("hidden test");

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [
        {
          name: "hidden",
          body: "hidden",
        },
        {
          name: "test",
          body: "test",
        },
      ],
      directives: [],
    });
  },
});

Deno.test({
  name: "string attribute parsed",
  fn: () => {
    const { processTable, parser } = parse(`key="value"`);

    assertEquals(processTable, [
      {
        c: "key",
        ret: true,
        valid: true,
      },
      {
        c: `="value`,
        ret: true,
        valid: false,
      },
      {
        c: '"',
        ret: true,
        valid: true,
      },
    ]);

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [
        {
          name: "key",
          body: "value",
        },
      ],
      directives: [],
    });
  },
});

Deno.test({
  name: "script attribute parsed",
  fn: () => {
    const { processTable, parser } = parse(`key={expression > "123"}`);

    assertEquals(processTable, [
      {
        c: "key",
        ret: true,
        valid: true,
      },
      {
        c: `={expression > "123"`,
        ret: true,
        valid: false,
      },
      {
        c: "}",
        ret: true,
        valid: true,
      },
    ]);

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [
        {
          name: "key",
          body: {
            type: "ScriptExpression",
            expression: parseExpression(`expression > "123"`),
            fileIdentifier: "filename",
            startIndex: 5,
            endIndex: 22,
          },
        },
      ],
      directives: [],
    });
  },
});

Deno.test({
  name: "script attribute object parsed",
  fn: () => {
    const { processTable, parser } = parse(`key={{ something: a, "something-else": false }}`);

    assertEquals(processTable, [
      {
        c: "key",
        ret: true,
        valid: true,
      },
      {
        c: `={{ something: a, "something-else": false }`,
        ret: true,
        valid: false,
      },
      {
        c: "}",
        ret: true,
        valid: true,
      },
    ]);

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [
        {
          name: "key",
          body: {
            type: "ScriptExpression",
            expression: parseExpression(`{ something: a, "something-else": false }`),
            fileIdentifier: "filename",
            startIndex: 5,
            endIndex: 45,
          },
        },
      ],
      directives: [],
    });
  },
});

Deno.test({
  name: "multiple parsed",
  fn: () => {
    const { processTable, parser } = parse(
      `something key={expression > "123"} value="124"`
    );

    assertEquals(processTable, [
      {
        c: "something key",
        ret: true,
        valid: true,
      },
      {
        c: `={expression > "123"`,
        ret: true,
        valid: false,
      },
      {
        c: "} value",
        ret: true,
        valid: true,
      },
      {
        c: `="124`,
        ret: true,
        valid: false,
      },
      {
        c: `"`,
        ret: true,
        valid: true,
      },
    ]);

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [
        {
          name: "something",
          body: "something",
        },
        {
          name: "key",
          body: {
            type: "ScriptExpression",
            expression: parseExpression(`expression > "123"`),
            fileIdentifier: "filename",
            startIndex: 15,
            endIndex: 32,
          },
        },
        {
          name: "value",
          body: "124",
        },
      ],
      directives: [],
    });
  },
});

Deno.test({
  name: "newlines at start and end",
  fn: () => {
    const { processTable, parser } = parse(
      `  
      something
      key={expression > "123"}
      `
    );

    assertEquals(processTable, [
      {
        c: "  \n      something\n      key",
        ret: true,
        valid: true,
      },
      {
        c: `={expression > "123"`,
        ret: true,
        valid: false,
      },
      {
        c: "}\n      ",
        ret: true,
        valid: true,
      },
    ]);

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [
        {
          name: "something",
          body: "something",
        },
        {
          name: "key",
          body: {
            type: "ScriptExpression",
            expression: parseExpression(`expression > "123"`),
            fileIdentifier: "filename",
            startIndex: 30,
            endIndex: 47,
          },
        },
      ],
      directives: [],
    });
  },
});

Deno.test({
  name: "directive parsed",
  fn: () => {
    const { processTable, parser } = parse(`on:click`);

    assertEquals(processTable, [
      {
        c: "on:click",
        ret: true,
        valid: true,
      },
    ]);

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [],
      directives: [
        {
          type: "on",
          property: "click",
          modifier: null,
          body: "",
        },
      ],
    });
  },
});

Deno.test({
  name: "directive with body parsed",
  fn: () => {
    const { processTable, parser } = parse(`on:click={doSomething}`);

    assertEquals(processTable, [
      {
        c: "on:click",
        ret: true,
        valid: true,
      },
      {
        c: "={doSomething",
        ret: true,
        valid: false,
      },
      {
        c: "}",
        ret: true,
        valid: true,
      },
    ]);

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [],
      directives: [
        {
          type: "on",
          property: "click",
          modifier: null,
          body: {
            type: "ScriptExpression",
            expression: parseExpression("doSomething"),
            fileIdentifier: "filename",
            startIndex: 10,
            endIndex: 20,
          },
        },
      ],
    });
  },
});

Deno.test({
  name: "directive with body and modifier parsed",
  fn: () => {
    const { processTable, parser } = parse(`on:click.once={doSomething}`);

    assertEquals(processTable, [
      {
        c: "on:click.once",
        ret: true,
        valid: true,
      },
      {
        c: "={doSomething",
        ret: true,
        valid: false,
      },
      {
        c: "}",
        ret: true,
        valid: true,
      },
    ]);

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [],
      directives: [
        {
          type: "on",
          property: "click",
          modifier: "once",
          body: {
            type: "ScriptExpression",
            expression: parseExpression("doSomething"),
            fileIdentifier: "filename",
            startIndex: 15,
            endIndex: 25,
          },
        },
      ],
    });
  },
});

Deno.test({
  name: "large mixture",
  fn: () => {
    const { processTable, parser } = parse(`class="
      something
      something-else
          " on:click={count = count + 1}
      class:change-something={count > 2}`);

    assertEquals(processTable, [
      {
        c: "class",
        ret: true,
        valid: true,
      },
      {
        c: '="\n      something\n      something-else\n          ',
        ret: true,
        valid: false,
      },
      {
        c: '" on:click',
        ret: true,
        valid: true,
      },
      {
        c: "={count = count + 1",
        ret: true,
        valid: false,
      },
      {
        c: "}\n      class:change-something",
        ret: true,
        valid: true,
      },
      {
        c: "={count > 2",
        ret: true,
        valid: false,
      },
      {
        c: "}",
        ret: true,
        valid: true,
      },
    ]);

    assertEquals(parser.getAttributeList(), {
      type: "AttributeList",
      attributes: [
        {
          name: "class",
          body: "\n      something\n      something-else\n          ",
        },
      ],
      directives: [
        {
          type: "on",
          property: "click",
          modifier: null,
          body: {
            type: "ScriptExpression",
            expression: parseExpression("count = count + 1"),
            fileIdentifier: "filename",
            startIndex: 67,
            endIndex: 83,
          },
        },
        {
          type: "class",
          property: "change-something",
          modifier: null,
          body: {
            type: "ScriptExpression",
            expression: parseExpression("count > 2"),
            fileIdentifier: "filename",
            startIndex: 116,
            endIndex: 124,
          },
        },
      ],
    });
  },
});
