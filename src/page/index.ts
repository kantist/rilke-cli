/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { Path, normalize, strings } from '@angular-devkit/core';
import { dasherize } from '@angular-devkit/core/src/utils/strings';
import {
	FileOperator,
	Rule,
	SchematicsException,
	Tree,
	apply,
	applyTemplates,
	chain,
	filter,
	forEach,
	mergeWith,
	move,
	noop,
	url,
} from '@angular-devkit/schematics';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import {
	addDeclarationToModule,
	addExportToModule,
	addRedirectRouteDeclarationToModule,
	addRouteDeclarationToModule,
	insertImport,
	isImported,
} from '../utility/ast-utils';
import { InsertChange, applyToUpdateRecorder } from '../utility/change';
import { FEATURE_EXT, ROUTING_MODULE_EXT, buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { validateHtmlSelector, validateName } from '../utility/validation';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as PageOptions } from './schema';

function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
	const text = host.read(modulePath);
	if (text === null) {
		throw new SchematicsException(`File ${modulePath} does not exist.`);
	}
	const sourceText = text.toString('utf-8');

	return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}

function getRoutingModulePath(host: Tree, modulePath: string): Path | undefined {
	const routingModulePath = modulePath.endsWith(ROUTING_MODULE_EXT)
		? modulePath
		: modulePath.replace(FEATURE_EXT, ROUTING_MODULE_EXT);

	return host.exists(routingModulePath) ? normalize(routingModulePath) : undefined;
}

function addRouteDeclarationToRoutes(options: PageOptions): Rule {
	return (host: Tree) => {
		if (!options.route) {
			return host;
		}
		if (!options.module) {
			throw new Error('Module option required when creating a lazy loaded routing module.');
		}

		const pagePath =
			`/${options.path}/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			(options.type ? '.' : '') +
			strings.dasherize(options.type);
		const routerPath = getRoutingModulePath(host, options.module) as string;
		const relativePath = buildRelativePath(routerPath, pagePath);

		const classifiedModule = strings.camelize(options.moduleName as string) + 'Routes';
		const routeLiteral = `{ path: '${options.route}', component: ${options.className}, title: '${strings.capitalize(
			options.name
		)}' }`;

		let path: string;
		if (routerPath) {
			path = routerPath;
		} else {
			path = options.module;
		}

		const text = host.read(path);
		if (!text) {
			throw new Error(`Couldn't find the module nor its route.`);
		}

		// If has not any routes
		const addRedirectDeclaration = addRedirectRouteDeclarationToModule(
			readIntoSourceFile(host, path),
			routerPath,
			options.className,
			options.route
		) as InsertChange;

		if (addRedirectDeclaration) {
			const recorder = host.beginUpdate(path);
			recorder.insertLeft(addRedirectDeclaration.pos, addRedirectDeclaration.toAdd);
			host.commitUpdate(recorder);
		}

		// Add import page to route
		host = addImportPackageToModule(host, routerPath, options.className, relativePath);

		const addDeclaration = addRouteDeclarationToModule(
			readIntoSourceFile(host, path),
			path,
			classifiedModule,
			routeLiteral
		) as InsertChange;

		if (addDeclaration) {
			const recorder = host.beginUpdate(path);
			recorder.insertLeft(addDeclaration.pos, addDeclaration.toAdd);
			host.commitUpdate(recorder);
		}

		return host;
	};
}

function addDeclarationToNgModule(options: PageOptions): Rule {
	return (host: Tree) => {
		if (options.skipImport || !options.module) {
			return host;
		}

		const modulePath = options.module;
		const source = readIntoSourceFile(host, modulePath);

		const pagePath =
			`/${options.path}/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			(options.type ? '.' : '') +
			strings.dasherize(options.type);
		const relativePath = buildRelativePath(modulePath, pagePath);
		const declarationChanges = addDeclarationToModule(source, modulePath, options.className, relativePath);

		const declarationRecorder = host.beginUpdate(modulePath);
		for (const change of declarationChanges) {
			if (change instanceof InsertChange) {
				declarationRecorder.insertLeft(change.pos, change.toAdd);
			}
		}
		host.commitUpdate(declarationRecorder);

		if (options.export) {
			// Need to refresh the AST because we overwrote the file in the host.
			const source = readIntoSourceFile(host, modulePath);

			const exportRecorder = host.beginUpdate(modulePath);
			const exportChanges = addExportToModule(
				source,
				modulePath,
				strings.classify(options.name) + strings.classify(options.type),
				relativePath
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

function buildClassName(options: PageOptions) {
	let selector = options.selector;

	if (options.prefix) {
		// remove prefix from selector for class name
		selector = options.selector?.replace(options.prefix + '-', '');
	}

	return strings.classify(selector || options.name) + strings.classify(options.type);
}

function buildSelector(options: PageOptions) {
	let selector = strings.dasherize(options.name as string);
	selector = options.name.replace(/\//g, '-') as string;

	if (options.prefix) {
		selector = `${options.prefix}-${selector}`;
	}

	return selector;
}

function buildPath(options: PageOptions) {
	const modulePath = normalize(dasherize(`${options.moduleName}`));

	let path;
	if (options.layer == modulePath) {
		path = normalize(`${options.path}/${modulePath}/pages/`);
	} else {
		path = normalize(`${options.path}/${options.layer}/${modulePath}/pages/`);
	}

	return path;
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

export default function (options: PageOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);
		options.moduleName = options.module as string;

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		if (!options.prefix && project && project.prefix) {
			options.prefix = project.prefix;
		}

		if (!options.route) {
			options.route = strings.dasherize(options.name);
		}

		// Create selector
		options.selector = options.selector || buildSelector(options);

		options.path = buildDefaultPath(project); // src/app/
		options.module = findModuleFromOptions(host, options);

		// Remap path
		options.path = buildPath(options); // src/app/{layer}/{modules}/pages/

		const parsedPath = parseName(options.path as string, options.name);
		options.name = parsedPath.name;
		options.path = parsedPath.path;

		validateName(options.name);
		validateHtmlSelector(options.selector);

		options.className = buildClassName(options);

		const skipStyleFile = options.inlineStyle || options.style === 'none';
		const templateSource = apply(url('./files'), [
			options.skipTests ? filter((path) => !path.endsWith('.spec.ts.template')) : noop(),
			skipStyleFile ? filter((path) => !path.endsWith('.__style__.template')) : noop(),
			options.inlineTemplate ? filter((path) => !path.endsWith('.html.template')) : noop(),
			applyTemplates({
				...strings,
				'if-flat': (s: string) => (options.flat ? '' : s),
				...options,
			}),
			!options.type
				? forEach(((file) => {
						return file.path.includes('..')
							? {
									content: file.content,
									path: file.path.replace('..', '.'),
							  }
							: file;
				  }) as FileOperator)
				: noop(),
			move(parsedPath.path),
		]);

		return chain([
			addDeclarationToNgModule(options),
			addRouteDeclarationToRoutes(options),
			mergeWith(templateSource),
		]);
	};
}
