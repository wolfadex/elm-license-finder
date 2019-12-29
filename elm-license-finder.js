const Table = require("cli-table");
const elmLicenseFinder = require("./index.js");

const dependencies = elmLicenseFinder();
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
