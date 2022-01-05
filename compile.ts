import * as path from "https://deno.land/std@0.119.0/path/mod.ts";
import { parse } from "https://deno.land/std@0.119.0/flags/mod.ts";
import compile from "./src/compiler.ts";

// Check deno version
const [major, minor, patch] = Deno.version.deno.split(".");

if (parseInt(major) < 1 || parseInt(minor) < 17 || parseInt(patch) < 0) {
  console.warn(
    `WARN: Sola requires Deno 1.17.0 or later (found deno ${major}.${minor}.${patch})`
  );
}

if ((await Deno.permissions.query({ name: "hrtime" })).state !== "granted") {
  console.warn(
    `WARN: hrtime permission missing. Time measurements will be incorrect (try the --allow-hrtime flag on compile.ts)`
  );
}

const parsedArgs = parse(Deno.args);

const importMap: { imports: Record<string, string> } = { imports: {} };

const startTime = performance.now();
await Promise.all(
  parsedArgs._.map(async (fileName) => {
    console.info(`Compiling file: ${fileName}`);
    const filePath = path.resolve(fileName.toString())
    importMap.imports[filePath] = await compile(filePath);
  })
);
const completeTime = performance.now();

if (parsedArgs["import-map"]) {
  console.info(`Writing import map to ${parsedArgs["import-map"]}`);
  Deno.writeTextFile(parsedArgs["import-map"], JSON.stringify(importMap, null, 2));
}


console.info(
  `Compiled ${Deno.args.length} files in ${
    (completeTime - startTime).toFixed(2)
  } milliseconds`
);
