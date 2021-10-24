/**
 * Angular e2e Application Options Schema
 * Generates a new, generic end-to-end test definition for the given or default project.
 */
 export interface Schema {
    /**
     * The HTML selector for the root component of the test app.
     */
    rootSelector?: string;
    /**
     * The name of the app being tested.
     */
    relatedAppName: string;
}
