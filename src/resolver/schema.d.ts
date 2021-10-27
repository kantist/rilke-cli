/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

export interface Schema {
    /**
     * The name of the new resolver.
     */
    name: string;
    /**
     * Do not create "spec.ts" test files for the new resolver.
     */
    skipTests?: boolean;
    /**
     * When true (the default), creates the new files at the top level of the current project.
     */
    flat?: boolean;
    /**
     * The path at which to create the interface that defines the resolver, relative to the current workspace.
     */
    path?: string; // path
    /**
     * The name of the project.
     */
    project?: string;
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
}
