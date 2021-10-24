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
  apply,
  applyTemplates,
  filter,
  mergeWith,
  noop,
  url,
} from '@angular-devkit/schematics';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from './schema';

export default function (options: WorkspaceOptions): Rule {
  return mergeWith(
    apply(url('./files'), [
      options.minimal ? filter((path) => !path.endsWith('editorconfig.template')) : noop(),
      applyTemplates({
        utils: strings,
        ...options,
        'dot': '.',
        latestVersions,
      }),
    ]),
  );
}
