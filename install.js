#!/usr/bin/env node
"use strict";
const fs = require("fs-extra");
const path = require("path");
const asar = require("asar");
const os = require("os");
const osLocale = require("os-locale");
const getAppRoot = require("./getAppRoot");
const download = require("./download");
const sudo = require("./sudo");

let appRoot;

function copyFile (source) {
	return fs.copyFile(source, path.join(appRoot.path, source));
}

async function readLocale (lang) {
	let locale;
	try {
		locale = await fs.readJson(`strings/${lang}.json`);
	} catch (ex) {
		if (/-\w+$/.test(lang)) {
			locale = await readLocale(lang.slice(0, -RegExp.lastMatch.length));
		}
	}
	return locale;
}

async function updateFile (filePath, callback) {
	filePath = path.join(appRoot.path, filePath);
	let content;
	try {
		content = await fs.readFile(filePath);
	} catch (ex) {
		return;
	}
	content = await callback(content.toString());
	if (content) {
		return fs.writeFile(filePath, content);
	}
}

async function patch () {
	if (appRoot.asar) {
		appRoot.path = appRoot.asar.replace(/(?:\.\w+)+$/, "");
		console.log(`Extracting\t${appRoot.asar} -> ${appRoot.path}`);
		asar.extractAll(appRoot.asar, appRoot.path);
	}

	const dataDir = path.join(
		process.platform === "win32"
			? process.env.APPDATA
			: os.homedir(),
		".gitkraken"
	);

	let lang;
	try {
		lang = (
			await fs.readJson(
				path.join(
					dataDir,
					`profiles/${
						(await fs.readJson(
							path.join(dataDir, "config")
						)).profileGuid
					}/profile`
				)
			)
		).ui.language;
	} catch (ex) {
		lang = (await osLocale()).toLowerCase();
	}

	await updateFile("src/strings.json", async en => {
		en = JSON.parse(en);
		const locale = await readLocale(lang);
		if (locale && !/^en(?:-US)$/i.test(locale)) {
			Object.keys(en).slice().forEach(item => {
				Object.assign(en[item], locale[item]);
			});
			return JSON.stringify(en, 0, "\t");
		}
	});

	await updateFile(
		"static/index.js",
		js => /\brequire\(\s*(["'])\.\/crack(?:\.\w+)?\1\)/m.test(js)
			? null
			: js.replace(
				/^([\t ]*)const Perf/m,
				(s, spaces) => `${spaces}require('./crack');\n${s}`
			)
	);
	await copyFile("static/crack.js");
}

async function init () {
	try {
		appRoot = await getAppRoot();
	} catch (ex) {
		console.error(ex);
		await download();
		return init();
	}
}

(async () => {
	await sudo();
	await init();
	await patch();
})();
