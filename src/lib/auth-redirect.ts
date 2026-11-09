const FALLBACK_CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function getSafeNextPath(
  next: string | string[] | undefined,
  fallback: string,
): string {
  const value = Array.isArray(next) ? next[0] : next;

  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    FALLBACK_CONTROL_CHARS.test(value)
  ) {
    return fallback;
  }

  return value;
}
