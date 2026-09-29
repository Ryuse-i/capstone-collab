"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  indicatorClassName,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & {
    indicatorClassName?: string
  }) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = React.useState<{
    top: number
    left: number
    width: number
    height: number
    opacity: number
  }>({ top: 0, left: 0, width: 0, height: 0, opacity: 0 })

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current
    if (!list) return

    const activeTrigger = list.querySelector<HTMLElement>(
      '[data-slot="tabs-trigger"][data-state="active"]'
    )

    if (!activeTrigger) {
      setIndicatorStyle((prev) =>
        prev.opacity === 0 ? prev : { ...prev, opacity: 0 }
      )
      return
    }

    const listRect = list.getBoundingClientRect()
    const triggerRect = activeTrigger.getBoundingClientRect()

    const next = {
      top: triggerRect.top - listRect.top,
      left: triggerRect.left - listRect.left,
      width: triggerRect.width,
      height: triggerRect.height,
      opacity: 1,
    }

    setIndicatorStyle((prev) => {
      const unchanged =
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.opacity === next.opacity

      return unchanged ? prev : next
    })
  }, [])

  React.useLayoutEffect(() => {
    updateIndicator()
  })

  React.useEffect(() => {
    const list = listRef.current
    if (!list) return

    const resizeObserver = new ResizeObserver(() => updateIndicator())
    resizeObserver.observe(list)

    const mutationObserver = new MutationObserver(() => updateIndicator())
    mutationObserver.observe(list, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
      childList: true,
    })

    window.addEventListener("resize", updateIndicator)

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener("resize", updateIndicator)
    }
  }, [updateIndicator])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {variant === "default" && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute z-0 rounded-md bg-background shadow-sm transition-all duration-300 ease-out dark:bg-input/30",
            indicatorClassName
          )}
          style={{
            top: indicatorStyle.top,
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity,
          }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-1 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground data-active:text-foreground dark:data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:-bottom-1.25 group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }