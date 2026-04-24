import { CheckSquare, LayoutDashboard, ListTodo, FileText, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { user, userRole, orgName, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/tasks", icon: ListTodo, label: "Tasks" },
    { href: "/audit-log", icon: FileText, label: "Audit Log" },
  ];

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-sidebar-primary" />
          <span className="text-lg font-bold">TaskFlow</span>
        </div>
        {orgName && (
          <p className="text-xs text-sidebar-foreground/60 mt-1 truncate">{orgName}</p>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => (
          <button
            key={link.href}
            onClick={() => navigate(link.href)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
              location.pathname === link.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-medium">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate">{user?.email}</p>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole?.role ?? "—"}</p>
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
