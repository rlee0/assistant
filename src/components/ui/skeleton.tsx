import { cn } from "@/lib/utils";
import { BG, BORDER } from "@/styles/constants";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(`${BG.accent} animate-pulse ${BORDER.rounded.md}`, className)}
      {...props}
    />
  );
}

export { Skeleton };
