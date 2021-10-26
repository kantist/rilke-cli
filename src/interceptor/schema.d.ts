/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.io/license
 */

export interface Schema {
	/**
	 * The name of the interceptor.
	 */
	name: string;
	/**
	 * The path at which to create the interceptor, relative to the workspace root.
	 */
	path?: string; // path
	/**
	 * The name of the project.
	 */
	project?: string;
	/**
	 * When true (the default), creates files at the top level of the project.
	 */
	flat?: boolean;
	/**
	 * Determine which layer it belongs to.
	 */
	layer?: "features" | "layouts" | "shared" | "core";
	/**
	 * The declaring NgModule.
	 */
	module?: string;
	/**
	 * The declaring NgModule name.
	 */
	moduleName?: string;
	/**
	 * Do not create "spec.ts" test files for the new interceptor.
	 */
	skipTests?: boolean;
	/**
	 * Do not provide this interceptor into the owning NgModule.
	 */
	skipProvide?: boolean;
}
