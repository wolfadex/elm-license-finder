const fs = require("fs");
const path = require("path");
const os = require("os");

const versionRegex = /^\d+\.\d+\.\d+$/;

function isVersion(maybeVersion) {
	return versionRegex.test(maybeVersion);
}

function versionInRange(low, lowComp, mid, highComp, high) {
	let fitsLow = false;
	let fitsHigh = false;

	if (lowComp === "<") {
		fitsLow = versionLessThan(low, mid);
	} else if (lowComp === "<=") {
		fitsLow = versionLessThanEqual(low, mid);
	}

	if (highComp === "<") {
		fitsHigh = versionLessThan(mid, high);
	} else if (highComp === "<=") {
		fitsHigh = versionLessThanEqual(mid, high);
	}

	return fitsLow && fitsHigh;
}

function versionLessThan(low, high) {
	const [lowMaj, lowMin, lowPat] = versionToParts(low);
	const [highMaj, highMin, highPat] = versionToParts(high);

	if (lowMaj > highMaj) {
		return false;
	}

	if (lowMaj === highMaj && lowMin > highMin) {
		return false;
	}

	if (lowMaj === highMaj && lowMin === highMin && lowPat > highPat) {
		return false;
	}

	if (lowMaj === highMaj && lowMin === highMin && lowPat === highPat) {
		return false;
	}

	return true;
}

function versionLessThanEqual(low, high) {
	const [lowMaj, lowMin, lowPat] = versionToParts(low);
	const [highMaj, highMin, highPat] = versionToParts(high);

	if (lowMaj > highMaj) {
		return false;
	}

	if (lowMaj === highMaj && lowMin > highMin) {
		return false;
	}

	if (lowMaj === highMaj && lowMin === highMin && lowPat > highPat) {
		return false;
	}

	return true;
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
			elmHome = path.resolve(
				os.homedir(),
				"AppData/Roaming/elm/0.19.1/packages",
			);
		} else {
			// Not Windows
			elmHome = path.resolve(os.homedir(), ".elm/0.19.1/packages");
		}
	}
	const dependencyDict = {};
	const initialElmJson = fs.readFileSync(
		directory == null
			? path.resolve(process.cwd(), "elm.json")
			: path.resolve(directory, "elm.json"),
	);
	const { dependencies, type } = JSON.parse(initialElmJson);

	if (type === "application") {
		const { direct, indirect } = dependencies;

		for (const [package, version] of Object.entries(direct)) {
			const [who, what] = package.split("/");
			const elmJson = fs.readFileSync(
				path.join(elmHome, who, what, version, "elm.json"),
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
				path.join(elmHome, who, what, version, "elm.json"),
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
			const foundPackages = fs.readdirSync(path.join(elmHome, who, what), {
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
				path.join(elmHome, who, what, highestVersionFound, "elm.json"),
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
