/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.io/license
 */

import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { normalize } from '@angular-devkit/core';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { generateFromFiles } from '../utility/generate-from-files';
import { Schema as ServiceOptions } from './schema';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';

function buildPath(options: ServiceOptions) {
	const modulePath = normalize(dasherize(`${options.moduleName}`));

	let path;
	if (options.layer == modulePath) {
		path = normalize(`${options.path}/${modulePath}/services/`);
	} else {
		path = normalize(`${options.path}/${options.layer}/${modulePath}/services/`);
	}

	return path;
}

export default function (options: ServiceOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);
		options.moduleName = options.module as string;

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		options.path = buildDefaultPath(project); // src/app/

		// Remap path
		options.path = buildPath(options); // src/app/{layer}/{modules}/services/

		// This schematic uses an older method to implement the flat option
		const flat = options.flat;
		options.flat = true;

		return generateFromFiles(options, {
			'if-flat': (s: string) => (flat ? '' : s),
		});
	};
}
