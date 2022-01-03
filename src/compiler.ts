import { Md5 } from "https://deno.land/std@0.119.0/hash/md5.ts";
import { extractContext, addStateMarkup } from "./state.ts";
import { rewriteState } from "./state.ts";
import processDirectives from "./parseDirectives.ts";
import build from "./builder.ts";
import parse from "./parse/mod.ts";
import compileTemplate from "./compile/mod.ts";

export default async function compileBackend(filePath: string) {
  const outputFile = filePath
    .replace(/\/components\//, "/build/")
    .replace(/\.sola\.html/, ".js");

  const uuid = new Md5().update(outputFile).toString().substring(0, 11);

  const { markup, scripts, styles } = parse(
    filePath,
    await Deno.readTextFile(filePath)
  );

  if (scripts.length > 1) {
    throw new Error(`${filePath}: Too many script tags`);
  }

  let script = scripts[0];

  const scriptContext = extractContext(script);
  script = rewriteState(script, { state: scriptContext.state, defs: {} });
  const directives = processDirectives(markup, uuid);
  directives.forEach((d) => {
    if (d.type === "event") {
      d.expression = rewriteState(d.expression, scriptContext);
    }
  });
  addStateMarkup(markup, directives, scriptContext);

  const outputText = build(
    compileTemplate(markup, scriptContext),
    script,
    scriptContext,
    directives,
    styles.join("\n")
  );

  await Deno.writeTextFile(outputFile, outputText);
}
