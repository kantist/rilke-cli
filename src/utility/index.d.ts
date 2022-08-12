/**
 * @license
 * Copyright Kant Yazılım A.Ş. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://rilke.ist/license
 */
export { ProjectDefinition, TargetDefinition, WorkspaceDefinition, getWorkspace as readWorkspace, updateWorkspace, writeWorkspace, } from './workspace';
export { Builders as AngularBuilder } from './workspace-models';
export { DependencyType, ExistingBehavior, InstallBehavior, addDependency } from './dependency';
