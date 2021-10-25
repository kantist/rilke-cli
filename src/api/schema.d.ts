/**
 * Rilke Service Options Schema
 * Creates a new, generic service definition in the given or default project.
 */
 export interface Schema {
	/**
	 * The name of the service.
	 */
	name: string;
	/**
	 * The path at which to create the service, relative to the workspace root.
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
	 * Do not create "spec.ts" test files for the new service.
	 */
	skipTests?: boolean;
	/**
	 * Determine provideIn option.
	 */
	provideIn?: boolean;
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
