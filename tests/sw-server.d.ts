export function buildTo(id: string): string;
export function serve(root: string): Promise<{ url: string; setRoot(dir: string): void; close(): Promise<void> }>;
