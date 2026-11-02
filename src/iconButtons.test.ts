import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const IGNORED = ['src/components/ui/', 'src/components/ai-elements/inline-citation/', 'src/components/ai-elements/message/'];

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
  const path = join(directory, name);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return path.endsWith('.vue') || (path.endsWith('.ts') && !path.endsWith('.test.ts')) ? [path] : [];
});

const iconButtonsWithoutTooltip = (path: string): string[] => {
  const source = readFileSync(path, 'utf8');
  const missing: string[] = [];
  for (const match of source.matchAll(/<Button\b[^>]*?size="icon(?:-sm|-xs|-lg)?"[^>]*>/gs)) {
    const before = source.slice(Math.max(0, (match.index ?? 0) - 400), match.index);
    const opener = Math.max(before.lastIndexOf('<IconTooltip'), before.lastIndexOf('<TooltipTrigger'));
    const closer = Math.max(before.lastIndexOf('</IconTooltip>'), before.lastIndexOf('</TooltipTrigger>'));
    if (opener === -1 || closer > opener) missing.push(`${path}:${source.slice(0, match.index).split('\n').length}`);
  }

  for (const match of source.matchAll(/h\(Button\b[^)]*?size: 'icon(?:-sm|-xs|-lg)?'/gs)) {
    const before = source.slice(Math.max(0, (match.index ?? 0) - 120), match.index);
    if (!/withTooltip\(/.test(before)) missing.push(`${path}:${source.slice(0, match.index).split('\n').length}`);
  }

  return missing;
};

describe('Botones de solo ícono', () => {
  it('todos llevan la ayuda emergente de shadcn (IconTooltip o TooltipTrigger)', () => {
    const missing = sourceFiles('src')
      .filter((path) => !IGNORED.some((ignored) => path.startsWith(ignored)))
      .flatMap(iconButtonsWithoutTooltip);

    expect(missing).toEqual([]);
  });
});
