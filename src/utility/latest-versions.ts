/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

export const latestVersions: Record<string, string> & {
	Angular: string;
	DevkitBuildAngular: string;
	Rilke: string;
} = {
	// We could have used TypeScripts' `resolveJsonModule` to make the `latestVersion` object typesafe,
	// but ts_library doesn't support JSON inputs.
	...require('./latest-versions/package.json')['dependencies'],

	Rilke: '' + require('../../package.json')['version'],
};
