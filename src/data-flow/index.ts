/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { normalize, strings } from '@angular-devkit/core';
import {
	MergeStrategy,
	Rule,
	SchematicsException,
	Tree,
	apply,
	applyTemplates,
	chain,
	mergeWith,
	move,
	noop,
	schematic,
	url,
} from '@angular-devkit/schematics';
import { getPackageJsonDependency } from '../utility/dependencies';
import { buildDefaultPath, createDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as DataFlowOptions } from './schema';

function buildPath(options: DataFlowOptions) {
	const path = normalize(`${options.path}/stores/${options.module}`);

	return path;
}

export default function (options: DataFlowOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		const rilkeStore = getPackageJsonDependency(host, '@rilke/store');
		if (rilkeStore === null) {
			throw new SchematicsException('You need to install @rilke/store first. Run: ril add @rilke/store');
		}

		if (options.path === undefined) {
			options.path = await createDefaultPath(host, options.project as string);
		}

		options.path = buildDefaultPath(project); // src/app/

		// Remap path
		options.path = buildPath(options); // src/app/stores/{store}

		// Check app-store.module.ts
		const store = host.exists(`${options.path}/${options.module}.store.ts`);

		return chain([
			mergeWith(
				apply(url('./files'), [
					applyTemplates({
						...strings,
						'if-flat': (s: string) => (options.flat ? '' : s),
						...options,
					}),
					move(options.path),
				]),
				MergeStrategy.Overwrite
			),
			store ? noop() : schematic('store', { name: options.module }),
			schematic('entity', {
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
