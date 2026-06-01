export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-brand-700">BoviTrans</h1>
          <p className="text-sm text-brand-600">
            Gestión de Transporte Ganadero
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-lg shadow-brand-700/5 ring-1 ring-brand-100">
          {children}
        </div>
      </div>
    </main>
  );
}
