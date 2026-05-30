// A raiz é tratada pelo middleware (redireciona para /login, /admin ou /app
// conforme a sessão/papel). Este componente é apenas um fallback.
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted">Redirecionando…</p>
    </main>
  );
}
