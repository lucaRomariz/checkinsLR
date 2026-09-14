"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-4 p-6" role="alert">
      <h1 className="text-xl font-semibold">
        Não foi possível carregar esta página
      </h1>
      <p className="text-sm text-muted">
        Verifique sua conexão e tente novamente. Seus registros continuam
        salvos.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-white px-4 py-3 text-sm text-black"
      >
        Tentar novamente
      </button>
      <a href="/login" className="ml-4 text-sm underline">
        Voltar ao acesso
      </a>
    </div>
  );
}
