/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize, strings } from '@angular-devkit/core';
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
  noop,
  schematic,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { NodeDependencyType, addPackageJsonDependency } from '../utility/dependencies';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { validateProjectName } from '../utility/validation';
import { getWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders, ProjectType } from '../utility/workspace-models';
import { Schema as LibraryOptions } from './schema';

function updateTsConfig(packageName: string, ...paths: string[]) {
  return (host: Tree) => {
    if (!host.exists('tsconfig.json')) {
      return host;
    }

    const file = new JSONFile(host, 'tsconfig.json');
    const jsonPath = ['compilerOptions', 'paths', packageName];
    const value = file.get(jsonPath);
    file.modify(jsonPath, Array.isArray(value) ? [...value, ...paths] : paths);
  };
}

function addDependenciesToPackageJson() {
  return (host: Tree) => {
    [
      {
        type: NodeDependencyType.Dev,
        name: '@angular/compiler-cli',
        version: latestVersions.Angular,
      },
      {
        type: NodeDependencyType.Dev,
        name: '@angular-devkit/build-angular',
        version: latestVersions.DevkitBuildAngular,
      },
      {
        type: NodeDependencyType.Dev,
        name: 'ng-packagr',
        version: latestVersions['ng-packagr'],
      },
      {
        type: NodeDependencyType.Default,
        name: 'tslib',
        version: latestVersions['tslib'],
      },
      {
        type: NodeDependencyType.Dev,
        name: 'typescript',
        version: latestVersions['typescript'],
      },
    ].forEach((dependency) => addPackageJsonDependency(host, dependency));

    return host;
  };
}

function addLibToWorkspaceFile(
  options: LibraryOptions,
  projectRoot: string,
  projectName: string,
): Rule {
  return updateWorkspace((workspace) => {
    if (workspace.projects.size === 0) {
      workspace.extensions.defaultProject = projectName;
    }

    workspace.projects.add({
      name: projectName,
      root: projectRoot,
      sourceRoot: `${projectRoot}/src`,
      projectType: ProjectType.Library,
      prefix: options.prefix,
      targets: {
        build: {
          builder: Builders.NgPackagr,
          defaultConfiguration: 'production',
          options: {
            project: `${projectRoot}/ng-package.json`,
          },
          configurations: {
            production: {
              tsConfig: `${projectRoot}/tsconfig.lib.prod.json`,
            },
            development: {
              tsConfig: `${projectRoot}/tsconfig.lib.json`,
            },
          },
        },
        test: {
          builder: Builders.Karma,
          options: {
            main: `${projectRoot}/src/test.ts`,
            tsConfig: `${projectRoot}/tsconfig.spec.json`,
            karmaConfig: `${projectRoot}/karma.conf.js`,
          },
        },
      },
    });
  });
}

export default function (options: LibraryOptions): Rule {
  return async (host: Tree) => {
    if (!options.name) {
      throw new SchematicsException(`Invalid options, "name" is required.`);
    }
    const prefix = options.prefix;

    validateProjectName(options.name);

    // If scoped project (i.e. "@foo/bar"), convert projectDir to "foo/bar".
    const projectName = options.name;
    const packageName = strings.dasherize(projectName);
    let scopeName = null;
    if (/^@.*\/.*/.test(options.name)) {
      const [scope, name] = options.name.split('/');
      scopeName = scope.replace(/^@/, '');
      options.name = name;
    }

    const workspace = await getWorkspace(host);
    const newProjectRoot = (workspace.extensions.newProjectRoot as string | undefined) || '';

    const scopeFolder = scopeName ? strings.dasherize(scopeName) + '/' : '';
    const folderName = `${scopeFolder}${strings.dasherize(options.name)}`;
    const projectRoot = join(normalize(newProjectRoot), folderName);
    const distRoot = `dist/${folderName}`;
    const pathImportLib = `${distRoot}/${folderName.replace('/', '-')}`;
    const sourceDir = `${projectRoot}/src/lib`;

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        ...options,
        packageName,
        projectRoot,
        distRoot,
        relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(projectRoot),
        prefix,
        angularLatestVersion: latestVersions.Angular.replace(/~|\^/, ''),
        tsLibLatestVersion: latestVersions['tslib'].replace(/~|\^/, ''),
        folderName,
      }),
      move(projectRoot),
    ]);

    return chain([
      mergeWith(templateSource),
      addLibToWorkspaceFile(options, projectRoot, projectName),
      options.skipPackageJson ? noop() : addDependenciesToPackageJson(),
      options.skipTsConfig ? noop() : updateTsConfig(packageName, pathImportLib, distRoot),
      schematic('module', {
        name: options.name,
        commonModule: false,
        flat: true,
        path: sourceDir,
        project: projectName,
      }),
      schematic('component', {
        name: options.name,
        selector: `${prefix}-${options.name}`,
        inlineStyle: true,
        inlineTemplate: true,
        flat: true,
        path: sourceDir,
        export: true,
        project: projectName,
      }),
      schematic('service', {
        name: options.name,
        flat: true,
        path: sourceDir,
        project: projectName,
      }),
      (_tree: Tree, context: SchematicContext) => {
        if (!options.skipPackageJson && !options.skipInstall) {
          context.addTask(new NodePackageInstallTask());
        }
      },
    ]);
  };
}
