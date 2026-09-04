import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || !user.is_platform_admin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Platform Admin</h1>
          <span className="text-sm text-muted-foreground">{user.name} ({user.email})</span>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
