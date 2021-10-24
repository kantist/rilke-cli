/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize, strings } from '@angular-devkit/core';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import {
	Rule,
	SchematicsException,
	Tree,
	apply,
	applyTemplates,
	chain,
	filter,
	mergeWith,
	move,
	noop,
	url,
} from '@angular-devkit/schematics';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addDeclarationToModule, addExportToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { validateName } from '../utility/validation';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as PipeOptions } from './schema';

function addDeclarationToNgModule(options: PipeOptions): Rule {
	return (host: Tree) => {
		if (options.skipImport || !options.module) {
			return host;
		}

		const modulePath = options.module;
		const text = host.read(modulePath);
		if (text === null) {
			throw new SchematicsException(`File ${modulePath} does not exist.`);
		}
		const sourceText = text.toString('utf-8');
		const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

		const pipePath =
			`/${options.path}/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			'.pipe';
		const relativePath = buildRelativePath(modulePath, pipePath);
		const changes = addDeclarationToModule(
			source,
			modulePath,
			strings.classify(`${options.name}Pipe`),
			relativePath,
		);
		const recorder = host.beginUpdate(modulePath);
		for (const change of changes) {
			if (change instanceof InsertChange) {
				recorder.insertLeft(change.pos, change.toAdd);
			}
		}
		host.commitUpdate(recorder);

		if (options.export) {
			const text = host.read(modulePath);
			if (text === null) {
				throw new SchematicsException(`File ${modulePath} does not exist.`);
			}
			const sourceText = text.toString('utf-8');
			const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

			const exportRecorder = host.beginUpdate(modulePath);
			const exportChanges = addExportToModule(
				source,
				modulePath,
				strings.classify(`${options.name}Pipe`),
				relativePath,
			);

			for (const change of exportChanges) {
				if (change instanceof InsertChange) {
					exportRecorder.insertLeft(change.pos, change.toAdd);
				}
			}
			host.commitUpdate(exportRecorder);
		}

		return host;
	};
}

function buildPath(options: PipeOptions) {
	const modulePath = normalize(dasherize(`${options.moduleName}`));

	let path;
	if (options.layer == modulePath) {
		path = normalize(`${options.path}/${modulePath}/pipes/`);
	} else {
		path = normalize(`${options.path}/${options.layer}/${modulePath}/pipes/`);
	}

	return path;
}

export default function (options: PipeOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);
		options.moduleName = options.module as string;

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		options.path = buildDefaultPath(project); // src/app/
		options.module = findModuleFromOptions(host, options);

		// Remap path
		options.path = buildPath(options); // src/app/{layer}/{modules}/pipes/

		const parsedPath = parseName(options.path, options.name);
		options.name = parsedPath.name;
		options.path = parsedPath.path;

		validateName(options.name);

		const templateSource = apply(url('./files'), [
			options.skipTests ? filter((path) => !path.endsWith('.spec.ts.template')) : noop(),
			applyTemplates({
				...strings,
				'if-flat': (s: string) => (options.flat ? '' : s),
				...options,
			}),
			move(parsedPath.path),
		]);

		return chain([addDeclarationToNgModule(options), mergeWith(templateSource)]);
	};
}
