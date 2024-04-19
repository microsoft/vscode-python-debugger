// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { DebugVisualizationContext } from 'vscode';

export function registerHexDebugVisualizationTreeProvider() {
    return {
        getTreeItem(context: DebugVisualizationContext) {
            const decoded = `0x${Number(context.variable.value).toString(16)}`;
            return {
                label: context.variable.name.toString(),
                description: decoded.toString(),
                buffer: decoded,
                canEdit: true,
                context,
            };
        },
        getChildren(_element: any) {
            return undefined;
        },
        editItem(item: any, value: string) {
            item.buffer = `0x${Number(value).toString(16)}`;
            item.description = item.buffer.toString();

            item.context.session.customRequest('setExpression', {
                expression: item.context.variable.evaluateName,
                frameId: item.context.frameId,
                value: JSON.stringify(item.buffer.toString()),
            });

            return item;
        },
    };
}
