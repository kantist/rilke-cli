/**
 * Angular Web Worker Options Schema
 * Creates a new, generic web worker definition in the given or default project.
 */
 export interface Schema {
    /**
     * The path at which to create the worker file, relative to the current workspace.
     */
    path?: string; // path
    /**
     * The name of the project.
     */
    project: string;
    /**
     * The name of the worker.
     */
    name: string;
    /**
     * Add a worker creation snippet in a sibling file of the same name.
     */
    snippet?: boolean;
}
