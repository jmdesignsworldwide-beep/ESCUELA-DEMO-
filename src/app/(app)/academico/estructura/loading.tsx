import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function EstructuraLoading() {
  return (
    <div>
      <div className="space-y-2 pb-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96" />
      </div>
      <Skeleton className="mb-4 h-10 w-full max-w-xl rounded-lg" />
      <Card className="p-6">
        <Skeleton className="mb-4 h-6 w-56" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
