import ListViewClientShell from './ListViewClientShell';

export default function ListViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ListViewClientShell>{children}</ListViewClientShell>;
}
