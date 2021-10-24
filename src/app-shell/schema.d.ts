/**
 * Angular AppShell Options Schema
 * Generates an app shell for running a server-side version of an app.
 */
export interface Schema {
    /**
     * The name of the related client app.
     */
    project: string;
    /**
     * Route path used to produce the app shell.
     */
    route?: string;
    /**
     * The app ID to use in withServerTransition().
     */
    appId?: string; // html-selector
    /**
     * The name of the main entry-point file.
     */
    main?: string; // path
    /**
     * The name of the application directory.
     */
    appDir?: string; // path
    /**
     * The name of the root module file
     */
    rootModuleFileName?: string; // path
    /**
     * The name of the root module class.
     */
    rootModuleClassName?: string; // html-selector
}
