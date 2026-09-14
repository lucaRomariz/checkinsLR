export default function Loading() {
  return (
    <div className="space-y-5 p-5" role="status" aria-label="Carregando página">
      <div className="h-8 w-40 animate-pulse rounded bg-surface2" />
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-28 animate-pulse rounded-2xl bg-surface" />
      ))}
      <p className="text-sm text-muted">Carregando...</p>
    </div>
  );
}
