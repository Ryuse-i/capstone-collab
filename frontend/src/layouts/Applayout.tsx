// components/app-layout.tsx
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
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  LucideBellRing,
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

// Import your custom notification hooks
import {
  useGetMyNotifications,
  useMarkNotificationRead,
} from "@/hooks/useNotification";


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

  // ─── Notification Data Fetching & Mutations ─────────────────────────────────
  const { data: notifications = [], isLoading } = useGetMyNotifications();
  const { mutate: markAsRead } = useMarkNotificationRead();

  // Filter or count unread items safely
  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const unreadCount = unreadNotifications.length;

  const handleNotificationClick = (id: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead({ notifId: id });
    }
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = unreadNotifications.map((n) => n.id);
    if (unreadIds.length > 0) {
      markAsRead({ notifId: unreadIds }); // passes the whole array at once
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header Layout */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
                  <BreadcrumbItem key={i} className="md:block">
                    {i < breadcrumbs.length - 1 ? (
                      <>
                        <BreadcrumbLink href={crumb.href ?? "#"}>
                          {crumb.label}
                        </BreadcrumbLink>
                        <BreadcrumbSeparator className="hidden md:block" />
                      </>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
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

            {/* Notification Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <LucideBellRing className="h-4 w-4" />
                  {/* Dynamic red badge indicator shown only when there are unread notifications */}
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-destructive" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <PopoverHeader className="px-4 pt-4 pb-2 border-b">
                  <PopoverTitle className="text-base font-semibold">
                    Notifications
                  </PopoverTitle>
                  <PopoverDescription>
                    {isLoading
                      ? "Loading notifications..."
                      : `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`}
                  </PopoverDescription>
                </PopoverHeader>

                <div className="max-h-64 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No notifications found.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() =>
                          handleNotificationClick(item.id, item.is_read)
                        }
                        className={`flex flex-col gap-1 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer text-sm relative ${
                          !item.is_read
                            ? "bg-muted/30 font-medium"
                            : "opacity-70"
                        }`}
                      >
                        {/* Little circle marker representing unread items */}
                        {!item.is_read && (
                          <span className="absolute top-5 left-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                        )}
                        <div className="flex items-center justify-between pl-1">
                          <span
                            className={
                              !item.is_read
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {item.title}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal whitespace-nowrap ml-2">
                            {new Date(item.created_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 pl-1 font-normal">
                          {item.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {unreadCount > 0 && (
                  <div className="p-2 border-t text-center">
                    <Button
                      variant="ghost"
                      className="w-full text-xs h-8"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
