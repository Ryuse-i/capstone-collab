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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

import {
  useGetUserNotifications,
  useMarkAsRead,
} from "@/hooks/useNotification";
import {
  useGetOneInvite,
  useAcceptInvite,
  useDeclineInvite,
} from "@/hooks/useProjectInvite";
import { useGetOneProject } from "@/hooks/useProject";
import type { NotificationResponse } from "@/types/notification";
import { useCurrentUser } from "@/hooks/useAuth";

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

  const [selectedNotification, setSelectedNotification] =
    React.useState<NotificationResponse | null>(null);

  const { data: user } = useCurrentUser();
  const { data: notifications = [], isLoading: notificationLoading } =
    useGetUserNotifications(user!.id);
  const { mutate: readMutate } = useMarkAsRead();
  const { mutate: acceptInvite, isPending: isAcceptPending } =
    useAcceptInvite();
  const { mutate: declineInvite, isPending: isDeclinePending } =
    useDeclineInvite();
  const { data: invite } = useGetOneInvite(selectedNotification?.invitation_id);
  const { data: project } = useGetOneProject(invite?.project_id ?? "");

  function markRead(id: string) {
    readMutate(id, {
      onSuccess: () => {
        console.log("Notification mark as read");
      },
      onError: (error) => {
        console.error("Failed to mark notification as read", error);
      },
    });
  }

  function handleNotificationClick(item: NotificationResponse) {
    setSelectedNotification(item);
    if (!item.is_read) {
      markRead(item.id);
    }
  }

  function handleAcceptInvite() {
    if (!selectedNotification?.invitation_id) return;

    acceptInvite(selectedNotification.invitation_id, {
      onSuccess: () => {
        setSelectedNotification(null);
      },
      onError: (error) => {
        console.error("Failed to accept invite", error);
      },
    });
  }

  function handleDeclineInvite() {
    if (!selectedNotification?.invitation_id) return;

    declineInvite(selectedNotification.invitation_id, {
      onSuccess: () => {
        setSelectedNotification(null);
      },
      onError: (error) => {
        console.error("Failed to decline invite", error);
      },
    });
  }

  const hasUnread = notifications?.some((item) => !item.is_read);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <PopoverHeader className="px-4 pt-4 pb-2 border-b">
                  <PopoverTitle className="text-base font-semibold">
                    Notifications
                  </PopoverTitle>
                  <PopoverDescription>
                    View and manage your notifications
                  </PopoverDescription>
                </PopoverHeader>

                <div className="max-h-64 overflow-y-auto">
                  {notificationLoading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Loading...
                    </div>
                  ) : notifications?.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      You currently have no notifications
                    </div>
                  ) : (
                    notifications?.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 p-4 border-b last:border-0 transition-colors text-sm relative ${
                          !item.is_read
                            ? "bg-muted/30 font-medium hover:bg-muted/50 cursor-pointer"
                            : "opacity-70 hover:bg-muted/30 cursor-pointer"
                        }`}
                        onClick={() => handleNotificationClick(item)}
                      >
                        {/* Little circle marker representing unread items */}
                        {!item.is_read && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        )}
                        <span
                          className={`flex-1 truncate pl-1 ${
                            !item.is_read
                              ? "text-foreground font-semibold"
                              : "text-muted-foreground"
                          }`}
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
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Notification Detail Dialog */}
        <Dialog
          open={!!selectedNotification}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedNotification(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            {selectedNotification && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <DialogTitle>{selectedNotification.title}</DialogTitle>
                    <Badge
                      variant={
                        selectedNotification.is_read ? "secondary" : "default"
                      }
                    >
                      {selectedNotification.is_read ? "Read" : "Unread"}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs">
                    {new Date(selectedNotification.created_at).toLocaleString(
                      [],
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {selectedNotification.body}
                </p>

                {project &&
                  selectedNotification.type === "project_invitation" && (
                    <div className="mt-3 rounded-md border p-3 bg-muted/5">
                      <h4 className="text-sm font-semibold">{project.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.description}
                      </p>
                    </div>
                  )}

                {/* inviter info removed — included in notification body */}

                {selectedNotification.type === "project_invitation" &&
                  invite?.status === "pending" && (
                    <div className="flex gap-2 pt-3">
                      <Button
                        type="button"
                        variant="default"
                        className="flex-1"
                        onClick={handleAcceptInvite}
                        disabled={isAcceptPending || isDeclinePending}
                      >
                        {isAcceptPending ? "Accepting..." : "Accept Invite"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handleDeclineInvite}
                        disabled={isAcceptPending || isDeclinePending}
                      >
                        {isDeclinePending ? "Declining..." : "Decline Invite"}
                      </Button>
                    </div>
                  )}
                {/* Show explicit status when invite already accepted or rejected */}
                {selectedNotification.type === "project_invitation" &&
                  invite?.status === "accepted" && (
                    <div className="mt-3 rounded-md border p-3 bg-green-50 text-sm text-green-800">
                      You have accepted this invitation.
                    </div>
                  )}
                {selectedNotification.type === "project_invitation" &&
                  invite?.status === "rejected" && (
                    <div className="mt-3 rounded-md border p-3 bg-red-50 text-sm text-red-800">
                      You have declined this invitation.
                    </div>
                  )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
