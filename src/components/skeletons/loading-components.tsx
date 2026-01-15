import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import { memo } from "react";

export const LoadingCard = memo(function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-48" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-64" />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </CardContent>
    </Card>
  );
});

export const LoadingTableRow = memo(function LoadingTableRow() {
  return (
    <tr className="border-b">
      <td className="p-4">
        <Skeleton className="h-8 w-8 rounded-full" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-32" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="p-4">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="p-4">
        <Skeleton className="h-8 w-20" />
      </td>
    </tr>
  );
});

interface LoadingCardGridProps {
  readonly count?: number;
}

export const LoadingCardGrid = memo<LoadingCardGridProps>(function LoadingCardGrid({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <LoadingCard key={`loading-card-${i}`} />
      ))}
    </div>
  );
});

export const LoadingList = memo(function LoadingList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={`loading-item-${i}`} className="flex gap-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
});
