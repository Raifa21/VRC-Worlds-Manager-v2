import { AppSidebar } from './components/app-sidebar';

export default function ListViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <AppSidebar />

      <main className="flex-1 h-screen overflow-y-auto">{children}</main>
    </div>
  );
}
