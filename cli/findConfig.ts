import * as path from "https://deno.land/std@0.119.0/path/mod.ts";

export type SolaConfig = {
  componentDir: string,
  outputDir: string,
  entrypoint: string,
  importMap: string,
};

const findConfig = async (): Promise<Partial<SolaConfig>> => {
  for await (const fileOrFolder of Deno.readDir(Deno.cwd())) {
    if (fileOrFolder.isFile && path.basename(fileOrFolder.name) === "sola.config.ts") {
      return (await import(path.resolve(fileOrFolder.name))).default;
    }
  }

  Deno.chdir(path.resolve(".."));

  return await findConfig();
};

export default findConfig;
