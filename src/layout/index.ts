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
	mergeWith,
	move,
	schematic,
	url,
} from '@angular-devkit/schematics';
import { Schema as ComponentOptions } from '../component/schema';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addRedirectRouteDeclarationToModule, addRouteDeclarationToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { buildDefaultPath, createDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as LayoutOptions } from './schema';

function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
	const text = host.read(modulePath);
	if (text === null) {
		throw new SchematicsException(`File ${modulePath} does not exist.`);
	}
	const sourceText = text.toString('utf-8');

	return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}

function addRouteDeclarationToNgModule(options: LayoutOptions, routingModulePath: Path | undefined): Rule {
	return (host: Tree) => {
		if (!options.route) {
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

		const classifiedLayoutRoute = 'routes';

		// If has not any routes
		const addRedirectDeclaration = addRedirectRouteDeclarationToModule(
			readIntoSourceFile(host, path),
			path,
			classifiedLayoutRoute,
			options.route
		) as InsertChange;

		if (addRedirectDeclaration) {
			const recorder = host.beginUpdate(path);
			recorder.insertLeft(addRedirectDeclaration.pos, addRedirectDeclaration.toAdd);
			host.commitUpdate(recorder);
		}

		const addDeclaration = addRouteDeclarationToModule(
			readIntoSourceFile(host, path),
			path,
			classifiedLayoutRoute,
			buildRoute(options)
		) as InsertChange;

		if (addDeclaration) {
			const recorder = host.beginUpdate(path);
			recorder.insertLeft(addDeclaration.pos, addDeclaration.toAdd);
			host.commitUpdate(recorder);
		}

		return host;
	};
}

function buildRelativeModulePath(options: LayoutOptions): string {
	const importModulePath = normalize(
		`@layouts/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			'.layout'
	);

	return importModulePath;
}

function getRoutingModulePath(host: Tree, modulePath: string): Path | undefined {
	const routingModulePath = modulePath + '/app-routing.module.ts';

	return host.exists(routingModulePath) ? normalize(routingModulePath) : undefined;
}

function buildPath(options: LayoutOptions) {
	const path = normalize(`${options.path}/layouts/`);

	return path;
}

function buildRoute(options: LayoutOptions) {
	const moduleName = `${strings.classify(options.name)}Layout`;

	return `{ path: '${options.route}', loadChildren:() => import('${buildRelativeModulePath(
		options
	)}').then(l => l.${moduleName}) }`;
}

export default function (options: LayoutOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);
		options.moduleName = options.module as string;

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		if (!options.route) {
			options.route = strings.dasherize(options.name);
		}

		if (options.path === undefined) {
			options.path = await createDefaultPath(host, options.project as string);
		}

		options.path = buildDefaultPath(project); // src/app/

		const routingModulePath: Path | undefined = getRoutingModulePath(host, options.path);

		options.module = findModuleFromOptions(host, options);

		// Remap path
		options.path = buildPath(options); // src/app/layouts/

		const parsedPath = parseName(options.path, options.name);
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

		const componentOptions: Partial<ComponentOptions> = {
			name: strings.dasherize(options.name),
			module: strings.dasherize(options.name),
			layer: 'layouts',
			skipSelector: true,
			parent: true,
		};

		const notFoundComponentOptions: Partial<ComponentOptions> = {
			name: 'not-found',
			module: strings.dasherize(options.name),
			layer: 'layouts',
			skipSelector: true,
			parent: true,
		};

		return chain([
			addRouteDeclarationToNgModule(options, routingModulePath),
			mergeWith(templateSource),
			schematic('component', {
				...componentOptions,
			}),
			schematic('component', {
				...notFoundComponentOptions,
			}),
		]);
	};
}
