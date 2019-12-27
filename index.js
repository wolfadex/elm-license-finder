const fs = require("fs");
const path = require("path");
const os = require("os");

const elmHome = process.env.ELM_HOME || path.resolve(os.homedir(), ".elm/0.19.1/packages");
const dependencyDict = {};
const dependenciesToGet = {};
const initialElmJson = fs.readFileSync(path.resolve(process.cwd(), "elm.json"));
const { dependencies } = JSON.parse(initialElmJson);
const { direct, indirect } = dependencies;

Object.entries(direct).forEach(function([package, version]) {
  dependenciesToGet[package] = version;
});
Object.entries(indirect).forEach(function([package, version]) {
  dependenciesToGet[package] = version;
});

let maxRuns = 10
let runs = 0
while (Object.keys(dependenciesToGet).length > 0 && runs < maxRuns) {
	const [ package, version ] = Object.entries(dependenciesToGet)[0];
	const [ who, what ] = package.split("/");
	const { license, dependencies, actualVersion } = getLicense(who, what, version);

	if (dependencyDict[`${package}/${actualVersion}`] == null) {
	  dependencyDict[`${package}/${actualVersion}`] = license;
	  delete dependenciesToGet[package];
	} else {
	Object
	  Object.entries(dependencies).forEach(function([pack, ver]) {
	    dependenciesToGet[pack] = ver;
	  });
	}
	// runs++;
}


function getLicense(who, what, version) {
  let elmJson;
  let actualVersion;

  if (isVersion(version)) {
  	// Exact version
  	elmJson = fs.readFileSync(path.join(elmHome, who, what, version, "elm.json"));
  	actualVersion = version;
  } else {
  	// Between 2 versions
  	const possibleVersions = fs.readdirSync(path.join(elmHome, who, what), { withFileTypes: true });
  	const highestVersion = possibleVersions
  	  .filter(function(fileOrDir) {
	  	return fileOrDir.isDirectory && isVersion(fileOrDir.name);
	  })
	  .map(function(dir) {
	  	return dir.name;
	  });
	elmJson = fs.readFileSync(path.join(elmHome, who, what, highestVersion, "elm.json"));
	actualVersion = highestVersion;
  }

  const { license, dependencies } = JSON.parse(elmJson);

  return { license, dependencies, actualVersion };
}

function isVersion(str) {
  return /^\d+\.\d+\.\d+$/.test(str);
}

function highestVersion(possibleVersions) {
  return possibleVersions
	.map(function(version) {
	  return version.split(".");
	})
	.sort(function([majA, minA, patA], [majB, minB, patB]) {
	  if (majA > majB) {
	  	return 1;
	  } else if (majA < majB) {
	  	return -1;
	  } else if (minA > minB) {
	  	return 1;
	  } else if (minA < minB) {
	  	return -1;
	  } else if (patA > patB) {
	  	return 1;
	  } else if (patA < patB) {
	  	return -1;
	  } else {
	  	return 0;
	  }
	})[0];
}

console.log("Dependencies:");
Object.entries(dependencyDict).forEach(function([pack, license]) {
  const [ who, what, version ] = pack.split("/");
  const packageName = `${who}/${what}`;
  let isDirect = false;

  if (direct[packageName] === version) {
  	isDirect = true;
  }

  console.log(isDirect ? "Direct" : "Indirect", packageName, version, license);
})