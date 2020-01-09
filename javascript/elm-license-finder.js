#!/usr/bin/env node

const program = require("commander");
const elmLicenseFinder = require("./index.js");
const packageJson = require("./package.json");

program.storeOptionsAsProperties(false);
program
  .version(packageJson.version)
  .name(packageJson.name)
  .option(
    "--output <format>",
    "Output the dependencies in the specified format. Supported formats: json",
  )
  .option(
    "--dir <path>",
    "The path to the directory containing your elm.json",
  )
  .parse(process.argv);

try {
  const dependencies = elmLicenseFinder(program.opts().dir);

  if (program.opts().output === "json") {
    console.log(JSON.stringify(dependencies));
  } else {
    const Table = require("cli-table");
    const tableAll = new Table({
      head: ["Package", "Version", "License", "Type"],
      colWidths: [40, 12, 25, 10],
    });
    const tableByLicense = new Table({
      head: ["License", "Count"],
      colWidths: [25, 10],
    });
    let totalDirect = 0;
    let totalIndirect = 0;
    let totalByLicense = {};

    Object.entries(dependencies).forEach(function([
      package,
      { version, license, type },
    ]) {
      tableAll.push([package, version, license, type]);

      if (type === "direct") {
        totalDirect++;
      } else if (type === "indirect") {
        totalIndirect++;
      }

      if (totalByLicense[license] == null) {
        totalByLicense[license] = 1;
      } else {
        totalByLicense[license]++;
      }
    });
    Object.entries(totalByLicense).forEach(function([license, count]) {
      tableByLicense.push([license, count]);
    });

    console.log("Dependencies:");
    console.log("Total:", totalDirect + totalIndirect);
    console.log("Direct:", totalDirect);
    console.log("Indirect:", totalIndirect);
    console.log(tableByLicense.toString());
    console.log(tableAll.toString());
  }
} catch (error) {
  if (error.message) {
    if (error.message.startsWith("I'm unable to find your package home")) {
      console.log(error.message);
    } else if (
      error.message.indexOf("no such file") > -1 &&
      error.message.indexOf("/elm.json") > -1
    ) {
      console.log(
        "Unable to locate the 'elm.json' in this directory. Make sure you're pointed at a directory with an elm.json.",
      );
    } else if (error.message.startsWith("Unknown Elm project type")) {
      console.log(error.message);
    } else if (
      error.message.indexOf("Unexpected") > -1 &&
      error.message.indexOf("in JSON") > -1
    ) {
      console.log(
        "The elm.json of your project or a dependency is corrupted.\n",
      );
      throw error;
    } else {
      throw error;
    }
  } else {
    throw error;
  }
}
