const fs = require("fs");
const path = require("path");
const os = require("os");
const semver = require("semver");

const versionRegex = /^\d+\.\d+\.\d+$/;
const operator = {
    '<': semver.lt,
    '<=': semver.lte,
    '>': semver.gt,
    '>=': semver.gt
}

function versionInRange(low, lowComp, mid, highComp, high) {
    const fitsLow = operator[lowComp](low, mid);
    const fitsLow = operator[highComp](mid, high);
    return fitsLow && fitsHigh;
}

function isVersion(maybeVersion) {
  return versionRegex.test(maybeVersion);
}

function versionToParts(version) {
  const [maj, min, pat] = version.split(".");

  return [parseInt(maj, 10), parseInt(min, 10), parseInt(pat, 10)];
}

function buildDependencyTree(directory) {
  let elmHome = process.env.ELM_HOME;

  if (elmHome == null) {
    if (process.platform === "win32") {
      // Windows
      elmHome = path.resolve(os.homedir(), "AppData/Roaming/elm");
    } else {
      // Not Windows
      elmHome = path.resolve(os.homedir(), ".elm");
    }
  }

  const dependencyDict = {};
  let initialElmJson = fs.readFileSync(
    directory == null
      ? path.resolve(process.cwd(), "elm.json")
      : path.resolve(directory, "elm.json"),
  );

  const initialElmJsonContents = JSON.parse(initialElmJson);
  const { dependencies, type } = initialElmJsonContents;
  let elmVersion = initialElmJsonContents["elm-version"];

  if (type === "package") {
    const [
      lowVersion,
      lowCompare,
      v,
      highCompare,
      highVersion,
    ] = elmVersion.split(" ");
    const possibleElmVersions = fs.readdirSync(elmHome);

    elmVersion = highestVersion(
      possibleElmVersions
        .filter(function(fileOrDir) {
          return (
            fileOrDir.isDirectory &&
            isVersion(fileOrDir.name) &&
            versionInRange(
              lowVersion,
              lowCompare,
              fileOrDir.name,
              highCompare,
              highVersion,
            )
          );
        })
        .map(function(dir) {
          return dir.name;
        }),
    );
  }

  const packageHome = path.resolve(elmHome, elmVersion, "packages");

  if (!fs.existsSync(packageHome)) {
    throw new Error(
      `I'm unable to find your package home: ${packageHome}. Try running "elm make" once to install the dependencies.`,
    );
  }

  if (type === "application") {
    const { direct, indirect } = dependencies;

    for (const [package, version] of Object.entries(direct)) {
      const [who, what] = package.split("/");
      const elmJson = fs.readFileSync(
        path.join(packageHome, who, what, version, "elm.json"),
      );
      const { license } = JSON.parse(elmJson);

      dependencyDict[package] = {
        version,
        license,
        type: "direct",
      };
    }

    for (const [package, version] of Object.entries(indirect)) {
      const [who, what] = package.split("/");
      const elmJson = fs.readFileSync(
        path.join(packageHome, who, what, version, "elm.json"),
      );
      const { license } = JSON.parse(elmJson);

      dependencyDict[package] = {
        version,
        license,
        type: "indirect",
      };
    }
  } else if (type === "package") {
    for (const [package, version] of Object.entries(dependencies)) {
      const [who, what] = package.split("/");
      const [
        lowVersion,
        lowCompare,
        v,
        highCompare,
        highVersion,
      ] = version.split(" ");
      const foundPackages = fs.readdirSync(path.join(packageHome, who, what), {
        withFileTypes: true,
      });
      const highestVersionFound = highestVersion(
        foundPackages
          .filter(function(fileOrDir) {
            return (
              fileOrDir.isDirectory &&
              isVersion(fileOrDir.name) &&
              versionInRange(
                lowVersion,
                lowCompare,
                fileOrDir.name,
                highCompare,
                highVersion,
              )
            );
          })
          .map(function(dir) {
            return dir.name;
          }),
      );
      const elmJson = fs.readFileSync(
        path.join(packageHome, who, what, highestVersionFound, "elm.json"),
      );
      const { license } = JSON.parse(elmJson);

      dependencyDict[package] = {
        version: highestVersionFound,
        license,
        type: "direct",
      };
    }
  } else {
    throw new Error(
      `Unknown Elm project type of ${type}. Expected your elm.json to have either "type": "application" or "type": "package".`,
    );
  }

  function highestVersion(possibleVersions) {
    return possibleVersions
      .map(function(version) {
        return versionToParts(version);
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
      })[0]
      .join(".");
  }

  return dependencyDict;
}

module.exports = buildDependencyTree;
