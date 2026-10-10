"use client";

import React from "react";

const MONTHS = [
  "Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.",
  "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec.",
];

const pad = (n: number) => String(n).padStart(2, "0");

function formatNow(d: Date) {
  const month = MONTHS[d.getMonth()];
  const day = d.getDate(); // walang leading zero: 6, hindi 06
  const hours24 = d.getHours();
  const hh = hours24 % 12 || 12; // walang leading zero: 12:15, 9:05
  const mm = pad(d.getMinutes());
  const ampm = hours24 >= 12 ? "PM" : "AM";
  return `${month} ${day} : ${hh}:${mm} ${ampm}`;
}

export function RealtimeClock({ className }: { className?: string }) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <time
      dateTime={now?.toISOString()}
      className={className}
      suppressHydrationWarning
    >
      {now ? formatNow(now) : "--- -- : --:-- --"}
    </time>
  );
}