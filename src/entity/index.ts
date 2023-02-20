/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { normalize, strings } from '@angular-devkit/core';
import {
	Rule,
	SchematicsException,
	Tree,
	apply,
	applyTemplates,
	chain,
	mergeWith,
	move,
	schematic,
	url,
} from '@angular-devkit/schematics';
import { buildDefaultPath, createDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as EntityOptions } from './schema';

function buildPath(options: EntityOptions) {
	const path = normalize(`${options.path}/stores/${options.module}`);

	return path;
}

export default function (options: EntityOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		if (options.path === undefined) {
			options.path = await createDefaultPath(host, options.project as string);
		}

		options.path = buildDefaultPath(project); // src/app/

		// Remap path
		options.path = buildPath(options); // src/app/stores/{store}

		const templateSource = apply(url('./files'), [
			applyTemplates({
				...strings,
				'if-flat': (s: string) => (options.flat ? '' : s),
				...options,
			}),
			move(options.path),
		]);

		return chain([
			mergeWith(templateSource),
			schematic('state', {
				name: options.name,
				layer: 'stores',
				module: options.module,
				ready: options.ready,
			}),
			schematic('model', {
				name: options.name,
				layer: 'stores',
				module: options.module,
				ready: options.ready,
			}),
			schematic('facade', {
				name: options.name,
				layer: 'stores',
				module: options.module,
				ready: options.ready,
			}),
		]);
	};
}
