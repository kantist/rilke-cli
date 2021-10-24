/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { strings } from '@angular-devkit/core';
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
import { normalize } from '@angular-devkit/core';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addDeclarationToModule, addExportToModule } from '../utility/ast-utils';
import { InsertChange } from '../utility/change';
import { buildRelativePath, findModuleFromOptions } from '../utility/find-module';
import { parseName } from '../utility/parse-name';
import { validateHtmlSelector, validateName } from '../utility/validation';
import { buildDefaultPath, getWorkspace } from '../utility/workspace';
import { Schema as DirectiveOptions } from './schema';
import { dasherize } from '@angular-devkit/core/src/utils/strings';

function addDeclarationToNgModule(options: DirectiveOptions): Rule {
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

		const directivePath =
			`/${options.path}/` +
			(options.flat ? '' : strings.dasherize(options.name) + '/') +
			strings.dasherize(options.name) +
			'.directive';
		const relativePath = buildRelativePath(modulePath, directivePath);
		const classifiedName = strings.classify(`${options.name}Directive`);
		const declarationChanges = addDeclarationToModule(
			source,
			modulePath,
			classifiedName,
			relativePath,
		);
		const declarationRecorder = host.beginUpdate(modulePath);
		for (const change of declarationChanges) {
			if (change instanceof InsertChange) {
				declarationRecorder.insertLeft(change.pos, change.toAdd);
			}
		}
		host.commitUpdate(declarationRecorder);

		if (options.export) {
			// Need to refresh the AST because we overwrote the file in the host.
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
				strings.classify(`${options.name}Directive`),
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

function buildSelector(options: DirectiveOptions, projectPrefix: string) {
	let selector = options.name;
	if (options.prefix) {
		selector = `${options.prefix}-${selector}`;
	} else if (options.prefix === undefined && projectPrefix) {
		selector = `${projectPrefix}-${selector}`;
	}

	return strings.camelize(selector);
}

function buildPath(options: DirectiveOptions) {
	const modulePath = normalize(dasherize(`${options.moduleName}`));

	let path;
	if (options.layer == modulePath) {
		path = normalize(`${options.path}/${modulePath}/directives/`);
	} else {
		path = normalize(`${options.path}/${options.layer}/${modulePath}/directives/`);
	}

	return path;
}

export default function (options: DirectiveOptions): Rule {
	return async (host: Tree) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project as string);
		options.moduleName = options.module as string;

		if (!project) {
			throw new SchematicsException(`Project "${options.project}" does not exist.`);
		}

		if (options.path === undefined) {
			options.path = buildDefaultPath(project);
		}

		// Create selector
		options.selector = options.selector || buildSelector(options, project.prefix || '');

		options.path = buildDefaultPath(project); // src/app/
		options.module = findModuleFromOptions(host, options);

		// Remap path
		options.path = buildPath(options); // src/app/{layer}/{modules}/components/

		const parsedPath = parseName(options.path, options.name);
		options.name = parsedPath.name;
		options.path = parsedPath.path;

		validateName(options.name);
		validateHtmlSelector(options.selector);

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
