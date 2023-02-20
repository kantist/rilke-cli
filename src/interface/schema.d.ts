/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

export interface Schema {
	/**
	 * The name of the interface.
	 */
	name: string;
	/**
	 * The path at which to create the interface, relative to the workspace root.
	 */
	path?: string; // path
	/**
	 * The name of the project.
	 */
	project?: string;
	/**
	 * A prefix to apply to generated selectors.
	 */
	prefix?: string;
	/**
	 * Determine which layer it belongs to.
	 */
	layer?: 'features' | 'layouts' | 'shared' | 'stores';
	/**
	 * The declaring NgModule.
	 */
	module?: string;
	/**
	 * The declaring NgModule name.
	 */
	moduleName?: string;
	/**
	 * Adds a developer-defined type to the filename, in the format "name.type.ts".
	 */
	type?: string;
	/**
	 * When true, creates files with ready made code.
	 */
	ready?: boolean;
}
