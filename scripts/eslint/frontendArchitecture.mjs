const nativeControls = new Set(['button', 'select', 'textarea', 'details', 'summary', 'progress']);
const domPrimitives = new Set(['Button', 'Badge', 'Input', 'Textarea', 'TableCell', 'TableHead', 'TooltipTrigger', 'PopoverTrigger', 'RadioGroupItem']);
const paletteClass = /(?:^|\s|:)(?:bg|text|border|ring|fill|stroke|shadow)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d+)?(?:\/\d+)?(?=\s|$)/;
const rawColor = /#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\([^)]*\)/i;
const fixedDimension = /(?:^|\s|:)(?:[a-z-]+)-\[(?:\d*\.)?\d+(?:px|rem|em|pt|vh|vw|dvh|%)\]/;

const valueOf = (node) => node.value?.value ?? null;
const attributeName = (node) => node.directive ? node.key.argument?.name : node.key.name;
const isNative = (name) => /^[a-z]/.test(name);

export const sharedComponents = {
    meta: { type: 'problem', schema: [], messages: { native: 'Use una primitiva local de shadcn para este control.', title: 'Use Tooltip para la ayuda; title se propaga al HTML.', confirm: 'Use el diálogo compartido para confirmar la navegación.' } },
    create(context) {
        const report = (node, messageId) => context.report({ node, messageId });
        const member = (node) => {
            if (node.object.type === 'Identifier' && node.object.name === 'window' && (node.property.name ?? node.property.value) === 'confirm') report(node, 'confirm');
        };
        const template = {
            VElement(node) {
                if (nativeControls.has(node.rawName)) report(node, 'native');
                if (node.rawName !== 'input') return;
                const attrs = new Map(node.startTag.attributes.filter((attr) => !attr.directive).map((attr) => [attr.key.name, valueOf(attr)]));
                const hidden = attrs.get('type') === 'hidden' || attrs.has('hidden') || /(?:^|\s)(?:sr-only|hidden)(?:\s|$)/.test(attrs.get('class') ?? '');
                if (!hidden) report(node, 'native');
            },
            VAttribute(node) {
                const tag = node.parent.parent.rawName;
                if (attributeName(node) === 'role' && valueOf(node) === 'button' && isNative(tag)) report(node, 'native');
                if (attributeName(node) === 'title' && (isNative(tag) || domPrimitives.has(tag))) report(node, 'title');
            },
            MemberExpression: member,
        };
        const script = {
            MemberExpression: member,
            CallExpression(node) {
                if (node.callee.type === 'Identifier' && node.callee.name === 'confirm') report(node, 'confirm');
                if (node.callee.type === 'Identifier' && node.callee.name === 'h' && nativeControls.has(node.arguments[0]?.value)) report(node, 'native');
            },
        };
        return context.sourceCode.parserServices.defineTemplateBodyVisitor?.(template, script) ?? script;
    },
};

export const semanticStyles = {
    meta: { type: 'problem', schema: [], messages: { color: 'Use tokens semánticos del tema; centralice colores documentales en documentPalette.', dimension: 'Use la escala de Tailwind o una dimensión compartida del tema.', stacking: 'Defina el nivel de superposición en la primitiva compartida.' } },
    create(context) {
        const check = (node, value) => {
            if (typeof value !== 'string') return;
            if (paletteClass.test(value) || rawColor.test(value)) context.report({ node, messageId: 'color' });
            if (fixedDimension.test(value)) context.report({ node, messageId: 'dimension' });
            if (/(?:^|\s|:)z-\[\d+\]/.test(value)) context.report({ node, messageId: 'stacking' });
        };
        const script = {
            Literal: (node) => check(node, node.value),
            TemplateElement: (node) => check(node, node.value.cooked),
            Program() {
                const fragment = context.sourceCode.parserServices.getDocumentFragment?.();
                for (const element of fragment?.children ?? []) {
                    if (element.type !== 'VElement' || element.rawName !== 'style') continue;
                    for (const child of element.children) {
                        if (child.type === 'VText' && rawColor.test(child.value)) context.report({ node: child, messageId: 'color' });
                    }
                }
            },
        };
        const template = { VLiteral: (node) => check(node, node.value), ...script };
        return context.sourceCode.parserServices.defineTemplateBodyVisitor?.(template, script) ?? script;
    },
};
