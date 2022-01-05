import * as path from "https://deno.land/std@0.119.0/path/mod.ts";

// TODO: Use fs.walk
const getComponentFiles = async (
  componentDir: string,
  outputDir: string,
  currentDir?: string
) => {
  const foundFiles: { src: string; dest: string }[] = [];
  componentDir = path.normalize(componentDir);
  outputDir = path.normalize(outputDir);
  currentDir = currentDir ?? componentDir;

  for await (const fileOrFolder of Deno.readDir(currentDir)) {
    if (fileOrFolder.isDirectory) {
      const nestedFiles = await getComponentFiles(
        componentDir,
        outputDir,
        path.join(componentDir, fileOrFolder.name)
      );
      foundFiles.push(...nestedFiles);

      continue;
    }

    if (fileOrFolder.name.endsWith(".sola.html")) {
      const srcFile = path.normalize(path.join(currentDir, fileOrFolder.name));
      foundFiles.push({
        src: srcFile,
        dest: path.join(outputDir, path.relative(componentDir, srcFile)).replace(/\.sola\.html$/, ".js"),
      });
    }
  }

  return foundFiles;
};

export default getComponentFiles;
