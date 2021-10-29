/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

(async () => {
	/**
	 * Disable Browserslist old data warning as otherwise with every release we'd need to update this dependency
	 * which is cumbersome considering we pin versions and the warning is not user actionable.
	 * `Browserslist: caniuse-lite is outdated. Please run next command `npm update`
	 * See: https://github.com/browserslist/browserslist/blob/819c4337456996d19db6ba953014579329e9c6e1/node.js#L324
	 */
	process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1';

	const disableVersionCheckEnv = process.env['NG_DISABLE_VERSION_CHECK'];
	/**
	 * Disable CLI version mismatch checks and forces usage of the invoked CLI
	 * instead of invoking the local installed version.
	 */
	const disableVersionCheck =
		disableVersionCheckEnv !== undefined &&
		disableVersionCheckEnv !== '0' &&
		disableVersionCheckEnv.toLowerCase() !== 'false';

	if (disableVersionCheck) {
		return (await import('../../node_modules/@angular/cli/lib/cli'))
			.default;
	}

	let cli;
	cli = await import('../../node_modules/@angular/cli/lib/cli');

	if ('default' in cli) {
		cli = cli['default'];
	}

	return cli as any;
})()
	.then((cli) => {
		return cli({
			cliArgs: process.argv.slice(2),
			inputStream: process.stdin,
			outputStream: process.stdout,
		});
	})
	.then((exitCode: number) => {
		process.exit(exitCode);
	})
	.catch((err: Error) => {
		// eslint-disable-next-line  no-console
		console.error('Unknown error: ' + err.toString());
		process.exit(127);
	});
