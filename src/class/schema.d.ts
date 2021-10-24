/**
 * Angular Class Options Schema
 * Creates a new, generic class definition in the given or default project.
 */
 export interface Schema {
	/**
	 * The name of the new class.
	 */
	name: string;
	/**
	 * The path at which to create the class, relative to the workspace root.
	 */
	path?: string; // path
	/**
	 * The name of the project.
	 */
	project?: string;
	/**
	 * Do not create "spec.ts" test files for the new class.
	 */
	skipTests?: boolean;
	/**
	 * Adds a developer-defined type to the filename, in the format "name.type.ts".
	 */
	type?: string;
	/**
	 * When true (the default), creates files at the top level of the project.
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
}
