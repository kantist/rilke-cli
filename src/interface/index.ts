/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { normalize } from '@angular-devkit/core';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { generateFromFiles } from '../utility/generate-from-files';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as InterfaceOptions } from './schema';


function buildPath(options: InterfaceOptions) {
	const modulePath = normalize(dasherize(`${options.moduleName}`));

	let path;
	if (options.layer == modulePath) {
		path = normalize(`${options.path}/${modulePath}/interfaces/`);
	} else {
		path = normalize(`${options.path}/${options.layer}/${modulePath}/interfaces/`);
	}

	return path;
}

export default function (options: InterfaceOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);
		options.type = options.type ? `.${options.type}` : '.interface';
		options.moduleName = options.module as string;

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		options.path = buildDefaultPath(project); // src/app/

		// Remap path
		options.path = buildPath(options); // src/app/{layer}/{modules}/interfaces/

		return generateFromFiles(options);
	};
}
