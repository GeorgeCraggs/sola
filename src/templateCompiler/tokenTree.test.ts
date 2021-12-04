import { assertEquals, assertThrows } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import tokenTree, { TreeToken } from "./tokenTree.ts";

Deno.test({
  name: "no change when no tree",
  fn: () => {
    const tree = tokenTree([
      {
        type: "plain",
        content: "a",
      },
      {
        type: "script",
        content: "b",
      },
      {
        type: "plain",
        content: "c",
      },
    ]);

    const expected: TreeToken[] = [
      {
        type: "plain",
        content: "a",
      },
      {
        type: "script",
        content: "b",
      },
      {
        type: "plain",
        content: "c",
      },
    ];

    assertEquals(tree, expected);
  },
});

Deno.test({
  name: "simple if",
  fn: () => {
    const tree = tokenTree([
      {
        type: "plain",
        content: "a",
      },
      {
        type: "block",
        content: "if identifier",
      },
      {
        type: "plain",
        content: "b",
      },
      {
        type: "endblock",
        content: "if",
      },
      {
        type: "plain",
        content: "c",
      },
    ]);

    const expected: TreeToken[] = [
      {
        type: "plain",
        content: "a",
      },
      {
        type: "if",
        content: "identifier",
        children: [
          {
            type: "plain",
            content: "b",
          },
        ],
        elseChildren: [],
      },
      {
        type: "plain",
        content: "c",
      },
    ];

    assertEquals(tree, expected);
  },
});

Deno.test({
  name: "simple if-else",
  fn: () => {
    const tree = tokenTree([
      {
        type: "plain",
        content: "a",
      },
      {
        type: "block",
        content: "if identifier",
      },
      {
        type: "plain",
        content: "b",
      },
      {
        type: "block",
        content: "else identifier",
      },
      {
        type: "plain",
        content: "c",
      },
      {
        type: "endblock",
        content: "if",
      },
      {
        type: "plain",
        content: "d",
      },
    ]);

    assertEquals(tree, [
      {
        type: "plain",
        content: "a",
      },
      {
        type: "if",
        content: "identifier",
        children: [
          {
            type: "plain",
            content: "b",
          },
        ],
        elseChildren: [
          {
            type: "plain",
            content: "c",
          },
        ],
      },
      {
        type: "plain",
        content: "d",
      },
    ]);
  },
});

Deno.test({
  name: "top-level else error",
  fn: () => {
    assertThrows(() => tokenTree([
      {
        type: "plain",
        content: "a",
      },
      {
        type: "block",
        content: "else identifier",
      },
      {
        type: "block",
        content: "if identifier",
      },
      {
        type: "plain",
        content: "c",
      },
      {
        type: "endblock",
        content: "if",
      },
      {
        type: "plain",
        content: "d",
      },
    ]), undefined, "Unable to compile template: Invalid tag type 'else'");
  },
});

Deno.test({
  name: "else inside each error",
  fn: () => {
    assertThrows(() => tokenTree([
      {
        type: "plain",
        content: "a",
      },
      {
        type: "block",
        content: "each identifier",
      },
      {
        type: "plain",
        content: "b",
      },
      {
        type: "block",
        content: "else identifier",
      },
      {
        type: "plain",
        content: "c",
      },
      {
        type: "endblock",
        content: "each",
      },
      {
        type: "plain",
        content: "d",
      },
    ]), undefined, "Unable to compile template: Invalid tag type 'else'");
  },
});

Deno.test({
  name: "simple each",
  fn: () => {
    const expected: TreeToken[] = [
      {
        type: "plain",
        content: "a",
      },
      {
        type: "each",
        content: "identifier",
        params: "value, index",
        children: [
          {
            type: "plain",
            content: "b",
          },
          {
            type: "plain",
            content: "c",
          },
        ],
      },
      {
        type: "plain",
        content: "d",
      },
    ];

    const tree = tokenTree([
      {
        type: "plain",
        content: "a",
      },
      {
        type: "block",
        content: "each identifier as value, index",
      },
      {
        type: "plain",
        content: "b",
      },
      {
        type: "plain",
        content: "c",
      },
      {
        type: "endblock",
        content: "each",
      },
      {
        type: "plain",
        content: "d",
      },
    ]);

    assertEquals(tree, expected);
  },
});
