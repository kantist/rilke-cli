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
import {
	addFeatureRouteForLayout,
	addImportToModule,
	addRedirectRouteDeclarationToModule,
	addRouteDeclarationToModule,
	insertImport,
	isImported,
} from '../utility/ast-utils';
import { InsertChange, applyToUpdateRecorder } from '../utility/change';
import { buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { buildDefaultPath, createDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as LayoutOptions } from './schema';

function buildRelativeModulePath(options: LayoutOptions, modulePath: string): string {
	const importModulePath = normalize(
		`/${options.path}/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			'.layout'
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

function addImportPackageToModule(host: Tree, modulePath: string, importModule: string, importPath: string) {
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

function addDeclarationToNgModule(options: LayoutOptions): Rule {
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
		const changes = addImportToModule(source, modulePath, strings.classify(`${options.name}Layout`), relativePath);

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
	options: LayoutOptions,
	routingModulePath: Path | undefined,
	featuresRoutePath: Path | undefined
): Rule {
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
		const classifiedRoute = strings.camelize(options.name as string) + 'Routes';
		const classifiedComponent = strings.classify(options.name as string) + 'Component';

		const relativePath = buildRelativePath(path, featuresRoutePath as string).replace('.ts', '');
		const componentRelativePath = buildRelativePath(path, getLayoutComponentPath(options)).replace('.ts', '');

		// Add import page to route
		host = addImportPackageToModule(host, path, classifiedRoute, relativePath);

		// Add import component to route
		host = addImportPackageToModule(host, path, classifiedComponent, componentRelativePath);

		// If has not any routes
		const addRedirectDeclaration = addRedirectRouteDeclarationToModule(
			readIntoSourceFile(host, path),
			path,
			classifiedLayoutRoute,
			buildRoute(options)
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

function addFeaturesRouteDeclaration(options: LayoutOptions, featuresRoutePath: Path | undefined): Rule {
	return (host: Tree) => {
		if (!options.route) {
			return host;
		}
		if (!options.module) {
			throw new Error('Module option required when creating a lazy loaded routing module.');
		}

		let path: string;
		if (featuresRoutePath) {
			path = featuresRoutePath;
		} else {
			path = options.module;
		}

		const text = host.read(path);
		if (!text) {
			throw new Error(`Couldn't find the module nor its routing module.`);
		}

		const classifiedRoute = strings.camelize(options.name as string) + 'Routes';

		// add layout route to features route
		const constant = `\n\nexport const ${classifiedRoute}: Routes = [];`;
		const addFeatures = addFeatureRouteForLayout(
			readIntoSourceFile(host, featuresRoutePath as string),
			featuresRoutePath as string,
			constant
		) as InsertChange;

		if (addFeatures) {
			const featuresRecorder = host.beginUpdate(featuresRoutePath as string);
			featuresRecorder.insertLeft(addFeatures.pos, addFeatures.toAdd);
			host.commitUpdate(featuresRecorder);
		}

		return host;
	};
}

function getRoutingModulePath(host: Tree, modulePath: string): Path | undefined {
	const routingModulePath = modulePath + '/app-routing.module.ts';

	return host.exists(routingModulePath) ? normalize(routingModulePath) : undefined;
}

function getFeatureRoutePath(host: Tree, projectPath: string) {
	const featuresRoutePath = projectPath + '/features/features.route.ts';

	return host.exists(featuresRoutePath) ? normalize(featuresRoutePath) : undefined;
}

function getLayoutComponentPath(options: LayoutOptions) {
	const componentPath = `${options.path}/${strings.dasherize(options.name)}/components/${strings.dasherize(
		options.name
	)}/${strings.dasherize(options.name)}.component.ts`;

	return normalize(componentPath);
}

function buildPath(options: LayoutOptions) {
	const path = normalize(`${options.path}/layouts/`);

	return path;
}

function buildRoute(options: LayoutOptions) {
	const moduleName = `${strings.camelize(options.name)}Routes`;
	const componentName = `${strings.classify(options.name)}Component`;

	return `{ path: '${options.route}', component: ${componentName}, children: ${moduleName} }`;
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

		const featuresRoutePath: Path | undefined = getFeatureRoutePath(host, options.path);

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
			subscriptionManagement: true,
			parent: true
		};

		return chain([
			addDeclarationToNgModule(options),
			addRouteDeclarationToNgModule(options, routingModulePath, featuresRoutePath),
			addFeaturesRouteDeclaration(options, featuresRoutePath),
			mergeWith(templateSource),
			schematic('component', {
				...componentOptions,
			}),
		]);
	};
}
