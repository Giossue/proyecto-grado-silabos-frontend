import ts from 'typescript';

const propertyOf = (argument, name) => argument.properties.find((property) =>
    ts.isPropertyAssignment(property) && property.name.getText().replaceAll(/["']/g, '') === name,
);

export const methodFrom = (argument, call) => {
    if (!argument || !ts.isObjectLiteralExpression(argument)) return 'GET';
    const methodProperty = propertyOf(argument, 'method');
    const method = methodProperty && ts.isStringLiteral(methodProperty.initializer) ? methodProperty.initializer.text.toUpperCase() : 'GET';
    const body = propertyOf(argument, 'body')?.initializer;
    if (method !== 'POST' || !body || !ts.isIdentifier(body)) return method;
    let block = call.parent;
    while (block && !ts.isBlock(block)) block = block.parent;
    if (!block) return method;
    let override = null;
    for (const statement of block.statements) {
        if (statement.getStart() >= call.getStart()) break;
        if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) continue;
        const expression = statement.expression;
        if (!ts.isPropertyAccessExpression(expression.expression)) continue;
        const target = expression.expression;
        if (!ts.isIdentifier(target.expression) || target.expression.text !== body.text || target.name.text !== 'set') continue;
        const [key, value] = expression.arguments;
        if (key && ts.isStringLiteral(key) && key.text === '_method') {
            override = value && ts.isStringLiteral(value) ? value.text.toUpperCase() : null;
        }
    }
    return override ?? method;
};
