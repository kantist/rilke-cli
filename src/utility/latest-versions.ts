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

	// As Angular CLI works with same minor versions of Angular Framework, a tilde match for the current
	Angular: '~13.1.1',

	Rilke: '~' + require('../../package.json')['version'],

	// Since @angular-devkit/build-angular and @schematics/angular are always
	// published together from the same monorepo, and they are both
	// non-experimental, they will always have the same version.
	DevkitBuildAngular: '~13.1.1',
};
