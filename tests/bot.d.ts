import type { Page } from '@playwright/test';
export const BOT: string;
export function play(page: Page, ms: number, until?: () => Promise<boolean>): Promise<void>;
