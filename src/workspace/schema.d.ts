/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.io/license
 */

export interface Schema {
    /**
     * The name of the workspace.
     */
    name: string; // html-selector
    /**
     * The path where new projects will be created.
     */
    newProjectRoot?: string;
    /**
     * The version of the Angular CLI to use.
     */
    version: string;
    /**
     * Create a workspace without any testing frameworks. (Use for learning purposes only.)
     */
    minimal?: boolean;
    /**
     * Create a workspace with stricter type checking options. This setting helps improve maintainability and catch bugs ahead of time. For more information, see https://angular.io/strict
     */
    strict?: boolean;
    /**
     * The package manager used to install dependencies.
     */
    packageManager?: "npm" | "yarn" | "pnpm" | "cnpm";
}
