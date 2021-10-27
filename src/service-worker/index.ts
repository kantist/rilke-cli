/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { join, normalize, tags } from '@angular-devkit/core';
import {
	Rule,
	SchematicContext,
	SchematicsException,
	Tree,
	apply,
	applyTemplates,
	chain,
	mergeWith,
	move,
	url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import * as ts from '../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import {
	addSymbolToNgModuleMetadata,
	getEnvironmentExportName,
	insertImport,
	isImported,
} from '../utility/ast-utils';
import { applyToUpdateRecorder } from '../utility/change';
import { addPackageJsonDependency, getPackageJsonDependency } from '../utility/dependencies';
import { getAppModulePath } from '../utility/ng-ast-utils';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { targetBuildNotFoundError } from '../utility/project-targets';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { BrowserBuilderOptions } from '../utility/workspace-models';
import { Schema as ServiceWorkerOptions } from './schema';

function addDependencies(): Rule {
	return (host: Tree, context: SchematicContext) => {
		const packageName = '@angular/service-worker';
		context.logger.debug(`adding dependency (${packageName})`);
		const coreDep = getPackageJsonDependency(host, '@angular/core');
		if (coreDep === null) {
			throw new SchematicsException('Could not find version.');
		}
		const serviceWorkerDep = {
			...coreDep,
			name: packageName,
		};
		addPackageJsonDependency(host, serviceWorkerDep);

		return host;
	};
}

function updateAppModule(mainPath: string): Rule {
	return (host: Tree, context: SchematicContext) => {
		context.logger.debug('Updating appmodule');

		const modulePath = getAppModulePath(host, mainPath);
		context.logger.debug(`module path: ${modulePath}`);

		// add import
		let moduleSource = getTsSourceFile(host, modulePath);
		let importModule = 'ServiceWorkerModule';
		let importPath = '@angular/service-worker';
		if (!isImported(moduleSource, importModule, importPath)) {
			const change = insertImport(moduleSource, modulePath, importModule, importPath);
			if (change) {
				const recorder = host.beginUpdate(modulePath);
				applyToUpdateRecorder(recorder, [change]);
				host.commitUpdate(recorder);
			}
		}

		// add import for environments
		// import { environment } from '../environments/environment';
		moduleSource = getTsSourceFile(host, modulePath);
		const environmentExportName = getEnvironmentExportName(moduleSource);
		// if environemnt import already exists then use the found one
		// otherwise use the default name
		importModule = environmentExportName || 'environment';
		// TODO: dynamically find environments relative path
		importPath = '../environments/environment';

		if (!environmentExportName) {
			// if environment import was not found then insert the new one
			// with default path and default export name
			const change = insertImport(moduleSource, modulePath, importModule, importPath);
			if (change) {
				const recorder = host.beginUpdate(modulePath);
				applyToUpdateRecorder(recorder, [change]);
				host.commitUpdate(recorder);
			}
		}

		// register SW in app module
		const importText = tags.stripIndent`
			ServiceWorkerModule.register('ngsw-worker.js', {
				enabled: ${importModule}.production,
				// Register the ServiceWorker as soon as the app is stable
				// or after 30 seconds (whichever comes first).
				registrationStrategy: 'registerWhenStable:30000'
			})
		`;
		moduleSource = getTsSourceFile(host, modulePath);
		const metadataChanges = addSymbolToNgModuleMetadata(
			moduleSource,
			modulePath,
			'imports',
			importText,
		);
		if (metadataChanges) {
			const recorder = host.beginUpdate(modulePath);
			applyToUpdateRecorder(recorder, metadataChanges);
			host.commitUpdate(recorder);
		}

		return host;
	};
}

function getTsSourceFile(host: Tree, path: string): ts.SourceFile {
	const buffer = host.read(path);
	if (!buffer) {
		throw new SchematicsException(`Could not read file (${path}).`);
	}
	const content = buffer.toString();
	const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

	return source;
}

export default function (options: ServiceWorkerOptions): Rule {
	return async (host: Tree, context: SchematicContext) => {
		const workspace = await getWorkspace(host);
		const project = workspace.projects.get(options.project);
		if (!project) {
			throw new SchematicsException(`Invalid project name (${options.project})`);
		}
		if (project.extensions.projectType !== 'application') {
			throw new SchematicsException(`Service worker requires a project type of "application".`);
		}
		const buildTarget = project.targets.get('build');
		if (!buildTarget) {
			throw targetBuildNotFoundError();
		}
		const buildOptions = ((buildTarget.options || {}) as unknown) as BrowserBuilderOptions;
		const root = project.root;
		buildOptions.serviceWorker = true;
		buildOptions.ngswConfigPath = join(normalize(root), 'ngsw-config.json');

		let { resourcesOutputPath = '' } = buildOptions;
		if (resourcesOutputPath) {
			resourcesOutputPath = normalize(`/${resourcesOutputPath}`);
		}

		const templateSource = apply(url('./files'), [
			applyTemplates({
				...options,
				resourcesOutputPath,
				relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(project.root),
			}),
			move(project.root),
		]);

		context.addTask(new NodePackageInstallTask());

		return chain([
			mergeWith(templateSource),
			updateWorkspace(workspace),
			addDependencies(),
			updateAppModule(buildOptions.main),
		]);
	};
}
