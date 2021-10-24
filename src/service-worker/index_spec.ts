/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ServiceWorkerOptions } from './schema';

describe('Service Worker Schematic', () => {
	const schematicRunner = new SchematicTestRunner(
		'@schematics/angular',
		require.resolve('../collection.json'),
	);
	const defaultOptions: ServiceWorkerOptions = {
		project: 'bar',
		target: 'build',
	};

	let appTree: UnitTestTree;

	const workspaceOptions: WorkspaceOptions = {
		name: 'workspace',
		newProjectRoot: 'projects',
		version: '6.0.0',
	};

	const appOptions: ApplicationOptions = {
		name: 'bar',
		inlineStyle: false,
		inlineTemplate: false,
		routing: false,
		skipTests: false,
		skipPackageJson: false,
	};

	beforeEach(async () => {
		appTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
		appTree = await schematicRunner
			.runSchematicAsync('application', appOptions, appTree)
			.toPromise();
	});

	it('should add `serviceWorker` option to build target', async () => {
		const tree = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const configText = tree.readContent('/angular.json');
		const buildConfig = JSON.parse(configText).projects.bar.architect.build;

		expect(buildConfig.options.serviceWorker).toBeTrue();
	});

	it('should add the necessary dependency', async () => {
		const tree = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const pkgText = tree.readContent('/package.json');
		const pkg = JSON.parse(pkgText);
		const version = pkg.dependencies['@angular/core'];
		expect(pkg.dependencies['@angular/service-worker']).toEqual(version);
	});

	it('should import ServiceWorkerModule', async () => {
		const tree = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
		expect(pkgText).toMatch(/import \{ ServiceWorkerModule \} from '@angular\/service-worker'/);
	});

	it('should import environment', async () => {
		const tree = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
		expect(pkgText).toMatch(/import \{ environment \} from '\.\.\/environments\/environment'/);
	});

	it('should add the SW import to the NgModule imports', async () => {
		const tree = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
		expect(pkgText).toMatch(
			new RegExp(
				"(\\s+)ServiceWorkerModule\\.register\\('ngsw-worker\\.js', \\{\\n" +
					'\\1  enabled: environment\\.production,\\n' +
					'\\1  // Register the ServiceWorker as soon as the app is stable\\n' +
					'\\1  // or after 30 seconds \\(whichever comes first\\)\\.\\n' +
					"\\1  registrationStrategy: 'registerWhenStable:30000'\\n" +
					'\\1}\\)',
			),
		);
	});

	it('should add the SW import to the NgModule imports with aliased environment', async () => {
		const moduleContent = `
			import { BrowserModule } from '@angular/platform-browser';
			import { NgModule } from '@angular/core';

			import { AppComponent } from './app.component';
			import { environment as env } from '../environments/environment';

			@NgModule({
				declarations: [
					AppComponent
				],
				imports: [
					BrowserModule
				],
				bootstrap: [AppComponent]
			})
			export class AppModule {}
		`;

		appTree.overwrite('/projects/bar/src/app/app.module.ts', moduleContent);

		const tree = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
		expect(pkgText).toMatch(
			new RegExp(
				"(\\s+)ServiceWorkerModule\\.register\\('ngsw-worker\\.js', \\{\\n" +
					'\\1  enabled: env\\.production,\\n' +
					'\\1  // Register the ServiceWorker as soon as the app is stable\\n' +
					'\\1  // or after 30 seconds \\(whichever comes first\\)\\.\\n' +
					"\\1  registrationStrategy: 'registerWhenStable:30000'\\n" +
					'\\1}\\)',
			),
		);
	});

	it('should add the SW import to the NgModule imports with existing environment', async () => {
		const moduleContent = `
			import { BrowserModule } from '@angular/platform-browser';
			import { NgModule } from '@angular/core';

			import { AppComponent } from './app.component';
			import { environment } from '../environments/environment';

			@NgModule({
				declarations: [
					AppComponent
				],
				imports: [
					BrowserModule
				],
				bootstrap: [AppComponent]
			})
			export class AppModule {}
		`;

		appTree.overwrite('/projects/bar/src/app/app.module.ts', moduleContent);

		const tree = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const pkgText = tree.readContent('/projects/bar/src/app/app.module.ts');
		expect(pkgText).toMatch(
			new RegExp(
				"(\\s+)ServiceWorkerModule\\.register\\('ngsw-worker\\.js', \\{\\n" +
					'\\1  enabled: environment\\.production,\\n' +
					'\\1  // Register the ServiceWorker as soon as the app is stable\\n' +
					'\\1  // or after 30 seconds \\(whichever comes first\\)\\.\\n' +
					"\\1  registrationStrategy: 'registerWhenStable:30000'\\n" +
					'\\1}\\)',
			),
		);
	});

	it('should put the ngsw-config.json file in the project root', async () => {
		const tree = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const path = '/projects/bar/ngsw-config.json';
		expect(tree.exists(path)).toEqual(true);

		const { projects } = JSON.parse(tree.readContent('/angular.json'));
		expect(projects.bar.architect.build.options.ngswConfigPath).toBe(
			'projects/bar/ngsw-config.json',
		);
	});

	it('should add $schema in ngsw-config.json with correct relative path', async () => {
		const pathToNgswConfigSchema = 'node_modules/@angular/service-worker/config/schema.json';

		const name = 'foo';
		const rootAppOptions: ApplicationOptions = {
			...appOptions,
			name,
			projectRoot: '',
		};
		const rootSWOptions: ServiceWorkerOptions = {
			...defaultOptions,
			project: name,
		};
		const rootAppTree = await schematicRunner
			.runSchematicAsync('application', rootAppOptions, appTree)
			.toPromise();
		const treeInRoot = await schematicRunner
			.runSchematicAsync('service-worker', rootSWOptions, rootAppTree)
			.toPromise();
		const pkgTextInRoot = treeInRoot.readContent('/ngsw-config.json');
		const configInRoot = JSON.parse(pkgTextInRoot);
		expect(configInRoot.$schema).toBe(`./${pathToNgswConfigSchema}`);

		const treeNotInRoot = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const pkgTextNotInRoot = treeNotInRoot.readContent('/projects/bar/ngsw-config.json');
		const configNotInRoot = JSON.parse(pkgTextNotInRoot);
		expect(configNotInRoot.$schema).toBe(`../../${pathToNgswConfigSchema}`);
	});

	it('should add root assets RegExp', async () => {
		const tree = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const pkgText = tree.readContent('/projects/bar/ngsw-config.json');
		const config = JSON.parse(pkgText);
		expect(config.assetGroups[1].resources.files).toContain(
			'/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)',
		);
	});

	it('should add resourcesOutputPath to root assets when specified', async () => {
		const config = JSON.parse(appTree.readContent('/angular.json'));
		config.projects.bar.architect.build.options.resourcesOutputPath = 'outDir';
		appTree.overwrite('/angular.json', JSON.stringify(config));
		const tree = await schematicRunner
			.runSchematicAsync('service-worker', defaultOptions, appTree)
			.toPromise();
		const pkgText = tree.readContent('/projects/bar/ngsw-config.json');
		const ngswConfig = JSON.parse(pkgText);
		expect(ngswConfig.assetGroups[1].resources.files).toContain(
			'/outDir/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)',
		);
	});

	it('should generate ngsw-config.json in root when the application is at root level', async () => {
		const name = 'foo';
		const rootAppOptions: ApplicationOptions = {
			...appOptions,
			name,
			projectRoot: '',
		};
		const rootSWOptions: ServiceWorkerOptions = {
			...defaultOptions,
			project: name,
		};

		let tree = await schematicRunner
			.runSchematicAsync('application', rootAppOptions, appTree)
			.toPromise();
		tree = await schematicRunner
			.runSchematicAsync('service-worker', rootSWOptions, tree)
			.toPromise();
		expect(tree.exists('/ngsw-config.json')).toBe(true);

		const { projects } = JSON.parse(tree.readContent('/angular.json'));
		expect(projects.foo.architect.build.options.ngswConfigPath).toBe('ngsw-config.json');
	});
});
