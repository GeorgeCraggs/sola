import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import { estree, parseExpression } from "../acorn.ts";
import Builder from "./estreeBuilder.ts";
import { generate as b } from "./estreeHelper.ts";

Deno.test({
  name: "simple identifier",
  fn: () => {
    const result = new Builder().id("something").build();

    assertEquals(result, {
      type: "Identifier",
      name: "something",
    });
  },
});

Deno.test({
  name: "call function",
  fn: () => {
    const result = new Builder()
      .id("something")
      .call("join", b.str(""))
      .build();

    const expected: estree.CallExpression = {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: {
          type: "Identifier",
          name: "something",
        },
        property: {
          type: "Identifier",
          name: "join",
        },
        computed: true,
        optional: false,
      },
      arguments: [
        {
          type: "Literal",
          value: "",
        },
      ],
      optional: false,
    };

    assertEquals(result, expected);
  },
});

Deno.test({
  name: "call function on function",
  fn: () => {
    const result = new Builder()
      .id("something")
      .call("map", b.arrow([b.id("x")], b.id("x")))
      .call("join", b.str(""))
      .build();

    const expected: estree.CallExpression = {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: {
          type: "CallExpression",
          callee: {
            type: "MemberExpression",
            object: {
              type: "Identifier",
              name: "something",
            },
            property: {
              type: "Identifier",
              name: "map",
            },
            computed: true,
            optional: false,
          },
          arguments: [
            {
              type: "ArrowFunctionExpression",
              expression: true,
              params: [
                {
                  type: "Identifier",
                  name: "x",
                },
              ],
              body: {
                type: "Identifier",
                name: "x",
              },
              generator: false,
              async: false,
            },
          ],
          optional: false,
        },
        property: {
          type: "Identifier",
          name: "join",
        },
        computed: true,
        optional: false,
      },
      arguments: [
        {
          type: "Literal",
          value: "",
        },
      ],
      optional: false,
    };

    assertEquals(result, expected);
  },
});

Deno.test({
  name: "Tmp",
  fn: () => {
    assertEquals("", parseExpression("[identifier]"));
  },
});
