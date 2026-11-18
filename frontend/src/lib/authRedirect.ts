const invitePathPattern = /^\/invite\/[A-Za-z0-9_-]+$/;

export function getPostAuthPath(search: string): string {
  const nextPath = new URLSearchParams(search).get("next");
  return nextPath && invitePathPattern.test(nextPath)
    ? nextPath
    : "/dashboard";
}
