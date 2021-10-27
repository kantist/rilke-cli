/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */

export function indentBy(indentations: number) {
	let i = '';
	while (indentations--) {
		i += '	';
	}

	return (strings: any, ...values: any) => {
		return i + stripIndent(strings, ...values).replace(/\n/g, '\n' + i);
	};
}

function stripIndent(strings: any, ...values: any) {
	const endResult = String.raw(strings, ...values);
	// remove the shortest leading indentation from each line
	const match = endResult.match(/^[ \t]*(?=\S)/gm);
	// return early if there's nothing to strip
	if (match === null) {
		return endResult;
	}
	const indent = Math.min(...match.map((el) => el.length));
	const regexp = new RegExp('^[ \\t]{' + indent + '}', 'gm');

	return (indent > 0 ? endResult.replace(regexp, '') : endResult).trim();
}