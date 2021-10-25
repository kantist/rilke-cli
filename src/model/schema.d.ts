/**
 * Rilke Model Options Schema
 * Creates a new, generic model definition in the given or default project.
 */
 export interface Schema {
	/**
	 * The name of the model.
	 */
	name: string;
	/**
	 * The path at which to create the model, relative to the workspace root.
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
	 * Adds a developer-defined type to the filename, in the format "name.type.ts".
	 */
	type?: string;
}
