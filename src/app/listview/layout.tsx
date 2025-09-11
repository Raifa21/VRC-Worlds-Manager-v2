import { AppSidebar } from './components/app-sidebar';
import { PopupManager } from './hook/usePopups/popup-manager';

export default function ListViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <AppSidebar />

      <main className="flex-1 h-screen overflow-y-auto no-webview-scroll-bar">
        {children}
      </main>

      <PopupManager />
    </div>
  );
}
