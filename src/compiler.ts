import { Md5 } from "https://deno.land/std@0.119.0/hash/md5.ts";
import { parseState, updateFormState, rewriteState } from "./state.ts";
import parseDirectives from "./parseDirectives.ts";
import build from "./builder.ts";
import parse from "./parse/mod.ts";
import compileTemplate from "./compile/mod.ts";

export default async function compileBackend(filePath: string) {
  const outputFile = filePath
    .replace(/\/components\//, "/build/")
    .replace(/\.sola\.html/, ".js");

  const uuid = new Md5().update(outputFile).toString().substring(0, 11);

  const { template, scripts, styles } = parse(filePath, await Deno.readTextFile(filePath));

  if (scripts.length > 1) {
    throw new Error(`${filePath}: Too many script tags`);
  }

  let script = scripts[0];

  const { state, context } = parseState(script);
  script = rewriteState(script, state, []);

  updateFormState(template, state);

  const directives = parseDirectives(uuid, template);

  const outputText = build(
    compileTemplate(template, state, context),
    script,
    state,
    context,
    directives,
    styles.join("\n")
  );

  await Deno.writeTextFile(outputFile, outputText);
}
