"use client";

import React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  BellIcon,
  CalculatorIcon,
  CalendarIcon,
  ClipboardPasteIcon,
  CodeIcon,
  CopyIcon,
  CreditCardIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  HelpCircleIcon,
  HomeIcon,
  ImageIcon,
  InboxIcon,
  LayoutGridIcon,
  ListIcon,
  PlusIcon,
  ScissorsIcon,
  SettingsIcon,
  TrashIcon,
  UserIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";

import NotificationCenter from "@/components/notifications/NotificationCenter";
import { PageTransition } from "@/components/page-transition";
import { RealtimeClock } from "@/components/user/Realtime-clock";
import { useSidebarReady } from "@/hooks/useSidebarReady";

interface BreadcrumbItemType {
  label: string;
  href?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItemType[];
}

// Shown in the main content area until the sidebar has finished loading.
function AppContentSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 pt-4">
      <Skeleton className="h-8 w-56" />

      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      <Skeleton className="min-h-64 flex-1 rounded-xl" />
    </div>
  );
}

export default function AppLayout({
  children,
  breadcrumbs = [],
}: AppLayoutProps) {
  const [open, setOpen] = React.useState(false);

  // Same readiness check the sidebar uses, so the header and page content
  // leave their skeleton on the same render as the sidebar.
  const ready = useSidebarReady();

  return (
    <SidebarProvider>
      <AppSidebar />
      {/* h-svh + overflow-hidden: the inset is exactly one screen tall, so
          pages can no longer stretch it. Scrolling happens in the content
          area below instead of on the window. */}
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        {/* Header Layout */}
        <header className="sticky top-0 z-10 bg-background flex h-12 shrink-0 items-center justify-between border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          {/* Left Side: Sidebar Toggle & Breadcrumbs */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-7"
            />
            {ready ? (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, i) => (
                    <React.Fragment key={i}>
                      <BreadcrumbItem>
                        {i < breadcrumbs.length - 1 ? (
                          <BreadcrumbLink href={crumb.href ?? "#"}>
                            {crumb.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {i < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            ) : (
              <Skeleton className="h-4 w-40" />
            )}
          </div>

          {/* Right Side: Actions (Search & Connected Notifications) */}
          <div className="flex items-center gap-5">
            {ready ? (
              <>
                {/* Search Command Dialog Trigger */}
                <div>
                  <RealtimeClock className="text-sm tabular-nums text-foreground" />

                  <CommandDialog open={open} onOpenChange={setOpen}>
                    <Command>
                      <CommandInput placeholder="Type a command or search..." />
                      <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup heading="Navigation">
                          <CommandItem>
                            <HomeIcon /> <span>Home</span>
                            <CommandShortcut>⌘H</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <InboxIcon /> <span>Inbox</span>
                            <CommandShortcut>⌘I</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <FileTextIcon /> <span>Documents</span>
                            <CommandShortcut>⌘D</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <FolderIcon /> <span>Folders</span>
                            <CommandShortcut>⌘F</CommandShortcut>
                          </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Actions">
                          <CommandItem>
                            <PlusIcon /> <span>New File</span>
                            <CommandShortcut>⌘N</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <FolderPlusIcon /> <span>New Folder</span>
                            <CommandShortcut>⇧⌘N</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <CopyIcon /> <span>Copy</span>
                            <CommandShortcut>⌘C</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <ScissorsIcon /> <span>Cut</span>
                            <CommandShortcut>⌘X</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <ClipboardPasteIcon /> <span>Paste</span>
                            <CommandShortcut>⌘V</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <TrashIcon /> <span>Delete</span>
                            <CommandShortcut>⌫</CommandShortcut>
                          </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="View">
                          <CommandItem>
                            <LayoutGridIcon /> <span>Grid View</span>
                          </CommandItem>
                          <CommandItem>
                            <ListIcon /> <span>List View</span>
                          </CommandItem>
                          <CommandItem>
                            <ZoomInIcon /> <span>Zoom In</span>
                            <CommandShortcut>⌘+</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <ZoomOutIcon /> <span>Zoom Out</span>
                            <CommandShortcut>⌘-</CommandShortcut>
                          </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Account">
                          <CommandItem>
                            <UserIcon /> <span>Profile</span>
                            <CommandShortcut>⌘P</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <CreditCardIcon /> <span>Billing</span>
                            <CommandShortcut>⌘B</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <SettingsIcon /> <span>Settings</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                          </CommandItem>
                          <CommandItem>
                            <BellIcon /> <span>Notifications</span>
                          </CommandItem>
                          <CommandItem>
                            <HelpCircleIcon /> <span>Help & Support</span>
                          </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Tools">
                          <CommandItem>
                            <CalculatorIcon /> <span>Calculator</span>
                          </CommandItem>
                          <CommandItem>
                            <CalendarIcon /> <span>Calendar</span>
                          </CommandItem>
                          <CommandItem>
                            <ImageIcon /> <span>Image Editor</span>
                          </CommandItem>
                          <CommandItem>
                            <CodeIcon /> <span>Code Editor</span>
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </CommandDialog>
                </div>

                <NotificationCenter />
              </>
            ) : (
              <>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="size-8 rounded-full" />
              </>
            )}
          </div>
        </header>

        {/* Main Content Area: scrolls on its own when a page is taller than
            the screen. Pages that fit (like Chat) never trigger it.
            Stays in skeleton until the sidebar has finished loading. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4 pt-0">
          {ready ? (
            <PageTransition>{children}</PageTransition>
          ) : (
            <AppContentSkeleton />
          )}
        </div>
      </SidebarInset>

      {/* Renders all toast.success / toast.error calls */}
      <Toaster position="top-right" />
    </SidebarProvider>
  );
}