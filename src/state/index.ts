/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { normalize, strings , tags } from '@angular-devkit/core';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import {
	Rule,
	SchematicsException,
	Tree,
	apply,
	applyTemplates,
	chain,
	mergeWith,
	move,
	url,
} from '@angular-devkit/schematics';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addStateDeclarationToModule, addSymbolToNgModuleMetadata, getStoreModuleDeclaration, insertImport, isImported } from '../utility/ast-utils';
import { applyToUpdateRecorder } from '../utility/change';
import { buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as StateOptions } from './schema';

function getTsSourceFile(host: Tree, path: string): ts.SourceFile {
	const buffer = host.read(path);
	if (!buffer) {
		throw new SchematicsException(`Could not read file (${path}).`);
	}
	const content = buffer.toString();
	const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

	return source;
}

function addConfigurationToNgModule(options: StateOptions): Rule {
	return (host: Tree) => {
		if (!options.module) {
			return host;
		}

		const modulePath = options.module;
		const reducerPath =
			`/${options.path}/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			'.reducer';
		const relativePath = buildRelativePath(modulePath, reducerPath);
		const classifiedName = strings.classify(`${options.name}Reducer`);
		const objectProperty = strings.classify(`${options.name}`) + ': ' + classifiedName;

		// Add import Reducer to module if not exist
		host = addImportPackageToModule(
			host,
			modulePath,
			classifiedName,
			relativePath
		);

		// Add import StoreModule to module if not exist
		host = addImportPackageToModule(
			host,
			modulePath,
			'StoreModule',
			'@ngrx/store'
		);

		const importText = tags.stripIndent`
			StoreModule.forRoot({
				${objectProperty}
			})
		`;
		// Add StoreModule to module imports if not exist
		const moduleSource = getTsSourceFile(host, modulePath);
		if (!getStoreModuleDeclaration(moduleSource)) {
			const importChanges = addSymbolToNgModuleMetadata(
				moduleSource,
				modulePath,
				'imports',
				importText
			);
	
			const importRecorder = host.beginUpdate(modulePath);
			if (importChanges) {
				applyToUpdateRecorder(importRecorder, importChanges);
			}
			host.commitUpdate(importRecorder);
		} else {
			// Add reducer to store module
			host = addReducerStoreModule(host, modulePath, objectProperty);
		}
	
		return host;
	};
}

function addReducerStoreModule(host: Tree, modulePath: string, objectProperty: string) {
	const moduleSource = getTsSourceFile(host, modulePath);

	const recorder = host.beginUpdate(modulePath);
	const metadataChange = addStateDeclarationToModule(
		moduleSource,
		modulePath,
		objectProperty,
	);
	if (metadataChange) {
		applyToUpdateRecorder(recorder, metadataChange);
	}
	host.commitUpdate(recorder);

	return host;
}

function addImportPackageToModule(
	host: Tree,
	modulePath: string,
	importModule: string,
	importPath: string,
) {
	const moduleSource = getTsSourceFile(host, modulePath);
	if (!isImported(moduleSource, importModule, importPath)) {
		const importChange = insertImport(moduleSource, modulePath, importModule, importPath);
		if (importChange) {
			const recorder = host.beginUpdate(modulePath);
			applyToUpdateRecorder(recorder, [importChange]);
			host.commitUpdate(recorder);
		}
	}

	return host;
}

function buildPath(options: StateOptions) {
	const modulePath = normalize(dasherize(`${options.moduleName}`));

	let path;
	if (options.layer == modulePath) {
		path = normalize(`${options.path}/${modulePath}/states/`);
	} else {
		path = normalize(`${options.path}/${options.layer}/${modulePath}/states/`);
	}

	return path;
}

export default function (options: StateOptions): Rule {
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
		options.path = buildPath(options); // src/app/{layer}/{modules}/components/

		const parsedPath = parseName(options.path as string, options.name);
		options.name = parsedPath.name;
		options.path = parsedPath.path;

		const templateSource = apply(url('./files'), [
			applyTemplates({
				...strings,
				'if-flat': (s: string) => (options.flat ? '' : s),
				...options,
			}),
			move(parsedPath.path),
		]);

		return chain([addConfigurationToNgModule(options), mergeWith(templateSource)]);
	};
}
