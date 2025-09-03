import { AppSidebar } from './components/app-sidebar';

export default function ListViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <AppSidebar />

      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
