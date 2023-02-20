/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

export interface Schema {
	/**
	 * The name of the entity/state.
	 */
	name: string;
	/**
	 * The name of the store.
	 */
	storeName: string;
	/**
	 * The path at which to create the service, relative to the workspace root.
	 */
	path?: string; // path
	/**
	 * The name of the project.
	 */
	project?: string;
	/**
	 * When true (the default), creates files at the top level of the project.
	 */
	flat?: boolean;
	/**
	 * When true, creates files with ready made code.
	 */
	ready?: boolean;
}
