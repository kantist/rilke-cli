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
import { addRedirectRouteDeclarationToModule, addRouteDeclarationToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import {
	ROUTING_MODULE_EXT,
} from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { buildDefaultPath, createDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as FeatureOptions } from './schema';

function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
	const text = host.read(modulePath);
	if (text === null) {
		throw new SchematicsException(`File ${modulePath} does not exist.`);
	}
	const sourceText = text.toString('utf-8');

	return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}

function addRouteDeclarationToNgModule(
	options: FeatureOptions,
	routingModulePath: Path,
): Rule {
	return (host: Tree) => {
		if (!options.routing || !options.route) {
			return host;
		}

		const path = routingModulePath;

		const text = host.read(path);
		if (!text) {
			throw new Error(`Couldn't find the module nor its routing module.`);
		}

		// If has not any routes
		const addRedirectDeclaration = addRedirectRouteDeclarationToModule(
			readIntoSourceFile(host, path),
			path,
			'children',
			options.route,
		) as InsertChange;

		if (addRedirectDeclaration) {
			const recorder = host.beginUpdate(path);
			recorder.insertLeft(addRedirectDeclaration.pos, addRedirectDeclaration.toAdd);
			host.commitUpdate(recorder);
		}

		const addDeclaration = addRouteDeclarationToModule(
			readIntoSourceFile(host, path),
			path,
			'children',
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

function getRoutingModulePath(host: Tree, options: FeatureOptions): Path | undefined {
	const routingModulePath = `${options.path}/layouts/${strings.dasherize(options.layout as string)}/${strings.dasherize(options.layout as string) + ROUTING_MODULE_EXT}`;

	return host.exists(routingModulePath) ? normalize(routingModulePath) : undefined;
}

function buildPath(options: FeatureOptions) {
	const path = normalize(`${options.path}/features/`);

	return path;
}

function buildRelativeModulePath(options: FeatureOptions): string {
	const importModulePath = normalize(
		`@features/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			'.feature'
	);

	return importModulePath;
}

function buildRoute(options: FeatureOptions) {
	const moduleName = `${strings.classify(options.name)}Feature`;

	return `{ path: '${options.route}', loadChildren:() => import('${buildRelativeModulePath(options)}').then(f => f.${moduleName}) }`;
}

export default function (options: FeatureOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);

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

		let routingModulePath: Path | undefined;
		if (options.routing) {
			routingModulePath = getRoutingModulePath(host, options);
		}

		// Remap path
		options.path = buildPath(options); // src/app/features/

		const parsedPath = parseName(options.path, options.name);
		options.name = parsedPath.name;
		options.path = parsedPath.path;

		const templateSource = apply(url('./files'), [
			options.routing
				? noop()
				: filter((path) => !path.endsWith('-routing.module.ts.template')),
			applyTemplates({
				...strings,
				'if-flat': (s: string) => (options.flat ? '' : s),
				...options,
			}),
			move(parsedPath.path),
		]);

		return chain([
			addRouteDeclarationToNgModule(options, routingModulePath as Path),
			mergeWith(templateSource),
		]);
	};
}
