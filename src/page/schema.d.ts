/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

export interface Schema {
	/**
	 * The path at which to create the page file, relative to the current workspace. Default is a folder with the same name as the page in the project root.
	 */
	path?: string; // path
	/**
	 * The name of the project.
	 */
	project?: string;
	/**
	 * The name of the page.
	 */
	name: string;
	/**
	 * Include styles inline in the page.ts file. Only CSS styles can be included inline. By default, an external styles file is created and referenced in the page.ts file.
	 */
	inlineStyle?: boolean;
	/**
	 * Include template inline in the page.ts file. By default, an external template file is created and referenced in the page.ts file.
	 */
	inlineTemplate?: boolean;
	/**
	 * The view encapsulation strategy to use in the new page.
	 */
	viewEncapsulation?: "Emulated" | "None" | "ShadowDom";
	/**
	 * The change detection strategy to use in the new page.
	 */
	changeDetection?: "Default" | "OnPush";
	/**
	 * The prefix to apply to the generated page selector.
	 */
	prefix?: /* The prefix to apply to the generated page selector. */ string | string /* html-selector */;
	/**
	 * The file extension or preprocessor to use for style files, or 'none' to skip generating the style file.
	 */
	style?: "css" | "scss" | "sass" | "less" | "none";
	/**
	 * Adds a developer-defined type to the filename, in the format "name.type.ts".
	 */
	type?: string;
	/**
	 * Do not create "spec.ts" test files for the new page.
	 */
	skipTests?: boolean;
	/**
	 * Create the new files at the top level of the current project.
	 */
	flat?: boolean;
	/**
	 * Do not import this page into the owning NgModule.
	 */
	skipImport?: boolean;
	/**
	 * The HTML selector to use for this page.
	 */
	selector?: string; // html-selector
	/**
	 * Specifies if the page should have a selector or not.
	 */
	skipSelector?: boolean;
	/**
	 * Determine which layer it belongs to.
	 */
	layer?: "features";
	/**
	 * The declaring NgModule.
	 */
	module?: string;
	/**
	 * The declaring NgModule name.
	 */
	moduleName?: string;
	/**
	 * Determine if you use subscriptions
	 */
	subscriptionManagement?: boolean;
	/**
	 * The declaring NgModule exports this page.
	 */
	export?: boolean;
	/**
	 * The route path for a routes
	 */
	route?: string;
}
