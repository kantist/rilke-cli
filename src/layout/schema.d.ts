/**
 * Rilke Layout Options Schema
 * Creates a new, generic NgModule definition in the given or default project.
 */
 export interface Schema {
	/**
	 * The name of the NgModule.
	 */
	name: string;
	/**
	 * The path at which to create the NgModule, relative to the workspace root.
	 */
	path?: string; // path
	/**
	 * The name of the project.
	 */
	project?: string;
	/**
	 * The route path for a module. When supplied adds the child route to that routes.
	 */
	route?: string;
	/**
	 * Create the new files at the top level of the current project root.
	 */
	flat?: boolean;
	/**
	 * The new NgModule imports "SharedLayer".
	 */
	sharedLayer?: boolean;
	/**
	 * The declaring NgModule.
	 */
	module?: string;
	/**
	 * The declaring NgModule name.
	 */
	moduleName?: string;
}
