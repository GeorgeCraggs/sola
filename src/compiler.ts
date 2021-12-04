import { Md5 } from "https://deno.land/std@0.116.0/hash/md5.ts";
import parseSfc from "./parseSfc.ts";
import { parseState, updateFormState, rewriteState } from "./state.ts";
import parseDirectives from "./parseDirectives.ts";
import build from "./builder.ts";
import compileTemplate from "./templateCompiler/mod.ts";
import * as parse5 from "https://cdn.skypack.dev/parse5?dts";
import * as treeAdapter from "https://cdn.skypack.dev/parse5-htmlparser2-tree-adapter?dts";

export default async function compileBackend(filePath: string) {
  const outputFile = filePath
    .replace(/\/components\//, "/build/")
    .replace(/\.sola\.html/, ".js");

  const uuid = new Md5().update(outputFile).toString();

  const { template, scripts, styles } = await parseSfc(filePath);

  if (scripts.length > 1) {
    throw new Error(`${filePath}: Too many script tags`);
  }

  let script = scripts[0];

  const { state, context } = parseState(script);
  /** @ts-ignore */
  script = rewriteState(script, state, []);

  updateFormState(template, state);

  const directives = parseDirectives(uuid, template);

  const outputText = build(
    compileTemplate(parse5.serialize(template, { treeAdapter }), state, context),
    script,
    state,
    context,
    directives,
    styles.join("\n")
  );

  await Deno.writeTextFile(outputFile, outputText);
}
