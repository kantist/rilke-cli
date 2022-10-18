/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

import { Rule } from '@angular-devkit/schematics';
import { generateFromFiles } from '../utility/generate-from-files';
import { secretFormatter } from '../utility/helper';
import { Schema as WorkflowOptions } from './schema';

export default function (options: WorkflowOptions): Rule {
	return () => {
		options.container_name = options.container.split('/').pop();

		options.secretFormatter = secretFormatter;

		return generateFromFiles(options);
	};
}
