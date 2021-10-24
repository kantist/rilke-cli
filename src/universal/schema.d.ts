/**
 * Angular Universal App Options Schema
 * Pass this schematic to the "run" command to set up server-side rendering for an app.
 */
export interface Schema {
    /**
     * The name of the project.
     */
    project: string;
    /**
     * The app identifier to use for transition.
     */
    appId?: string; // html-selector
    /**
     * The name of the main entry-point file.
     */
    main?: string; // path
    /**
     * The name of the application folder.
     */
    appDir?: string; // path
    /**
     * The name of the root NgModule file.
     */
    rootModuleFileName?: string; // path
    /**
     * The name of the root NgModule class.
     */
    rootModuleClassName?: string;
    /**
     * Do not install packages for dependencies.
     */
    skipInstall?: boolean;
}
