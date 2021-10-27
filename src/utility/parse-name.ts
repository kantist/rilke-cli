/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

// import { relative, Path } from "../../../angular_devkit/core/src/virtual-fs";
import { Path, basename, dirname, join, normalize } from '@angular-devkit/core';

export interface Location {
	name: string;
	path: Path;
}

export function parseName(path: string, name: string): Location {
	const nameWithoutPath = basename(normalize(name));
	const namePath = dirname(join(normalize(path), name));

	return {
		name: nameWithoutPath,
		path: normalize('/' + namePath),
	};
}
