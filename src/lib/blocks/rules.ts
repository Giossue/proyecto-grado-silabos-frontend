import { countOf, parseNumber, Scope } from '@/lib/blocks/scope';
import type { BlockRule } from '@/lib/blocks/types';

export type CheckResult = { label: string | null; actual: string; expected: string; ok: boolean };

export const ruleResults = (rule: BlockRule, value: Record<string, unknown>, variables: Record<string, string>): CheckResult[] => {
    const scope = new Scope(value, {}, variables);
    return rule.checks.map((check) => {
        const actual = check.count !== undefined
            ? countOf(scope.collect(check.count))
            : scope.collect(check.sum ?? '').reduce<number>((sum, item) => sum + parseNumber(item), 0);
        const comparison = check.equals !== undefined ? 'equals' : check.max !== undefined ? 'max' : 'min';
        const target = check[comparison];
        const expected = typeof target === 'object' && target !== null ? parseNumber(variables[target.variable] ?? '') : Number(target ?? 0);
        const ok = comparison === 'equals'
            ? Math.abs(actual - expected) <= 0.001
            : comparison === 'max' ? actual <= expected + 0.001 : actual >= expected - 0.001;
        return { label: check.label ?? null, actual: String(actual), expected: String(expected), ok };
    });
};

export const ruleFailures = (rules: BlockRule[], value: Record<string, unknown>, variables: Record<string, string>, on: 'save' | 'submit'): Array<{ code: string; message: string }> =>
    rules.filter((rule) => rule.on === on).flatMap((rule) => {
        const failed = ruleResults(rule, value, variables).filter((result) => !result.ok);
        if (failed.length === 0) return [];
        const first = failed[0]!;
        const detail = failed.map((result) => `${result.label ?? ''} ${result.actual} de ${result.expected}`.trim()).join(', ');
        return [{ code: rule.code, message: rule.message.replaceAll('{actual}', first.actual).replaceAll('{expected}', first.expected).replaceAll('{detail}', detail) }];
    });
