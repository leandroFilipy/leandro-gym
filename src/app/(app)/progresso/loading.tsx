import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </>
  );
}
