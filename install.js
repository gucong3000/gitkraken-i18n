#!/usr/bin/env node
"use strict";
const fs = require("fs-extra");
const path = require("path");
const asar = require("asar");

const getAppRoot = require("./getAppRoot");

;(async () => {
	const appRoot = await getAppRoot();

	if (appRoot.asar) {
		const appDir = appRoot.asar.replace(/(?:\.\w+)+$/, "");
		const asarFile = appRoot.asar;
		console.log(`Extracting\t${asarFile} ->, ${appDir}`);
		await asar.extractAll(asarFile, appDir);
	}

	// C:\Users\gucon\AppData\Roaming\.gitkraken\config
	// profileGuid
	// C:\Users\gucon\AppData\Roaming\.gitkraken\profiles\d6e5a8ca26e14325a4275fc33b17e16f\profile
	// ui
	// language

	await copyFile("strings/zh-CN.json", "src/strings.json");
	await copyFile("static/crack.js", "static/crack.js");
	// return
	// await updateFile(
	// 	"static/startMainProcess.js",
	// 	js =>
	// 		/^\s*require("\.\/crack.js");?$/m.test(js)
	// 		? js
	// 		: js.replace(
	// 			/^([\t ]*)snapshotResult\.setGlobals\(.*$/m,
	// 			(s, spaces) => `${s}\n${spaces}require("./crack.js");`
	// 		)
	// );
	await updateFile(
		"static/index.js",
		js => /\brequire\(\s*(["'])\.\/crack(?:\.\w+)?\1\)/m.test(js)
			? js
			: js.replace(
				/^([\t ]*)const Perf/m,
				(s, spaces) => `${spaces}require('./crack');\n${s}`
			)
	);

	// await outputFile("static/clientType.js", "module.exports = 'ENTERPRISE';");
	// await outputFile("static/mode.js", "module.exports = 'production';");
	// await outputFile("static/mode.js", "module.exports = 'development';");

	async function updateFile(filePath, callback) {
		filePath = path.join(appRoot.path, filePath);
		let content;
		try {
			content = await fs.readFile(filePath);
		} catch (ex) {
			return;
		}
		content = callback(content.toString()) || content;
		// console.log(content);
		// return
		return fs.writeFile(filePath, content);
	}

	// function outputFile(filePath, content) {
	// 	return fs.writeFile(path.join(appRoot.path, filePath), content);
	// }
	function copyFile(source, destination) {
		return fs.copyFile(source, path.join(appRoot.path, destination));
	}
})();
