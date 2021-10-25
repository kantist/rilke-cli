/**
 * Rilke Ng New Options Schema
 * Creates a new project by combining the workspace and application schematics.
 */
 export interface Schema {
	/**
	 * The directory name to create the workspace in.
	 */
	directory?: string;
	/**
	 * The name of the new workspace and initial project.
	 */
	name: string; // html-selector
	/**
	 * Do not install dependency packages.
	 */
	skipInstall?: boolean;
	/**
	 * Link the CLI to the global version (internal development only).
	 */
	linkCli?: boolean;
	/**
	 * Do not initialize a git repository.
	 */
	skipGit?: boolean;
	/**
	 * Initial git repository commit information.
	 */
	commit?: /* Initial git repository commit information. */ boolean | {
		name: string;
		email: string; // email
		message?: string;
	};
	/**
	 * The path where new projects will be created, relative to the new workspace root.
	 */
	newProjectRoot?: string;
	/**
	 * Include styles inline in the component TS file. By default, an external styles file is created and referenced in the component TypeScript file.
	 */
	inlineStyle?: boolean;
	/**
	 * Include template inline in the component TS file. By default, an external template file is created and referenced in the component TypeScript file.
	 */
	inlineTemplate?: boolean;
	/**
	 * The view encapsulation strategy to use in the initial project.
	 */
	viewEncapsulation?: "Emulated" | "None" | "ShadowDom";
	/**
	 * The version of the Angular CLI to use.
	 */
	version: string;
	/**
	 * Generate a routing module for the initial project.
	 */
	routing?: boolean;
	/**
	 * The prefix to apply to generated selectors for the initial project.
	 */
	prefix?: string; // html-selector
	/**
	 * The file extension or preprocessor to use for style files.
	 */
	style?: "css" | "scss" | "sass" | "less";
	/**
	 * Do not generate "spec.ts" test files for the new project.
	 */
	skipTests?: boolean;
	/**
	 * Create a new initial application project in the 'src' folder of the new workspace. When false, creates an empty workspace with no initial application. You can then use the generate application command so that all applications are created in the projects folder.
	 */
	createApplication?: boolean;
	/**
	 * Create a workspace without any testing frameworks. (Use for learning purposes only.)
	 */
	minimal?: boolean;
	/**
	 * Creates a workspace with stricter type checking and stricter bundle budgets settings. This setting helps improve maintainability and catch bugs ahead of time. For more information, see https://angular.io/guide/strict-mode
	 */
	strict?: boolean;
	/**
	 * The package manager used to install dependencies.
	 */
	packageManager?: "npm" | "yarn" | "pnpm" | "cnpm";
}
