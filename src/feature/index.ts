/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { Path, normalize, strings } from '@angular-devkit/core';
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
import { addImportToModule, addRouteDeclarationToModule, insertImport, isImported } from '../utility/ast-utils';
import { InsertChange, applyToUpdateRecorder } from '../utility/change';
import {
	FEATURE_EXT,
	LAYER_EXT,
	ROUTING_MODULE_EXT,
	buildRelativePath,
	findModuleFromOptions,
} from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { buildDefaultPath, createDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as FeatureOptions } from './schema';

function buildRelativeModulePath(options: FeatureOptions, modulePath: string): string {
	const importModulePath = normalize(
		`/${options.path}/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			'.feature',
	);

	return buildRelativePath(modulePath, importModulePath);
}

function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
	const text = host.read(modulePath);
	if (text === null) {
		throw new SchematicsException(`File ${modulePath} does not exist.`);
	}
	const sourceText = text.toString('utf-8');

	return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}

function addImportPackageToModule(
	host: Tree,
	modulePath: string,
	importModule: string,
	importPath: string,
) {
	const moduleSource = readIntoSourceFile(host, modulePath);
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

function addDeclarationToNgModule(options: FeatureOptions): Rule {
	return (host: Tree) => {
		if (!options.module) {
			return host;
		}

		const modulePath = options.module;

		const text = host.read(modulePath);
		if (text === null) {
			throw new SchematicsException(`File ${modulePath} does not exist.`);
		}
		const sourceText = text.toString();
		const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);

		const relativePath = buildRelativeModulePath(options, modulePath);
		const changes = addImportToModule(
			source,
			modulePath,
			strings.classify(`${options.name}Feature`),
			relativePath,
		);

		const recorder = host.beginUpdate(modulePath);
		for (const change of changes) {
			if (change instanceof InsertChange) {
				recorder.insertLeft(change.pos, change.toAdd);
			}
		}
		host.commitUpdate(recorder);

		return host;
	};
}

function addRouteDeclarationToNgModule(
	options: FeatureOptions,
	routingModulePath: Path | undefined,
): Rule {
	return (host: Tree) => {
		if (!options.routing || !options.route) {
			return host;
		}
		if (!options.module) {
			throw new Error('Module option required when creating a lazy loaded routing module.');
		}

		let path: string;
		if (routingModulePath) {
			path = routingModulePath;
		} else {
			path = options.module;
		}

		const text = host.read(path);
		if (!text) {
			throw new Error(`Couldn't find the module nor its routing module.`);
		}

		const classifiedLayoutRoute = strings.camelize(options.layout as string)+'Routes';
		const classifiedRoute = strings.camelize(options.name as string)+'Routes';

		const importPath = normalize(
			`/${options.path}/` +
				(options.flat ? '' : strings.dasherize(options.name) + '/') +
				strings.dasherize(options.name) + FEATURE_EXT,
		);

		const importRoutePath = importPath.replace(FEATURE_EXT, ROUTING_MODULE_EXT);
		const relativePath = buildRelativePath(path, importRoutePath).replace('.ts', '');

		// Add import page to route
		host = addImportPackageToModule(
			host,
			path,
			classifiedRoute,
			relativePath,
		);

		const addDeclaration = addRouteDeclarationToModule(
			readIntoSourceFile(host, path),
			path,
			classifiedLayoutRoute,
			buildRoute(options),
		) as InsertChange;

		if (addDeclaration) {
			const recorder = host.beginUpdate(path);
			recorder.insertLeft(addDeclaration.pos, addDeclaration.toAdd);
			host.commitUpdate(recorder);
		}

		return host;
	};
}

function getRoutingModulePath(host: Tree, modulePath: string): Path | undefined {
	const routingModulePath = modulePath.endsWith(ROUTING_MODULE_EXT)
		? modulePath
		: modulePath.replace(LAYER_EXT, ROUTING_MODULE_EXT);

	return host.exists(routingModulePath) ? normalize(routingModulePath) : undefined;
}

function buildPath(options: FeatureOptions) {
	const path = normalize(`${options.path}/features/`);

	return path;
}

function buildRoute(options: FeatureOptions) {
	const moduleName = `${strings.camelize(options.name)}Routes`;

	return `{ path: '${options.route}', children: ${moduleName} }`;
}

export default function (options: FeatureOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);
		options.moduleName = options.module as string;

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		if (options.routing && !options.route) {
			options.route = strings.dasherize(options.name);
		}

		if (options.path === undefined) {
			options.path = await createDefaultPath(host, options.project as string);
		}

		options.path = buildDefaultPath(project); // src/app/
		options.module = findModuleFromOptions(host, options);

		// Remap path
		options.path = buildPath(options); // src/app/features/

		let routingModulePath: Path | undefined;
		if (options.routing) {
			routingModulePath = getRoutingModulePath(host, options.module as string);
		}

		const parsedPath = parseName(options.path, options.name);
		options.name = parsedPath.name;
		options.path = parsedPath.path;

		const templateSource = apply(url('./files'), [
			options.routing
				? noop()
				: filter((path) => !path.endsWith('.route.ts.template')),
			applyTemplates({
				...strings,
				'if-flat': (s: string) => (options.flat ? '' : s),
				...options,
			}),
			move(parsedPath.path),
		]);

		return chain([
			addDeclarationToNgModule(options),
			addRouteDeclarationToNgModule(options, routingModulePath),
			mergeWith(templateSource),
		]);
	};
}
