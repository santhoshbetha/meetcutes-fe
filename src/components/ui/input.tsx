import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm px-4 py-3 text-base font-medium transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:border-primary/60 focus-visible:shadow-lg hover:border-border hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
