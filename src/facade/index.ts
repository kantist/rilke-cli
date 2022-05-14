/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { normalize , strings } from '@angular-devkit/core';
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
import { addProviderToModule, insertImport } from '../utility/ast-utils';
import { InsertChange, applyToUpdateRecorder } from '../utility/change';
import { buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as FacadeOptions } from './schema';

function getTsSourceFile(host: Tree, path: string): ts.SourceFile {
	const buffer = host.read(path);
	if (!buffer) {
		throw new SchematicsException(`Could not read file (${path}).`);
	}
	const content = buffer.toString();
	const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

	return source;
}

function addProviderToNgModule(options: FacadeOptions): Rule {
	return (host: Tree) => {
		if (options.skipProvide || !options.module) {
			return host;
		}

		const modulePath = options.module;
		const facadePath =
			`/${options.path}/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			'.facade';
		const relativePath = buildRelativePath(modulePath, facadePath);
		const classifiedName = strings.classify(`${options.name}Facade`);

		// Add provider to module
		let moduleSource = getTsSourceFile(host, modulePath);
		const providerChanges = addProviderToModule(
			moduleSource,
			modulePath,
			classifiedName,
			null,
		);
		const providerRecorder = host.beginUpdate(modulePath);
		for (const change of providerChanges) {
			if (change instanceof InsertChange) {
				providerRecorder.insertLeft(change.pos, change.toAdd);
			}
		}
		host.commitUpdate(providerRecorder);

		// Add import
		moduleSource = getTsSourceFile(host, modulePath);
		const importChange = insertImport(moduleSource, modulePath, classifiedName, relativePath);
		if (importChange) {
			const recorder = host.beginUpdate(modulePath);
			applyToUpdateRecorder(recorder, [importChange]);
			host.commitUpdate(recorder);
		}

		return host;
	};
}

function buildPath(options: FacadeOptions) {
	const modulePath = normalize(dasherize(`${options.moduleName}`));

	let path;
	if (options.layer == modulePath) {
		path = normalize(`${options.path}/${modulePath}/facades/`);
	} else {
		path = normalize(`${options.path}/${options.layer}/${modulePath}/facades/`);
	}

	return path;
}

export default function (options: FacadeOptions): Rule {
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
		options.path = buildPath(options); // src/app/{layer}/{modules}/facades/

		const parsedPath = parseName(options.path, options.name);
		options.name = parsedPath.name;
		options.path = parsedPath.path;

		const templateSource = apply(url('./files'), [
			options.skipTests ? filter((path) => !path.endsWith('.spec.ts.template')) : noop(),
			applyTemplates({
				...strings,
				'if-flat': (s: string) => (options.flat ? '' : s),
				...options,
			}),
			move(parsedPath.path),
		]);

		return chain([addProviderToNgModule(options), mergeWith(templateSource)]);
	};
}
