/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { normalize } from '@angular-devkit/core';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { generateFromFiles } from '../utility/generate-from-files';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as ClassOptions } from './schema';

function buildPath(options: ClassOptions) {
	const modulePath = normalize(dasherize(`${options.moduleName}`));

	let path;
	if (options.layer == modulePath) {
		path = normalize(`${options.path}/${modulePath}/classes/`);
	} else {
		path = normalize(`${options.path}/${options.layer}/${modulePath}/classes/`);
	}

	return path;
}

export default function (options: ClassOptions): Rule {
	return async (host: Tree) => {
		options.type = options.type ? `.${options.type}` : 'Class';

		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);
		options.moduleName = options.module as string;

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		options.path = buildDefaultPath(project); // src/app/

		// Remap path
		options.path = buildPath(options); // src/app/{layer}/{modules}/classes/

		// This schematic uses an older method to implement the flat option
		const flat = options.flat;
		options.flat = true;

		return generateFromFiles(options, {
			'if-flat': (s: string) => (flat ? '' : s),
		});
	};
}
