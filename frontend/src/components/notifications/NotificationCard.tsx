import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  OctagonAlertIcon,
  XIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NotificationCardType =
  | "context_updated"
  | "needs_info"
  | "task_completed"
  | "error";

export interface NotificationCardAction {
  label: string;
  onClick: () => void;
}

export interface NotificationCardProps {
  type: NotificationCardType;
  title: string;
  description: string;
  timestamp: string;
  actions: NotificationCardAction[];
  onDismiss: () => void;
}

const notificationStyles = {
  context_updated: {
    icon: InfoIcon,
    iconClassName: "bg-blue-500/15 text-blue-400",
    glowClassName: "before:bg-blue-400",
  },
  needs_info: {
    icon: AlertTriangleIcon,
    iconClassName: "bg-amber-400/15 text-amber-300",
    glowClassName: "before:bg-amber-400",
  },
  task_completed: {
    icon: CheckCircle2Icon,
    iconClassName: "bg-emerald-400/15 text-emerald-300",
    glowClassName: "before:bg-emerald-400",
  },
  error: {
    icon: OctagonAlertIcon,
    iconClassName: "bg-red-400/15 text-red-300",
    glowClassName: "before:bg-red-400",
  },
} satisfies Record<
  NotificationCardType,
  { icon: typeof InfoIcon; iconClassName: string; glowClassName: string }
>;

export default function NotificationCard({
  type,
  title,
  description,
  timestamp,
  actions,
  onDismiss,
}: NotificationCardProps) {
  const {
    icon: StatusIcon,
    iconClassName,
    glowClassName,
  } = notificationStyles[type];

  return (
    <Card
      className={cn(
        "relative gap-0 overflow-hidden py-0 before:pointer-events-none before:absolute before:-top-20 before:left-1/2 before:h-20 before:w-1/2 before:-translate-x-1/2 before:rounded-full before:opacity-10 before:blur-2xl before:content-[''] dark:before:opacity-20",
        glowClassName,
      )}
    >
      <CardContent className="relative z-10 p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
              iconClassName,
            )}
          >
            <StatusIcon className="size-3.5" strokeWidth={2.5} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-sm font-semibold leading-5 text-(--notification-card-foreground)">
                {title}
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="-mr-1 -mt-1 shrink-0 text-zinc-500 hover:bg-white/10 hover:text-white"
                aria-label={`Dismiss ${title}`}
                onClick={onDismiss}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>

            <CardDescription className="mt-1 line-clamp-2 text-xs leading-4 text-(--notification-card-muted)">
              {description}
            </CardDescription>
            <p className="mt-2 text-[11px] text-zinc-500">{timestamp}</p>

            {actions.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-x-2 text-[11px]">
                {actions.map((action, index) => (
                  <span
                    key={action.label}
                    className="inline-flex items-center gap-2"
                  >
                    {index > 0 && <span className="text-zinc-600">·</span>}
                    <button
                      type="button"
                      className="text-(--notification-card-foreground) underline decoration-zinc-600 underline-offset-2 transition-colors hover:text-gray-300 hover:decoration-zinc-100"
                      onClick={action.onClick}
                    >
                      {action.label}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
