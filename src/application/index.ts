/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { JsonObject, join, normalize, strings } from '@angular-devkit/core';
import {
	MergeStrategy,
	Rule,
	SchematicContext,
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
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Schema as ComponentOptions } from '../component/schema';
import { NodeDependencyType, addPackageJsonDependency } from '../utility/dependencies';
import { latestVersions } from '../utility/latest-versions';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders, ProjectType } from '../utility/workspace-models';
import { Schema as ApplicationOptions } from './schema';

function addDependenciesToPackageJson(options: ApplicationOptions) {
	return (host: Tree, context: SchematicContext) => {
		[
			{
				type: NodeDependencyType.Dev,
				name: '@angular/compiler-cli',
				version: latestVersions['@angular'],
			},
			{
				type: NodeDependencyType.Dev,
				name: '@angular-devkit/build-angular',
				version: latestVersions['@angular'],
			},
			{
				type: NodeDependencyType.Dev,
				name: 'typescript',
				version: latestVersions['typescript'],
			},
		].forEach((dependency) => addPackageJsonDependency(host, dependency));

		if (!options.skipInstall) {
			context.addTask(new NodePackageInstallTask());
		}

		return host;
	};
}

function addAppToWorkspaceFile(options: ApplicationOptions, appDir: string): Rule {
	let projectRoot = appDir;
	if (projectRoot) {
		projectRoot += '/';
	}

	const schematics: JsonObject = {};

	if (options.inlineTemplate || options.inlineStyle || options.minimal || options.style !== 'scss') {
		const componentSchematicsOptions: JsonObject = {};
		if (options.inlineTemplate ?? options.minimal) {
			componentSchematicsOptions.inlineTemplate = true;
		}
		if (options.inlineStyle ?? options.minimal) {
			componentSchematicsOptions.inlineStyle = true;
		}
		if (options.style && options.style !== 'scss') {
			componentSchematicsOptions.style = options.style;
		}

		schematics['@rilke/cli:component'] = componentSchematicsOptions;
	}

	if (options.skipTests || options.minimal) {
		['class', 'component', 'directive', 'guard', 'interceptor', 'pipe', 'service', 'facade', 'state'].forEach(
			(type) => {
				if (!(`@rilke/cli:${type}` in schematics)) {
					schematics[`@rilke/cli:${type}`] = {};
				}
				(schematics[`@rilke/cli:${type}`] as JsonObject).skipTests = true;
			}
		);
	}

	if (options.ready) {
		['facade', 'state', 'model', 'interface'].forEach((type) => {
			if (!(`@rilke/cli:${type}` in schematics)) {
				schematics[`@rilke/cli:${type}`] = {};
			}
			(schematics[`@rilke/cli:${type}`] as JsonObject).ready = true;
		});
	}

	if (options.strict) {
		if (!('@rilke/cli:application' in schematics)) {
			schematics['@rilke/cli:application'] = {};
		}

		(schematics['@rilke/cli:application'] as JsonObject).strict = true;
	}

	const sourceRoot = join(normalize(projectRoot), 'src');
	let budgets = [];
	if (options.strict) {
		budgets = [
			{
				type: 'initial',
				maximumWarning: '2mb',
				maximumError: '5mb',
			},
			{
				type: 'anyComponentStyle',
				maximumWarning: '6kb',
				maximumError: '10kb',
			},
		];
	} else {
		budgets = [
			{
				type: 'initial',
				maximumWarning: '2mb',
				maximumError: '5mb',
			},
			{
				type: 'anyComponentStyle',
				maximumWarning: '6kb',
				maximumError: '10kb',
			},
		];
	}

	const inlineStyleLanguage = options?.style !== 'css' ? options.style : undefined;

	const project = {
		root: normalize(projectRoot),
		sourceRoot,
		projectType: ProjectType.Application,
		prefix: options.prefix || '',
		schematics,
		targets: {
			build: {
				builder: Builders.Browser,
				defaultConfiguration: 'production',
				options: {
					outputPath: `dist/browser`,
					index: `${sourceRoot}/index.html`,
					main: `${sourceRoot}/main.ts`,
					polyfills: `${sourceRoot}/polyfills.ts`,
					tsConfig: `${projectRoot}tsconfig.app.json`,
					inlineStyleLanguage,
					assets: [`${sourceRoot}/assets`, `${sourceRoot}/manifest.webmanifest`],
					styles: [`${sourceRoot}/assets/style/styles.${options.style}`],
					stylePreprocessorOptions: {
						includePaths: ['src/assets/style'],
					},
					scripts: [],
				},
				configurations: {
					production: {
						budgets,
						fileReplacements: [
							{
								replace: `${sourceRoot}/environments/environment.ts`,
								with: `${sourceRoot}/environments/environment.prod.ts`,
							},
						],
						outputHashing: 'all',
					},
					preproduction: {
						budgets,
						fileReplacements: [
							{
								replace: `${sourceRoot}/environments/environment.ts`,
								with: `${sourceRoot}/environments/environment.preprod.ts`,
							},
						],
						outputHashing: 'all',
					},
					development: {
						buildOptimizer: false,
						optimization: false,
						vendorChunk: true,
						extractLicenses: false,
						sourceMap: true,
						namedChunks: true,
					},
				},
			},
			serve: {
				builder: Builders.DevServer,
				defaultConfiguration: 'development',
				options: {},
				configurations: {
					production: {
						browserTarget: `${options.name}:build:production`,
					},
					development: {
						browserTarget: `${options.name}:build:development`,
					},
				},
			},
			'extract-i18n': {
				builder: Builders.ExtractI18n,
				options: {
					browserTarget: `${options.name}:build`,
				},
			},
			test: options.minimal
				? undefined
				: {
						builder: Builders.Karma,
						options: {
							main: `${sourceRoot}/test.ts`,
							polyfills: `${sourceRoot}/polyfills.ts`,
							tsConfig: `${projectRoot}tsconfig.spec.json`,
							karmaConfig: `${projectRoot}karma.conf.js`,
							inlineStyleLanguage,
							assets: [`${sourceRoot}/assets`],
							styles: [`${sourceRoot}/assets/style/styles.${options.style}`],
							stylePreprocessorOptions: {
								includePaths: ['src/assets/style'],
							},
							scripts: [],
						},
				  },
			lint: {
				builder: '@angular-eslint/builder:lint',
				options: {
					lintFilePatterns: ['**/*.ts', '**/*.html'],
				},
			},
			server: {
				builder: Builders.Server,
				options: {
					outputPath: 'dist/server',
					main: `${projectRoot}server.ts`,
					tsConfig: `${projectRoot}tsconfig.server.json`,
					stylePreprocessorOptions: {
						includePaths: ['src/assets/style'],
					},
				},
				configurations: {
					production: {
						outputHashing: 'media',
						fileReplacements: [
							{
								replace: `${sourceRoot}/environments/environment.ts`,
								with: `${sourceRoot}/environments/environment.prod.ts`,
							},
						],
						sourceMap: false,
						optimization: true,
					},
					preproduction: {
						outputHashing: 'media',
						fileReplacements: [
							{
								replace: `${sourceRoot}/environments/environment.ts`,
								with: `${sourceRoot}/environments/environment.preprod.ts`,
							},
						],
						sourceMap: false,
						optimization: true,
					},
				},
			},
		},
	};

	return updateWorkspace((workspace) => {
		if (workspace.projects.size === 0) {
			// workspace.extensions.defaultProject = options.name;
		}

		workspace.projects.add({
			name: options.name,
			...project,
		});
	});
}

function minimalPathFilter(path: string): boolean {
	const toRemoveList = /(test.ts|tsconfig.spec.json|karma.conf.js).template$/;

	return !toRemoveList.test(path);
}

export default function (options: ApplicationOptions): Rule {
	return async (host: Tree) => {
		if (!options.name) {
			throw new SchematicsException(`Invalid options, "name" is required.`);
		}

		const appRootSelector = `${options.prefix}-root`;
		const componentOptions: Partial<ComponentOptions> = !options.minimal
			? {
					inlineStyle: options.inlineStyle,
					inlineTemplate: options.inlineTemplate,
					skipTests: options.skipTests,
					style: options.style,
					viewEncapsulation: options.viewEncapsulation,
			  }
			: {
					inlineStyle: options.inlineStyle ?? true,
					inlineTemplate: options.inlineTemplate ?? true,
					skipTests: true,
					style: options.style,
					viewEncapsulation: options.viewEncapsulation,
			  };

		const workspace = await getWorkspace(host);
		const newProjectRoot = (workspace.extensions.newProjectRoot as string | undefined) || '';
		const isRootApp = options.projectRoot !== undefined;
		const appDir = isRootApp
			? normalize(options.projectRoot || '')
			: join(normalize(newProjectRoot), strings.dasherize(options.name));
		const sourceDir = `${appDir}/src/app`;

		return chain([
			addAppToWorkspaceFile(options, appDir),
			mergeWith(
				apply(url('./files'), [
					options.minimal ? filter(minimalPathFilter) : noop(),
					applyTemplates({
						utils: strings,
						...options,
						relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(appDir),
						appName: options.name,
						isRootApp,
					}),
					move(appDir),
				]),
				MergeStrategy.Overwrite
			),
			mergeWith(
				apply(url('./other-files'), [
					options.strict ? noop() : filter((path) => path !== '/package.json.template'),
					componentOptions.inlineTemplate ? filter((path) => !path.endsWith('.html.template')) : noop(),
					componentOptions.skipTests ? filter((path) => !path.endsWith('.spec.ts.template')) : noop(),
					applyTemplates({
						utils: strings,
						...options,
						selector: appRootSelector,
						...componentOptions,
					}),
					move(sourceDir),
				]),
				MergeStrategy.Overwrite
			),
			options.skipPackageJson ? noop() : addDependenciesToPackageJson(options),
		]);
	};
}
