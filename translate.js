#!/usr/bin/env node
"use strict";
const got = require("got");
const inGfw = require("in-gfw");
const fs = require("fs-extra");
const path = require("path");
const semver = require("semver");

const getAppRoot = require("./getAppRoot");
let OpenCC;
let opencc;
try {
	OpenCC = require("opencc");
} catch (ex) {
	// console.error(ex);
}
if (OpenCC) {
	opencc = new OpenCC("s2twp.json");
}

const reHTML = /<(\w+)\b[^>]+>.*?<\/\1>/g;
let en;
let ja;
let zhCN;
let zhTW;

const zhSymbolMap = {
	",": ",",
	":": "：",
	"!": "！",
	".": "。",
	"?": "？",
};

try {
} catch (ex) {
	//
}

(async () => {
	const appRoot = await getAppRoot();
	en = await fs.readJson(path.join(appRoot.path, "src/strings.json"));

	const enLocal = await fs.readJson("strings/en-us.json");
	if (/^en-us$/i.test(en.languageOption.value)) {
		if (
			semver.gt(
				appRoot.version,
				enLocal.languageOption.version
			)
		) {
			assignLang(enLocal, en);
			en = enLocal;
			en.languageOption.version = appRoot.version;
		} else {
			assignLang(en, enLocal);
		}
		await writeJson("strings/en-us.json", en);
	} else {
		en = enLocal;
	}

	ja = updateTranslate(
		JSON.parse(
			(
				await got(
					`https://${
						await inGfw.net()
							? "raw.github.cnpmjs.org"
							: "raw.githubusercontent.com"
					}/megos/gitkraken-i18n/master/ja/strings.json`)
			).body
		)
	);
	ja.languageOption = {
		label: "日本語",
		value: "ja",
	};
	await writeJson("strings/ja.json", ja);

	zhCN = updateTranslate(
		await fs.readJson("strings/zh-cn.json"),
		(text, item, key) => {
			const html = en[item][key].match(reHTML);
			if (text === en[item][key] || !/\p{Ideographic}/u.test(text)) {
				if (!(text === "GitKraken" || text === "Chipotle" || /^[A-Z]+$/.test(text) || /^(?:\w+)?(?:\.\w+)+$/.test(text) || /^<%=.*%>$/.test(text))) {
					console.log(text);
				}
				return;
			}
			text = text
				.replace(/(\p{Ideographic}) +([{([\w])/gu, "$1$2")
				.replace(/([\w)}\]]) +(\p{Ideographic})/gu, "$1$2")
				.replace(/你/g, "您")
				.replace(/存储库/g, "储存库")
				.replace(/GitKraken Pro/g, "GitKraken专业版")
				.replace(/[ \t]+$/gm, "")
				.replace(/("|') *(.*?) *\1/g, "“$2”")
				.replace(
					/(\d+)?(\.+)( *)(\w+)?/gm,
					(s, leftContext, dot, spaces, rightContext) => leftContext || dot.length > 1 || (rightContext && !spaces) ? s : "。"
				)
				.replace(
					/([,:!?]+) */ug,
					(s, symbol) => zhSymbolMap[symbol] || s
				);
			if (html) {
				let i = 0;
				text = text.replace(reHTML, () => html[i++]);
			}
			return text;
		}
	);
	zhCN.languageOption = {
		label: "中文(简体)",
		value: "zh-cn",
	};
	await writeJson("strings/zh-cn.json", zhCN);

	// https://bintray.com/package/files/byvoid/opencc/OpenCC
	// d:\Apps\opencc-1.0.1-win64\opencc -i "strings/zh-cn.json" -o "strings/zh-tw.json" -c d:\Apps\opencc-1.0.1-win64\s2twp.json
	zhTW = updateTranslate(
		await fs.readJson("strings/zh-tw.json"),
		(text, item, key) => {
			if (opencc) {
				text = opencc.convert(zhCN[item][key]);
			}
			return text;
		}
	);
	zhTW.languageOption = {
		label: "中文(正體)",
		value: "zh-tw",
	};
	await writeJson("strings/zh-tw.json", zhTW);
})();

function normalizationKeyName (str) {
	return str.replace(/(\w*)(\W+)(\w*)/, "$1$3$2");
}

function writeJson (filePath, content) {
	if (typeof content !== "object" || content instanceof Buffer) {
		content = JSON.parse(content);
	}
	Object.keys(content).forEach(item => {
		const itemMap = {};
		Object.keys(content[item]).sort((a, b) => {
			return normalizationKeyName(a).localeCompare(normalizationKeyName(b));
		}).forEach(key => {
			itemMap[key] = content[item][key];
		});
		content[item] = itemMap;
	});
	return fs.outputJson(
		filePath,
		content,
		{
			spaces: "\t",
		}
	);
}

function assignLang (a, b) {
	Object.keys(b).slice(1).forEach(item => {
		Object.assign(a[item], b[item]);
	});
	return a;
}

function updateTranslate (oldLocal, translate) {
	const newLocal = {
		languageOption: oldLocal.languageOption,
	};

	Object.keys(en).slice(1).forEach(item => {
		newLocal[item] = {};
		Object.keys(en[item]).forEach(key => {
			newLocal[item][key] = oldLocal[item][key] || en[item][key];
			if (!/^en-us$/i.test(newLocal.languageOption.value) && /&\w/.test(key)) {
				const shortcut = `(${RegExp.lastMatch.toLocaleUpperCase()})`;
				newLocal[item][key] = newLocal[item][key].replace(/[（(]&\w+[)）]/g, "").replace(/\.*$/u, s => shortcut + s);
			}
			if (translate) {
				newLocal[item][key] = translate(newLocal[item][key], item, key) || newLocal[item][key];
			}
			if (newLocal[item][key] === en[item][key]) {
				delete newLocal[item][key];
			}
		});
	});
	return newLocal;
}
