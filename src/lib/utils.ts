import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type NavigableHref = string | { url: string };

export function toUrl(href: NavigableHref) {
    return typeof href === 'string' ? href : href?.url;
}
