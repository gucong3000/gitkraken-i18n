"use strict";
const assert = require("assert");
const fs = require("fs-extra");
const path = require("path");
const asar = require("asar");
const os = require("os");

async function findRootPosix (dirs) {
	if (process.platform !== "win32") {
		dirs.unshift.apply(
			dirs,
			(
				await Promise.all(
					process.env.PATH.split(path.delimiter).map(async dir => {
						try {
							return path.dirname(await fs.readlink(path.join(dir, "gitkraken")));
						} catch (ex) {
							//
						}
					})
				)
			).filter(Boolean)
		);
		dirs = Array.from(new Set(dirs));
	}

	const resources = (process.platform === "darwin" ? "R" : "r") + "esources";

	dirs = dirs.map(dir => (
		path.join(dir, resources)
	));

	for (let i = 0; i < dirs.length; i++) {
		try {
			return await getRootInfo(dirs[i]);
		} catch (ex) {
			try {
				return getAsarInfo(dirs[i]);
			} catch (ex) {
				//
			}
		}
	}
}

async function findRootWin32 () {
	const appDataLocal = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData/Local");
	const gitkrakenLocal = path.join(appDataLocal, "gitkraken");
	let items;
	try {
		items = await fs.readdir(gitkrakenLocal);
	} catch (ex) {
		return;
	}

	items = items.filter(item => (
		/^app\b/.test(item)
	));

	if (items.length > 1) {
		const semver = require("semver");
		items = items.sort((...vers) => {
			return semver.lt(...vers.map(ver => ver.replace(/^\D*/, ""))) ? 1 : -1;
		});
	}

	items = items.map(app => (
		path.join(gitkrakenLocal, app)
	));

	return findRootPosix(items);
}

function findRootDarwin () {
	return findRootPosix([
		"/Applications/GitKraken.app/Contents",
	]);
}

function findRootLinux () {
	// https://support.gitkraken.com/how-to-install#centos-6-7-rhel-fedora
	return findRootPosix([
		// Debian & Ubuntu,
		"/usr/share/gitkraken",
		"/usr/share/GitKraken",
		// CentOS 6, 7, RHEL, Fedora
		"/opt/gitkraken",
		"/opt/GitKraken",
	]);
}

const findRootFns = {
	win32: findRootWin32,
	darwin: findRootDarwin,
	linux: findRootLinux,
};

async function findRoot () {
	const findRootFn = findRootFns[process.platform];
	assert.ok(findRootFn, "This platform is not supported!");

	return findRootFn();
}

let rootPromise;

async function getRootInfo (resources) {
	const appRoot = path.join(resources, "app");
	const pkg = await fs.readJson(path.join(appRoot, "package.json"));
	return {
		path: appRoot,
		version: pkg.version
	};
}

function getAsarInfo (resources) {
	const asarFile = path.join(resources, "app.asar");
	return {
		asar: asarFile,
		path: asarFile + ".unpacked",
		version: JSON.parse(asar.extractFile(asarFile, "package.json")).version
	};
}

module.exports = async () => {
	if (!rootPromise) {
		rootPromise = findRoot();
	}
	const originalAsar = await rootPromise;
	assert.ok(originalAsar, "Can not find GitKraken");
	return originalAsar;
};
