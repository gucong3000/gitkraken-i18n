"use strict";
module.exports = {
	env: {
		commonjs: true,
		es6: true,
		node: true,
	},
	extends: [
		"standard",
	],
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: "script",
	},
	rules: {
		"comma-dangle": [
			"error",
			{
				arrays: "always-multiline",
				exports: "always-multiline",
				functions: "never",
				imports: "always-multiline",
				objects: "always-multiline",
			},
		],
		indent: [
			"error",
			"tab",
			{
				SwitchCase: 1,
			},
		],
		"no-tabs": [
			"off",
		],
		"no-var": [
			"error",
		],
		"prefer-arrow-callback": [
			"error",
		],
		"prefer-const": [
			"error",
		],
		quotes: [
			"error",
			"double",
		],
		semi: [
			"error",
			"always",
			{
				omitLastInOneLineBlock: false,
			},
		],
		strict: [
			"error",
			"safe",
		],
	},
};
