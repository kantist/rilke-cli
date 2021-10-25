/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.io/license
 */

import { normalize } from '@angular-devkit/core';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { generateFromFiles } from '../utility/generate-from-files';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as GuardOptions } from './schema';

function buildPath(options: GuardOptions) {
	const modulePath = normalize(dasherize(`${options.moduleName}`));

	let path;
	if (options.layer == modulePath) {
		path = normalize(`${options.path}/${modulePath}/guards/`);
	} else {
		path = normalize(`${options.path}/${options.layer}/${modulePath}/guards/`);
	}

	return path;
}

export default function (options: GuardOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);
		options.moduleName = options.module as string;

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		options.path = buildDefaultPath(project); // src/app/

		// Remap path
		options.path = buildPath(options); // src/app/{layer}/{modules}/guards/

		if (!options.implements) {
			throw new SchematicsException('Option "implements" is required.');
		}
	
		const implementations = options.implements
			.map((implement) => (implement === 'CanDeactivate' ? 'CanDeactivate<unknown>' : implement))
			.join(', ');
		const commonRouterNameImports = ['ActivatedRouteSnapshot', 'RouterStateSnapshot'];
		const routerNamedImports: string[] = [...options.implements, 'UrlTree'];
	
		if (options.implements.includes('CanLoad')) {
			routerNamedImports.push('Route', 'UrlSegment');
	
			if (options.implements.length > 1) {
				routerNamedImports.push(...commonRouterNameImports);
			}
		} else {
			routerNamedImports.push(...commonRouterNameImports);
		}
	
		routerNamedImports.sort();
	
		const implementationImports = routerNamedImports.join(', ');
	
		return generateFromFiles(options, {
			implementations,
			implementationImports,
		});
	};
}
