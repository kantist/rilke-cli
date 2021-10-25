/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.io/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as ApplicationOptions } from '../application/schema';
import { createAppModule } from '../utility/test';
import { Schema as WorkspaceOptions } from '../workspace/schema';
import { Schema as ComponentOptions } from './schema';

describe('Component Schematic', () => {
	const schematicRunner = new SchematicTestRunner(
		'@schematics/angular',
		require.resolve('../collection.json'),
	);
	const defaultOptions: ComponentOptions = {
		name: 'foo',
		// path: 'src/app',
		inlineStyle: false,
		inlineTemplate: false,
		changeDetection: 'Default',
		style: 'css',
		type: 'Component',
		skipTests: false,
		module: undefined,
		layer: 'features',
		export: false,
		project: 'bar',
	};

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
		style: 'css',
		skipTests: false,
		skipPackageJson: false,
	};
	let appTree: UnitTestTree;
	beforeEach(async () => {
		appTree = await schematicRunner.runSchematicAsync('workspace', workspaceOptions).toPromise();
		appTree = await schematicRunner
			.runSchematicAsync('application', appOptions, appTree)
			.toPromise();
	});

	it('should create a component', async () => {
		const options = { ...defaultOptions };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const files = tree.files;
		expect(files).toEqual(
			jasmine.arrayContaining([
				'/projects/bar/src/app/foo/foo.component.css',
				'/projects/bar/src/app/foo/foo.component.html',
				'/projects/bar/src/app/foo/foo.component.spec.ts',
				'/projects/bar/src/app/foo/foo.component.ts',
			]),
		);
		const moduleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
		expect(moduleContent).toMatch(/import.*Foo.*from '.\/foo\/foo.component'/);
		expect(moduleContent).toMatch(/declarations:\s*\[[^\]]+?,\r?\n\s+FooComponent\r?\n/m);
	});

	it('should set change detection to OnPush', async () => {
		const options = { ...defaultOptions, changeDetection: 'OnPush' };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(tsContent).toMatch(/changeDetection: ChangeDetectionStrategy.OnPush/);
	});

	it('should not set view encapsulation', async () => {
		const options = { ...defaultOptions };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(tsContent).not.toMatch(/encapsulation: ViewEncapsulation/);
	});

	it('should set view encapsulation to Emulated', async () => {
		const options = { ...defaultOptions, viewEncapsulation: 'Emulated' };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(tsContent).toMatch(/encapsulation: ViewEncapsulation.Emulated/);
	});

	it('should set view encapsulation to None', async () => {
		const options = { ...defaultOptions, viewEncapsulation: 'None' };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const tsContent = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(tsContent).toMatch(/encapsulation: ViewEncapsulation.None/);
	});

	it('should create a flat component', async () => {
		const options = { ...defaultOptions, flat: true };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const files = tree.files;
		expect(files).toEqual(
			jasmine.arrayContaining([
				'/projects/bar/src/app/foo.component.css',
				'/projects/bar/src/app/foo.component.html',
				'/projects/bar/src/app/foo.component.spec.ts',
				'/projects/bar/src/app/foo.component.ts',
			]),
		);
	});

	it('should find the closest module', async () => {
		const options = { ...defaultOptions };
		const fooModule = '/projects/bar/src/app/foo/foo.module.ts';
		appTree.create(
			fooModule,
			`
			import { NgModule } from '@angular/core';

			@NgModule({
				imports: [],
				declarations: []
			})
			export class FooModule { }
		`,
		);

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const fooModuleContent = tree.readContent(fooModule);
		expect(fooModuleContent).toMatch(/import { FooComponent } from '.\/foo.component'/);
	});

	it('should export the component', async () => {
		const options = { ...defaultOptions, export: true };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const appModuleContent = tree.readContent('/projects/bar/src/app/app.module.ts');
		expect(appModuleContent).toMatch(/exports: \[\n(\s*) {2}FooComponent\n\1\]/);
	});

	it('should import into a specified module', async () => {
		const options = { ...defaultOptions, module: 'app.module.ts' };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const appModule = tree.readContent('/projects/bar/src/app/app.module.ts');

		expect(appModule).toMatch(/import { FooComponent } from '.\/foo\/foo.component'/);
	});

	it('should fail if specified module does not exist', async () => {
		const options = { ...defaultOptions, module: '/projects/bar/src/app.moduleXXX.ts' };
		let thrownError: Error | null = null;
		try {
			await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		} catch (err) {
			thrownError = err;
		}
		expect(thrownError).toBeDefined();
	});

	it('should handle upper case paths', async () => {
		const pathOption = 'projects/bar/src/app/SOME/UPPER/DIR';
		const options = { ...defaultOptions, path: pathOption };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		let files = tree.files;
		let root = `/${pathOption}/foo/foo.component`;
		expect(files).toEqual(
			jasmine.arrayContaining([`${root}.css`, `${root}.html`, `${root}.spec.ts`, `${root}.ts`]),
		);

		const options2 = { ...options, name: 'BAR' };
		const tree2 = await schematicRunner.runSchematicAsync('component', options2, tree).toPromise();
		files = tree2.files;
		root = `/${pathOption}/bar/bar.component`;
		expect(files).toEqual(
			jasmine.arrayContaining([`${root}.css`, `${root}.html`, `${root}.spec.ts`, `${root}.ts`]),
		);
	});

	it('should create a component in a sub-directory', async () => {
		const options = { ...defaultOptions, path: 'projects/bar/src/app/a/b/c' };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const files = tree.files;
		const root = `/${options.path}/foo/foo.component`;
		expect(files).toEqual(
			jasmine.arrayContaining([`${root}.css`, `${root}.html`, `${root}.spec.ts`, `${root}.ts`]),
		);
	});

	it('should use the prefix', async () => {
		const options = { ...defaultOptions, prefix: 'pre' };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(content).toMatch(/selector: 'pre-foo'/);
	});

	it('should use the default project prefix if none is passed', async () => {
		const options = { ...defaultOptions, prefix: undefined };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(content).toMatch(/selector: 'app-foo'/);
	});

	it('should use the supplied prefix if it is ""', async () => {
		const options = { ...defaultOptions, prefix: '' };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(content).toMatch(/selector: 'foo'/);
	});

	it('should respect the inlineTemplate option', async () => {
		const options = { ...defaultOptions, inlineTemplate: true };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(content).toMatch(/template: /);
		expect(content).not.toMatch(/templateUrl: /);
		expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.html');
	});

	it('should respect the inlineStyle option', async () => {
		const options = { ...defaultOptions, inlineStyle: true };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(content).toMatch(/styles: \[/);
		expect(content).not.toMatch(/styleUrls: /);
		expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.css');
	});

	it('should respect the displayBlock option when inlineStyle is `false` and use correct syntax for `scss`', async () => {
		const options = { ...defaultOptions, displayBlock: true, style: 'scss' };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.component.scss');
		expect(content).toMatch(/:host {\r?\n {2}display: block;\r?\n}/);
	});

	it('should respect the displayBlock option when inlineStyle is `false` and use correct syntax for `sass', async () => {
		const options = { ...defaultOptions, displayBlock: true, style: 'sass' };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.component.sass');
		expect(content).toMatch(/\\:host\r?\n {2}display: block;\r?\n/);
	});

	it('should respect the displayBlock option when inlineStyle is `true`', async () => {
		const options = { ...defaultOptions, displayBlock: true, inlineStyle: true };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(content).toMatch(/:host {\r?\n(\s*)display: block;(\s*)}\r?\n/);
	});

	it('should respect the style option', async () => {
		const options = { ...defaultOptions, style: 'sass' };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(content).toMatch(/styleUrls: \['.\/foo.component.sass/);
		expect(tree.files).toContain('/projects/bar/src/app/foo/foo.component.sass');
		expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.css');
	});

	it('should respect the style=none option', async () => {
		const options = { ...defaultOptions, style: 'none' };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.component.ts');
		expect(content).not.toMatch(/styleUrls: /);
		expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.css');
		expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.none');
	});

	it('should respect the type option', async () => {
		const options = { ...defaultOptions, type: 'Route' };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.route.ts');
		const testContent = tree.readContent('/projects/bar/src/app/foo/foo.route.spec.ts');
		expect(content).toContain('export class FooRoute implements OnInit');
		expect(testContent).toContain("describe('FooRoute'");
		expect(tree.files).toContain('/projects/bar/src/app/foo/foo.route.css');
		expect(tree.files).toContain('/projects/bar/src/app/foo/foo.route.html');
	});

	it('should allow empty string in the type option', async () => {
		const options = { ...defaultOptions, type: '' };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/foo/foo.ts');
		const testContent = tree.readContent('/projects/bar/src/app/foo/foo.spec.ts');
		expect(content).toContain('export class Foo implements OnInit');
		expect(testContent).toContain("describe('Foo'");
		expect(tree.files).toContain('/projects/bar/src/app/foo/foo.css');
		expect(tree.files).toContain('/projects/bar/src/app/foo/foo.html');
	});

	it('should use the module flag even if the module is a routing module', async () => {
		const routingFileName = 'app-routing.module.ts';
		const routingModulePath = `/projects/bar/src/app/${routingFileName}`;
		const newTree = createAppModule(appTree, routingModulePath);
		const options = { ...defaultOptions, module: routingFileName };
		const tree = await schematicRunner.runSchematicAsync('component', options, newTree).toPromise();
		const content = tree.readContent(routingModulePath);
		expect(content).toMatch(/import { FooComponent } from '.\/foo\/foo.component/);
	});

	it('should handle a path in the name option', async () => {
		const options = { ...defaultOptions, name: 'dir/test-component' };

		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = tree.readContent('/projects/bar/src/app/app.module.ts');
		expect(content).toMatch(
			/import { TestComponentComponent } from '\.\/dir\/test-component\/test-component.component'/,
		);
	});

	it('should handle a path in the name and module options', async () => {
		appTree = await schematicRunner
			.runSchematicAsync('module', { name: 'admin/module', project: 'bar' }, appTree)
			.toPromise();

		const options = { ...defaultOptions, name: 'other/test-component', module: 'admin/module' };
		appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();

		const content = appTree.readContent('/projects/bar/src/app/admin/module/module.module.ts');
		expect(content).toMatch(
			/import { TestComponentComponent } from '..\/..\/other\/test-component\/test-component.component'/,
		);
	});

	it('should create the right selector with a path in the name', async () => {
		const options = { ...defaultOptions, name: 'sub/test' };
		appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = appTree.readContent('/projects/bar/src/app/sub/test/test.component.ts');
		expect(content).toMatch(/selector: 'app-test'/);
	});

	it('should respect the skipSelector option', async () => {
		const options = { ...defaultOptions, name: 'sub/test', skipSelector: true };
		appTree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const content = appTree.readContent('/projects/bar/src/app/sub/test/test.component.ts');
		expect(content).not.toMatch(/selector: 'app-test'/);
	});

	it('should respect the sourceRoot value', async () => {
		const config = JSON.parse(appTree.readContent('/angular.json'));
		config.projects.bar.sourceRoot = 'projects/bar/custom';
		appTree.overwrite('/angular.json', JSON.stringify(config, null, 2));

		// should fail without a module in that dir
		await expectAsync(
			schematicRunner.runSchematicAsync('component', defaultOptions, appTree).toPromise(),
		).toBeRejected();

		// move the module
		appTree.rename('/projects/bar/src/app/app.module.ts', '/projects/bar/custom/app/app.module.ts');
		appTree = await schematicRunner
			.runSchematicAsync('component', defaultOptions, appTree)
			.toPromise();
		expect(appTree.files).toContain('/projects/bar/custom/app/foo/foo.component.ts');
	});

	it('should respect the skipTests option', async () => {
		const options = { ...defaultOptions, skipTests: true };
		const tree = await schematicRunner.runSchematicAsync('component', options, appTree).toPromise();
		const files = tree.files;

		expect(files).toEqual(
			jasmine.arrayContaining([
				'/projects/bar/src/app/foo/foo.component.css',
				'/projects/bar/src/app/foo/foo.component.html',
				'/projects/bar/src/app/foo/foo.component.ts',
			]),
		);
		expect(tree.files).not.toContain('/projects/bar/src/app/foo/foo.component.spec.ts');
	});
});
