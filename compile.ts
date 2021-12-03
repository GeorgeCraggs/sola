import * as path from "https://deno.land/std/path/mod.ts";
import compile from "./src/compiler.ts";

await Promise.all(Deno.args.map((fileName) => compile(path.resolve(fileName))));
