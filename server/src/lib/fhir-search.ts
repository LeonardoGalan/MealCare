export function buildPatientSearchPath(query: string): string {
  const normalized = query.trim();

  if (normalized.length < 2) {
    return "/Patient?_format=json&_count=0";
  }

  return `/Patient?name:contains=${encodeURIComponent(normalized)}&_format=json&_count=10`;
}
