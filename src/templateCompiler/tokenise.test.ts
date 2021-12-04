import { assertEquals } from "https://deno.land/std@0.117.0/testing/asserts.ts";
import tokenise from "./tokenise.ts";

Deno.test({
  name: "empty string gives empty plain token",
  fn: () => {
    const tokens = tokenise("");

    assertEquals(tokens, [
      {
        type: "plain",
        content: "",
      },
    ]);
  },
});

Deno.test({
  name: "basic string makes single token",
  fn: () => {
    const tokens = tokenise("test string");

    assertEquals(tokens, [
      {
        type: "plain",
        content: "test string",
      },
    ]);
  },
});

Deno.test({
  name: "empty script",
  fn: () => {
    const tokens = tokenise("{}");

    assertEquals(tokens, [
      {
        type: "plain",
        content: "",
      },
      {
        type: "script",
        content: "",
      },
      {
        type: "plain",
        content: "",
      },
    ]);
  },
});

Deno.test({
  name: "script containing identifier",
  fn: () => {
    const tokens = tokenise("{thing}");

    assertEquals(tokens, [
      {
        type: "plain",
        content: "",
      },
      {
        type: "script",
        content: "thing",
      },
      {
        type: "plain",
        content: "",
      },
    ]);
  },
});

Deno.test({
  name: "script containing identifier with spaces",
  fn: () => {
    const tokens = tokenise("{ thing }");

    assertEquals(tokens, [
      {
        type: "plain",
        content: "",
      },
      {
        type: "script",
        content: " thing ",
      },
      {
        type: "plain",
        content: "",
      },
    ]);
  },
});

Deno.test({
  name: "script containing expression",
  fn: () => {
    const tokens = tokenise("{thing ? 'a' : 'b'}");

    assertEquals(tokens, [
      {
        type: "plain",
        content: "",
      },
      {
        type: "script",
        content: "thing ? 'a' : 'b'",
      },
      {
        type: "plain",
        content: "",
      },
    ]);
  },
});

Deno.test({
  name: "multiline script",
  fn: () => {
    const tokens = tokenise(`
    lasdfasdf
    asdf {

      asldfll
    } a
    `);

    assertEquals(tokens, [
      {
        type: "plain",
        content: "\n    lasdfasdf\n    asdf ",
      },
      {
        type: "script",
        content: "\n\n      asldfll\n    ",
      },
      {
        type: "plain",
        content: " a\n    ",
      },
    ]);
  },
});

Deno.test({
  name: "mixed script and plain",
  fn: () => {
    const tokens = tokenise("asdfasdf{thing ? 'a' : 'b'} some more text");

    assertEquals(tokens, [
      {
        type: "plain",
        content: "asdfasdf",
      },
      {
        type: "script",
        content: "thing ? 'a' : 'b'",
      },
      {
        type: "plain",
        content: " some more text",
      },
    ]);
  },
});

Deno.test({
  name: "empty block",
  fn: () => {
    const tokens = tokenise("{#}{/}");

    assertEquals(tokens, [
      {
        type: "plain",
        content: "",
      },
      {
        type: "block",
        content: "",
      },
      {
        type: "plain",
        content: "",
      },
      {
        type: "endblock",
        content: "",
      },
      {
        type: "plain",
        content: "",
      },
    ]);
  },
});

Deno.test({
  name: "if block",
  fn: () => {
    const tokens = tokenise(`{#if condition >= "value"}<p>Thing</p>{/if}`);

    assertEquals(tokens, [
      {
        type: "plain",
        content: "",
      },
      {
        type: "block",
        content: `if condition >= "value"`,
      },
      {
        type: "plain",
        content: "<p>Thing</p>",
      },
      {
        type: "endblock",
        content: "if",
      },
      {
        type: "plain",
        content: "",
      },
    ]);
  },
});
