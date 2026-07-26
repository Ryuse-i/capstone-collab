export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="text-sm text-muted-foreground">
        You do not have permission to view this page.
      </p>
      <a href="/dashboard" className="text-sm font-medium text-primary underline">
        Go to dashboard
      </a>
    </div>
  );
}
