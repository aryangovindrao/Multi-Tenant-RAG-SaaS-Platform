import {
  BarChart3,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export const SETTINGS_LINKS = [
  { href: "/settings/members", label: "Members", icon: Users },
  { href: "/settings/organization", label: "Settings", icon: Settings },
] as const;
