/** A text part worth showing: not empty and not a "—" placeholder. */
export function isFilled(part: string | null | undefined | false): part is string {
  if (!part) return false;
  const v = part.trim();
  return v !== '' && v !== '—' && v !== '-' && v !== '·';
}

/** Joins the non-empty parts with " · " — never leaves a dangling separator. */
export function joinParts(parts: Array<string | null | undefined | false>, sep = ' · '): string {
  return parts
    .filter(isFilled)
    .map((p) => p.trim())
    .join(sep);
}
