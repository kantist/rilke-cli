#!/usr/bin/env node
/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

/* eslint-disable no-console */
/* eslint-disable import/no-unassigned-import */
'use strict';

// Provide a title to the process in `ps`.
// Due to an obscure Mac bug, do not start this title with any symbol.

var shell = require('shelljs');

var disallowed_command = ['version', 'update', 'analytics', 'v'];

if (disallowed_command.includes(process.argv[2])) {
	console.log('\x1b[33m%s\x1b[0m', 'This command not supporting!');
	process.exitCode = 3;
}

try {
	var command = process.argv[2];

	if (command == 'new' || command == 'n') {
		process.argv.push('--collection');
		process.argv.push('@rilke/cli');
	}
} catch (_) {}

try {
	process.title = 'rilke ' + Array.from(process.argv).slice(2).join(' ');
} catch (_) {
	// If an error happened above, use the most basic title.
	process.title = 'rilke';
}

// This node version check ensures that extremely old versions of node are not used.
// These may not support ES2015 features such as const/let/async/await/etc.
// These would then crash with a hard to diagnose error message.
var version = process.versions.node.split('.').map((part) => Number(part));
if (version[0] % 2 === 1 && version[0] > 16) {
	// Allow new odd numbered releases with a warning (currently v17+)
	console.warn(
		'Node.js version ' +
			process.version +
			' detected.\n' +
			'Odd numbered Node.js versions will not enter LTS status and should not be used for production.' +
			' For more information, please see https://nodejs.org/en/about/releases/.'
	);

	require('./bootstrap');
} else if (
	version[0] < 12 ||
	version[0] === 13 ||
	version[0] === 15 ||
	(version[0] === 12 && version[1] < 20) ||
	(version[0] === 14 && version[1] < 15) ||
	(version[0] === 16 && version[1] < 10)
) {
	// Error and exit if less than 12.20 or 13.x or less than 14.15 or 15.x or less than 16.10
	console.error(
		'Node.js version ' +
			process.version +
			' detected.\n' +
			'The Rilke CLI requires a minimum Node.js version of either v12.20, v14.15, or v16.10.\n\n' +
			'Please update your Node.js version or visit https://nodejs.org/ for additional instructions.\n'
	);

	process.exitCode = 3;
} else {
	require('./bootstrap');
}
