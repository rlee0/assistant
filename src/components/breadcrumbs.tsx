import Link from "next/link";
import { clsx } from "clsx";

type Segment = {
  label: string;
  href?: string;
  active?: boolean;
};

export function Breadcrumbs({ segments }: { segments: Segment[] }) {
  return (
    <nav className="text-sm text-zinc-500" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const content = segment.href && !segment.active ? (
            <Link
              className="text-zinc-600 hover:text-zinc-900"
              href={segment.href}
            >
              {segment.label}
            </Link>
          ) : (
            <span className={clsx(segment.active && "text-zinc-900")}>
              {segment.label}
            </span>
          );
          return (
            <li key={segment.label} className="flex items-center gap-2">
              {content}
              {!isLast && <span className="text-zinc-400">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
