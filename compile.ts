import * as path from "https://deno.land/std/path/mod.ts";
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

const startTime = performance.now();
await Promise.all(
  Deno.args.map((fileName) => {
    console.info(`Compiling file: ${fileName}`);
    compile(path.resolve(fileName));
  })
);
const completeTime = performance.now();

console.info(
  `Compiled ${Deno.args.length} files in ${
    (completeTime - startTime).toFixed(2)
  } milliseconds`
);
