function XhrPromiseReduxProxy () {
	const xhrPromiseRedux = snapshotResult.customRequire(
		'xhr-promise-redux/dist/index.js'
	);
	const _post = xhrPromiseRedux.post;
	xhrPromiseRedux.post = async function () {
		const res = await _post.apply(this, arguments);
		if (url.match(/^\w+:\/\/.*api\.gitkraken\.com\/phone-home/)) {
			Object.assign(res.body, {
				availableTrialDays: null,
				code: 0,
				features: [],
				individualAccessState: null,
				licenseExpiresAt: 0xFFFFFFFFFFFF,
				licensedFeatures: ['pro'],
				proAccessState: null,
			});
		}
		return res;
	};
}

function PatchSnapshot() {
	const edmLiteD = snapshotResult.customRequire('@axosoft/edm-lite-d/src/d.js');
	snapshotResult.customRequire.cache['@axosoft/edm-lite-d/src/d.js'] = {
		exports: function() {
			let response = JSON.parse(edmLiteD(...arguments).toString());
			if ('licenseExpiresAt' in response || 'licensedFeatures' in response) {
				Object.assign(response, {
					availableTrialDays: null,
					licenseExpiresAt: 0xFFFFFFFFFFFF,
					licensedFeatures: ['pro']
				});
			}
			return Buffer.from(JSON.stringify(response));
		}
	};
}

try {
	XhrPromiseReduxProxy()
} catch (ex) {
	//
}

try {
	PatchSnapshot()
} catch (ex) {
	//
}
