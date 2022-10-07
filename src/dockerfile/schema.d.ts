/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
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
	 * Which build configuration to use for the dockerfile.
	 */
	configuration?: string;
}
