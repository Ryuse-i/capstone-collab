interface GeneralNotificationProps {
  body: string;
}

export default function GeneralNotification({
  body,
}: GeneralNotificationProps) {
  return (
    <p className="whitespace-pre-wrap text-sm text-foreground">{body}</p>
  );
}
