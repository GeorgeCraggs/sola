import * as path from "https://deno.land/std@0.119.0/path/mod.ts";
import checkVersion from "./cli/checkVersion.ts";
import getComponentFiles from "./cli/getComponentFiles.ts";
import findConfig, { SolaConfig } from "./cli/findConfig.ts";
import compileServerSide from "./src/compiler.ts";

const configDefaults: SolaConfig = {
  entrypoint: "mod.ts",
  componentDir: "components/",
  outputDir: "build",
  importMap: "import_map.json",
};
const config = Object.assign({}, configDefaults, await findConfig());

import yargs from "https://deno.land/x/yargs@v17.3.1-deno/deno.ts";

const createImportMap = async (
  dest: string,
  files: { src: string; dest: string }[]
) => {
  await Deno.writeTextFile(
    dest,
    JSON.stringify({
      imports: Object.fromEntries(
        files.map(({ src, dest }) => [
          path.normalize(src),
          "./" + path.normalize(dest),
        ])
      ),
    })
  );
};

const build = async (paths?: string[]) => {
  const allFiles = await getComponentFiles(
    config.componentDir,
    config.outputDir
  );
  const files = allFiles.filter(
    (a) =>
      typeof paths === "undefined" || paths.indexOf(path.resolve(a.src)) !== -1
  );
  if (files.length === 0) return false;

  const startTime = performance.now();
  await Promise.all(
    files.map(async ({ src, dest }) => {
      console.info(`Compiling file: ${src}`);
      await compileServerSide(src, dest);
    })
  );
  const completeTime = performance.now();

  await createImportMap(config.importMap, allFiles);

  console.info(
    `Compiled ${files.length} files in ${(completeTime - startTime).toFixed(
      2
    )} milliseconds`
  );

  return true;
};

const run = async (entrypoint: string, importMapPath: string) => {
  const resolvedImportMapPath = path.resolve(config.importMap);
  const importMap = JSON.parse(await Deno.readTextFile(resolvedImportMapPath));
  const emitResult = await Deno.emit(
    new URL(path.resolve(entrypoint), import.meta.url),
    {
      bundle: "classic",
      importMap,
      importMapPath: resolvedImportMapPath,
    }
  );
  const blob = new Blob([emitResult.files["deno:///bundle.js"]], {
    type: "application/javascript",
  });
  return new Worker(URL.createObjectURL(blob), {
    type: "module",
    deno: { namespace: true },
  });
};

yargs(Deno.args)
  .command(
    "build",
    "build components",
    () => {},
    async () => {
      await checkVersion();
      await build();
    }
  )
  .command(
    "run",
    "build components then run server",
    () => {},
    async () => {
      await checkVersion();
      await build();

      await run(config.entrypoint, config.importMap);
    }
  )
  .command(
    "watch",
    "watch components",
    () => {},
    async () => {
      await checkVersion();
      await build();

      const watcher = Deno.watchFs([config.componentDir, config.entrypoint]);

      let worker = await run(config.entrypoint, config.importMap);

      let paths: string[] = [];

      setInterval(async () => {
        if (paths.length > 0 && (await build(paths))) {
          console.info(`Re-Starting webserver`);
          worker.terminate();
          worker = await run(config.entrypoint, config.importMap);
        }
        paths = [];
      }, 1000);

      for await (const event of watcher) {
        if (event.kind !== "access") {
          paths.push(...event.paths);
        }
      }
    }
  )
  .strictCommands()
  .demandCommand(1, 1)
  .parse();
