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
  LucideSearch,
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
import { Button } from "@/components/ui/button";

import { useCurrentUser } from "@/hooks/useAuth";
import NotificationCenter from "@/components/notifications/NotificationCenter";

interface BreadcrumbItemType {
  label: string;
  href?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItemType[];
}

export default function AppLayout({
  children,
  breadcrumbs = [],
}: AppLayoutProps) {
  const [open, setOpen] = React.useState(false);

  const { data: user } = useCurrentUser();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        {/* Header Layout */}
        <header className="sticky top-0 z-10 bg-background flex h-12 shrink-0 items-center justify-between border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          {/* Left Side: Sidebar Toggle & Breadcrumbs */}
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-7"
            />
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
          </div>

          {/* Right Side: Actions (Search & Connected Notifications) */}
          <div className="flex items-center gap-2">
            {/* Search Command Dialog Trigger */}
            <div>
              <Button
                onClick={() => setOpen(true)}
                variant="outline"
                size="icon"
              >
                <LucideSearch className="h-4 w-4" />
              </Button>
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

            <NotificationCenter userId={user?.id} />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-w-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
