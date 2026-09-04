'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RoomSwitcher } from './RoomSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  Receipt,
  Wallet,
  Package,
  Scale,
  History,
  LayoutGrid,
  LayoutDashboard,
  Plus,
  LogOut,
  Menu,
  X,
  Settings,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { useState } from 'react';

const sidebarNavItems = (roomId: string) => [
  { href: `/rooms/${roomId}/dashboard`,  label: 'Dashboard',        icon: LayoutDashboard, section: 'room' },
  { href: `/rooms/${roomId}/bills`,      label: 'Bills & Expenses', icon: Receipt,         section: 'room' },
  { href: `/rooms/${roomId}/catalog`,    label: 'Room Catalog',     icon: Package,         section: 'room' },
  { href: `/rooms/${roomId}/logs`,       label: 'Audit Logs',       icon: History,         section: 'room' },
  { href: `/rooms/${roomId}/settlement`, label: 'Settlement',       icon: Scale,           section: 'room' },
];

const bottomNavItems = (roomId: string) => [
  { href: `/rooms/${roomId}/dashboard`,  label: 'Dashboard',  icon: LayoutDashboard },
  { href: `/rooms/${roomId}/bills`,      label: 'Bills',      icon: Receipt },
  { href: `/rooms/${roomId}/settlement`, label: 'Settle',     icon: Scale },
  { href: `/rooms/${roomId}/settings`,   label: 'Settings',   icon: Settings },
];


function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-100 ${
        isActive
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      }`}
    >
      <Icon
        className={`size-4 shrink-0 transition-colors ${
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        }`}
      />
      {label}
    </Link>
  );
}

export function RoomAppShell({
  roomId,
  userName,
  children,
}: {
  roomId: string;
  userName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  async function handleLogout() {
    await apiClient.post(api.auth.logout);
    router.push('/login');
  }

  const navItems = sidebarNavItems(roomId);
  const mobileItems = bottomNavItems(roomId);
  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo / Branding */}
      <div className="flex h-12 items-center border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            R
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-foreground">Room Tracker</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-0 overflow-y-auto p-2 pt-3">
        {/* Dashboard Link — at the top like Linear */}
        <div className="mb-1">
          <NavItem
            href="/dashboard"
            label="All Rooms"
            icon={LayoutGrid}
            isActive={pathname === '/dashboard'}
          />
        </div>

        <div className="my-2 border-t border-border/60" />

        {/* Workspace / Room Switcher */}
        <div className="mb-3 px-0.5">
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Workspace
          </p>
          <RoomSwitcher />
        </div>

        {/* Room Navigation */}
        <div className="px-0.5">
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Room
          </p>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={pathname.startsWith(item.href)}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* Sidebar Bottom Left Footer: Room Settings */}
      <div className="border-t border-border p-2.5">
        <Link
          href={`/rooms/${roomId}/settings`}
          onClick={() => setMobileOpen(false)}
          className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-all ${
            pathname.startsWith(`/rooms/${roomId}/settings`)
              ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
              : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
          }`}
        >
          <Settings className="size-4 shrink-0" />
          <span>Room Settings</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased">

      {/* ── Desktop Sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-card sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Drawer (slide-in) ─────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative z-10 flex w-56 flex-col border-r border-border bg-card h-full">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main Area ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Top Navbar (desktop & mobile) */}
        <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-card/90 backdrop-blur-md px-4">
          <div className="flex items-center gap-2">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>

            {/* Breadcrumb path */}
            <div className="flex items-center gap-1.5 text-[13px]">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                All Rooms
              </Link>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-medium text-foreground capitalize">
                {pathname.split('/').pop() ?? 'Bills'}
              </span>
            </div>
          </div>

          {/* Right side actions: Theme toggle + Profile Circular Avatar Panel */}
          <div className="relative flex items-center gap-3">
            <ThemeToggle />

            {/* Circular Profile Avatar Button */}
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs ring-2 ring-primary/20 hover:ring-primary/40 focus:outline-none transition-all cursor-pointer"
              title={userName || 'Account'}
            >
              {initials}
            </button>

            {/* Profile Dropdown Panel */}
            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-border bg-card p-3 shadow-xl animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-border">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{userName || 'User'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">Active Member</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 h-8 px-2"
                    >
                      <LogOut className="size-3.5" />
                      Log out
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>


        {/* Page content */}
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-md px-2 py-2">
        {mobileItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Center floating action button */}
        <div className="-mt-5 flex flex-col items-center gap-0.5">
          <Link
            href={`/rooms/${roomId}/bills`}
            className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-background active:scale-95 transition-transform"
            title="Add Bill or Expense"
          >
            <Plus className="size-6" />
          </Link>
          <span className="text-[10px] font-semibold text-primary mt-0.5">Add</span>
        </div>

        {mobileItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
