/**
 * Angular Guard Options Schema
 * Generates a new, generic route guard definition in the given or default project.
 */
 export interface Schema {
	/**
	 * The name of the new route guard.
	 */
	name: string;
	/**
	 * Do not create "spec.ts" test files for the new guard.
	 */
	skipTests?: boolean;
	/**
	 * When true (the default), creates the new files at the top level of the current project.
	 */
	flat?: boolean;
	/**
	 * The path at which to create the interface that defines the guard, relative to the current workspace.
	 */
	path?: string; // path
	/**
	 * The name of the project.
	 */
	project?: string;
	/**
	 * Specifies which interfaces to implement.
	 */
	implements?: [
		("CanActivate" | "CanActivateChild" | "CanDeactivate" | "CanLoad"),
		...("CanActivate" | "CanActivateChild" | "CanDeactivate" | "CanLoad")[]
	];
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
