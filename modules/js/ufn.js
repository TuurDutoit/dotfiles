const glob = require("glob");
const fs = require("fs");

const [, , root, prefix] = process.argv;
const rootRegex = new RegExp(`^${root}/`);

glob(`${root}/${prefix}/**/*`, { nodir: true }, (err, allFiles) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const files = allFiles
    .filter((file) => !file.match(/\/__(mocks|snapshots)__\//))
    .filter((file) => !file.match(/\.test\.tsx?$/));

  const filesToCheck = files.filter(
    (file) =>
      !file.match(/\.(web|ios|android|practice-web|mobile-campus|teach)\.tsx?$/)
  );

  const imports = filesToCheck
    .map((file) => file.replace(/\.tsx?$/, ""))
    .map((file) => file.replace(/\/index$/, ""))
    .map((file) => file.replace(rootRegex, ""));

  console.log(`Reading ${files.length} files`);

  readFileMap(files).then((fileMap) => {
    const fileEntries = Object.entries(fileMap);

    console.log(`Checking ${imports.length} imports`);

    for (const imp of imports) {
      const snip = `'${imp}'`;
      const isImported = fileEntries.some(([path, content]) =>
        content.includes(snip)
      );
      if (!isImported) {
        console.log(imp);
      }
    }
  });
});

async function readFileMap(files) {
  const fileMap = {};
  for (const file of files) {
    const content = await fs.promises.readFile(file, "utf8");
    fileMap[file] = content;
  }
  return fileMap;
}
