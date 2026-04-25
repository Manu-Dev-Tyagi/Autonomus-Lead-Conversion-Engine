import Link from "next/link";
import { ReactNode } from "react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/leads", label: "Leads" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/approvals", label: "Approvals" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];
const ADMIN_NAV_ITEMS = [
  { href: "/admin/activity", label: "Live Activity" },
  { href: "/admin/workspaces", label: "Workspaces" },
  { href: "/admin/monitoring", label: "Monitoring" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/tenant-claims", label: "Tenant Admin" },
];

export function AppShell(props: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  showAdminLinks?: boolean;
}) {
  const navItems = props.showAdminLinks
    ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]
    : NAV_ITEMS;
  return (
    <div className="ale-shell">
      <aside className="ale-sidebar">
        <h2 className="ale-sidebar-title">ALE</h2>
        <div style={{ padding: "0 16px 20px" }}>
          <WorkspaceSwitcher />
        </div>
        <nav className="ale-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="ale-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="ale-main">
        <header className="ale-header">
          <div>
            <h1 style={{ margin: 0 }}>{props.title}</h1>
            {props.subtitle ? <p className="ale-muted">{props.subtitle}</p> : null}
          </div>
          {props.actions ? <div className="ale-row">{props.actions}</div> : null}
        </header>
        <section className="ale-content">{props.children}</section>
      </main>
    </div>
  );
}
