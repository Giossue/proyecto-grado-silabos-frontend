import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import { methodFrom } from './lib/apiContract.mjs';

const method = (code) => {
    const source = ts.createSourceFile('consumer.ts', code, ts.ScriptTarget.Latest, true);
    let call;
    const visit = (node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'api') call = node;
        ts.forEachChild(node, visit);
    };
    visit(source);
    assert.ok(call);
    return methodFrom(call.arguments[1], call);
};

test('verifica PATCH cuando multipart fija _method en el mismo bloque', () => {
    assert.equal(method("function update(payload) { if (payload instanceof FormData) { payload.set('_method', 'PATCH'); return api('/items/id', { method: 'POST', body: payload }); } }"), 'PATCH');
});

test('una sobrescritura de otro cuerpo, otra rama o posterior no cambia POST', () => {
    for (const operation of ["other.set('_method', 'PATCH');", "if (condition) { payload.set('_method', 'PATCH'); }"]) {
        assert.equal(method(`function update(payload) { ${operation} return api('/items/id', { method: 'POST', body: payload }); }`), 'POST');
    }
    assert.equal(method("function update(payload) { const result = api('/items/id', { method: 'POST', body: payload }); payload.set('_method', 'PATCH'); return result; }"), 'POST');
});

test('mantiene el método normal y usa la última sobrescritura explícita', () => {
    assert.equal(method("api('/items/id', { method: 'PATCH', body: '{}' });"), 'PATCH');
    assert.equal(method("function update(payload) { payload.set('_method', 'PATCH'); payload.set('_method', 'DELETE'); return api('/items/id', { method: 'POST', body: payload }); }"), 'DELETE');
    assert.equal(method("api('/items');"), 'GET');
});
