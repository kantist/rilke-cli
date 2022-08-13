/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { normalize, strings } from '@angular-devkit/core';
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
import { addDeclarationToModule, addExportToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { validateHtmlSelector, validateName } from '../utility/validation';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as ComponentOptions } from './schema';

function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
	const text = host.read(modulePath);
	if (text === null) {
		throw new SchematicsException(`File ${modulePath} does not exist.`);
	}
	const sourceText = text.toString('utf-8');

	return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}

function addDeclarationToNgModule(options: ComponentOptions): Rule {
	return (host: Tree) => {
		if (options.skipImport || !options.module) {
			return host;
		}

		options.type = options.type != null ? options.type : 'Component';

		const modulePath = options.module;
		const source = readIntoSourceFile(host, modulePath);

		const componentPath =
			`/${options.path}/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			(options.type ? '.' : '') +
			strings.dasherize(options.type);
		const relativePath = buildRelativePath(modulePath, componentPath);
		const classifiedName = strings.classify(options.name) + strings.classify(options.type);
		const declarationChanges = addDeclarationToModule(source, modulePath, classifiedName, relativePath);

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

function buildSelector(options: ComponentOptions, projectPrefix: string) {
	let selector = strings.dasherize(options.name as string);
	selector = options.name.split('/').pop() as string; // remove path
	let pathPrefix = options.name.split('/')[0]; // get first path

	if (options.prefix) {
		selector = `${options.prefix}-${selector}`;
	} else if (options.prefix === undefined && projectPrefix) {
		selector = `${projectPrefix}-${selector}`;
	} else if (pathPrefix !== selector) {
		selector = `${pathPrefix}-${selector}`;
	}

	return selector;
}

function buildPath(options: ComponentOptions) {
	const modulePath = normalize(dasherize(`${options.moduleName}`));

	let path;
	if (options.layer == modulePath) {
		path = normalize(`${options.path}/${modulePath}/components/`);
	} else {
		path = normalize(`${options.path}/${options.layer}/${modulePath}/components/`);
	}

	return path;
}

export default function (options: ComponentOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);
		options.moduleName = options.module as string;

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		// Create selector
		options.selector = options.selector || buildSelector(options, (project && project.prefix) || '');

		options.path = buildDefaultPath(project); // src/app/
		options.module = findModuleFromOptions(host, options);

		// Remap path
		options.path = buildPath(options); // src/app/{layer}/{modules}/components/

		const parsedPath = parseName(options.path as string, options.name);
		options.name = parsedPath.name;
		options.path = parsedPath.path;

		validateName(options.name);
		validateHtmlSelector(options.selector);

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

		return chain([addDeclarationToNgModule(options), mergeWith(templateSource)]);
	};
}
