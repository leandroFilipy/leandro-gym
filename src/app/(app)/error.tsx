"use client";

import { ErrorView } from "@/components/layout/ErrorView";

export default function AppError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView {...props} />;
}
