import React from "react";
import { Skeleton } from "./skeleton";

export default function MovieSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="w-full aspect-[2/3] rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
