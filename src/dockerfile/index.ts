/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { Rule } from '@angular-devkit/schematics';
import { generateFromFiles } from '../utility/generate-from-files';
import { Schema as DockerfileOptions } from './schema';

export default function (options: DockerfileOptions): Rule {
	return generateFromFiles(options);
}
