/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.io/license
 */

export interface Schema {
	/**
	 * The name of the pipe.
	 */
	name: string;
	/**
	 * The path at which to create the pipe, relative to the workspace root.
	 */
	path?: string; // path
	/**
	 * The name of the project.
	 */
	project?: string;
	/**
	 * When true (the default) creates files at the top level of the project.
	 */
	flat?: boolean;
	/**
	 * Do not create "spec.ts" test files for the new pipe.
	 */
	skipTests?: boolean;
	/**
	 * Do not import this pipe into the owning NgModule.
	 */
	skipImport?: boolean;
	/**
	 * Determine which layer it belongs to.
	 */
	layer?: "features" | "layouts" | "shared";
	/**
	 * The declaring NgModule.
	 */
	module?: string;
	/**
	 * The declaring NgModule name.
	 */
	moduleName?: string;
	/**
	 * The declaring NgModule exports this pipe.
	 */
	export?: boolean;
}
