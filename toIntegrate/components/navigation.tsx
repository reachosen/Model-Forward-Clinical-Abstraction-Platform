"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderOpen, Beaker, Settings, History } from 'lucide-react';
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Home",
    href: "/",
    icon: Home,
    description: "Concern selection and case overview"
  },
  {
    label: "Cases",
    href: "/concern/clabsi/cases",
    icon: FolderOpen,
    description: "Browse and filter cases"
  },
  {
    label: "Demo",
    href: "/case/clabsi_demo_001",
    icon: Beaker,
    description: "Interactive CLABSI demo"
  },
  {
    label: "Task History",
    href: "#",
    icon: History,
    description: "Coming soon",
    disabled: true
  },
  {
    label: "Admin",
    href: "#",
    icon: Settings,
    description: "Coming soon",
    disabled: true
  }
];

export function Navigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              CA
            </div>
            <span className="font-semibold text-lg">CA Factory</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.disabled ? "#" : item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    active && "bg-accent text-accent-foreground",
                    item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                  aria-disabled={item.disabled}
                  onClick={(e) => item.disabled && e.preventDefault()}
                  title={item.description}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.disabled && (
                    <span className="hidden md:inline text-xs text-muted-foreground ml-1">
                      (Soon)
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
