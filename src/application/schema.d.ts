/**
 * Angular Application Options Schema
 * Generates a new basic app definition in the "projects" subfolder of the workspace.
 */
 export interface Schema {
	/**
	 * The root directory of the new app.
	 */
	projectRoot?: string;
	/**
	 * The name of the new app.
	 */
	name: string;
	/**
	 * Include styles inline in the root component.ts file. Only CSS styles can be included inline. Default is false, meaning that an external styles file is created and referenced in the root component.ts file.
	 */
	inlineStyle?: boolean;
	/**
	 * Include template inline in the root component.ts file. Default is false, meaning that an external template file is created and referenced in the root component.ts file.
	 */
	inlineTemplate?: boolean;
	/**
	 * The view encapsulation strategy to use in the new application.
	 */
	viewEncapsulation?: "Emulated" | "None" | "ShadowDom";
	/**
	 * Create a routing NgModule.
	 */
	routing?: boolean;
	/**
	 * A prefix to apply to generated selectors.
	 */
	prefix?: string; // html-selector
	/**
	 * The file extension or preprocessor to use for style files.
	 */
	style?: "css" | "scss" | "sass" | "less";
	/**
	 * Do not create "spec.ts" test files for the application.
	 */
	skipTests?: boolean;
	/**
	 * Do not add dependencies to the "package.json" file.
	 */
	skipPackageJson?: boolean;
	/**
	 * Create a bare-bones project without any testing frameworks. (Use for learning purposes only.)
	 */
	minimal?: boolean;
	/**
	 * Skip installing dependency packages.
	 */
	skipInstall?: boolean;
	/**
	 * Creates an application with stricter bundle budgets settings.
	 */
	strict?: boolean;
}
