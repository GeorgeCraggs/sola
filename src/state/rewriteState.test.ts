import { assertEquals } from "https://deno.land/std@0.119.0/testing/asserts.ts";
import rewriteState from "./rewriteState.ts";
import { acorn } from "../acorn.ts";
import { estree } from "../ast/estree.ts";
import { generate } from "https://deno.land/x/astring@v1.8.1/src/astring.js";

Deno.test({
  name: "substitutes before and after declaration",
  fn: () => {
    let ast = acorn.parse(
      `
      const a = myState + 2;
      let myState = "test";
      const myStateAppended = myState + " and more";
    `,
      { ecmaVersion: 2022, allowAwaitOutsideFunction: true }
    ) as estree.Node;

    ast = rewriteState(ast, ["myState"], () => {
      return {
        type: "Identifier",
        name: "HERE",
      };
    });

    const expected = `const a = HERE + 2;
let myState = "test";
const myStateAppended = HERE + " and more";
`;

    assertEquals(expected, generate(ast));
  },
});

Deno.test({
  name: "handles objects",
  fn: () => {
    let ast = acorn.parse(
      `
      let myState = "test";

      const obj = {
        myState: "123",
      };

      const obj2 = {
        myState,
      };
    `,
      { ecmaVersion: 2022, allowAwaitOutsideFunction: true }
    ) as estree.Node;

    ast = rewriteState(ast, ["myState"], () => {
      return {
        type: "Identifier",
        name: "HERE",
      };
    });

    const expected = `let myState = "test";
const obj = {
  myState: "123"
};
const obj2 = {
  HERE
};
`;

    assertEquals(expected, generate(ast));
  },
});

Deno.test({
  name: "handles object properties",
  fn: () => {
    let ast = acorn.parse(
      `
      let myState = "test";

      const a = myState.substring(0, 2);
      this.myState.call();
    `,
      { ecmaVersion: 2022, allowAwaitOutsideFunction: true }
    ) as estree.Node;

    ast = rewriteState(ast, ["myState"], () => {
      return {
        type: "Identifier",
        name: "HERE",
      };
    });

    const expected = `let myState = "test";
const a = HERE.substring(0, 2);
this.myState.call();
`;

    assertEquals(expected, generate(ast));
  },
});

/*Deno.test({
  name: "scoped masking",
  fn: () => {
    let ast = acorn.parse(
      `
      let myState = "test";

      function test(myState) {
        console.log(myState);
      }
      const a = myState + 2;
    `,
      { ecmaVersion: 2022, allowAwaitOutsideFunction: true }
    ) as estree.Node;

    ast = rewriteState(ast, ["myState"], (n) => {
      return {
        type: "Identifier",
        name: "HERE",
      };
    });
    console.error(JSON.stringify(ast, null, 2));

    const expected = `let myState = "test";
function test(myState) {
  console.log(myState);
}
const a = HERE + 2;
`;

    assertEquals(expected, generate(ast));
  },
});*/
