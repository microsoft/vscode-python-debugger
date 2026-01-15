// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { expect } from 'chai';
import { parseEnvFile } from '../../../extension/common/variables/environment';

suite('Environment File Parsing Tests', () => {
    test('Should parse simple environment variables', () => {
        const content = 'VAR1=value1\nVAR2=value2';
        const result = parseEnvFile(content);
        
        // eslint-disable-next-line @typescript-eslint/naming-convention
        expect(result).to.deep.equal({
            VAR1: 'value1',
            VAR2: 'value2',
        });
    });

    test('Should parse single-quoted multiline values', () => {
        const content = "EXAMPLE_VAR='very long value\nwith new line , we need to get all the lines'";
        const result = parseEnvFile(content);
        
        expect(result.EXAMPLE_VAR).to.equal('very long value\nwith new line , we need to get all the lines');
    });

    test('Should parse double-quoted multiline values', () => {
        const content = 'EXAMPLE_VAR="very long value\nwith new line , we need to get all the lines"';
        const result = parseEnvFile(content);
        
        expect(result.EXAMPLE_VAR).to.equal('very long value\nwith new line , we need to get all the lines');
    });

    test('Should parse escaped newlines in single-quoted values', () => {
        const content = "VAR='line1\\nline2'";
        const result = parseEnvFile(content);
        
        expect(result.VAR).to.equal('line1\nline2');
    });

    test('Should parse escaped newlines in double-quoted values', () => {
        const content = 'VAR="line1\\nline2"';
        const result = parseEnvFile(content);
        
        expect(result.VAR).to.equal('line1\nline2');
    });

    test('Should handle multiple variables with multiline values', () => {
        const content = "VAR1='multiline\nvalue1'\nVAR2='multiline\nvalue2'";
        const result = parseEnvFile(content);
        
        expect(result.VAR1).to.equal('multiline\nvalue1');
        expect(result.VAR2).to.equal('multiline\nvalue2');
    });

    test('Should handle unquoted values', () => {
        const content = 'VAR=value_without_quotes';
        const result = parseEnvFile(content);
        
        expect(result.VAR).to.equal('value_without_quotes');
    });

    test('Should handle empty values', () => {
        const content = 'VAR=';
        const result = parseEnvFile(content);
        
        expect(result.VAR).to.equal('');
    });

    test('Should ignore lines without equals sign', () => {
        const content = 'VAR1=value1\nInvalid line\nVAR2=value2';
        const result = parseEnvFile(content);
        
        // eslint-disable-next-line @typescript-eslint/naming-convention
        expect(result).to.deep.equal({
            VAR1: 'value1',
            VAR2: 'value2',
        });
    });

    test('Should handle multiline value with multiple newlines', () => {
        const content = "VAR='line1\nline2\nline3\nline4'";
        const result = parseEnvFile(content);
        
        expect(result.VAR).to.equal('line1\nline2\nline3\nline4');
    });

    test('Should parse environment file as Buffer', () => {
        const content = Buffer.from("VAR='multiline\nvalue'");
        const result = parseEnvFile(content);
        
        expect(result.VAR).to.equal('multiline\nvalue');
    });

    test('Should handle whitespace around variable names and equals', () => {
        const content = "  VAR1  =  value1  \n  VAR2='multiline\nvalue'";
        const result = parseEnvFile(content);
        
        expect(result.VAR1).to.equal('value1');
        expect(result.VAR2).to.equal('multiline\nvalue');
    });
});
