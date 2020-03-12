"use strict";
process.on("unhandledRejection", (reason) => {
	console.error(reason);
	if (!process.exitCode) {
		process.exitCode = 1;
	}
});
