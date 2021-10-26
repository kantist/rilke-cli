/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.io/license
 */

export interface Schema {
	/**
	 * The name of the new directive.
	 */
	name: string;
	/**
	 * The path at which to create the interface that defines the directive, relative to the workspace root.
	 */
	path?: string; // path
	/**
	 * The name of the project.
	 */
	project?: string;
	/**
	 * A prefix to apply to generated selectors.
	 */
	prefix?: /* A prefix to apply to generated selectors. */ string | string /* html-selector */;
	/**
	 * Do not create "spec.ts" test files for the new class.
	 */
	skipTests?: boolean;
	/**
	 * Do not import this directive into the owning NgModule.
	 */
	skipImport?: boolean;
	/**
	 * The HTML selector to use for this directive.
	 */
	selector?: string; // html-selector
	/**
	 * When true (the default), creates the new files at the top level of the current project.
	 */
	flat?: boolean;
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
	 * The declaring NgModule exports this directive.
	 */
	export?: boolean;
}
