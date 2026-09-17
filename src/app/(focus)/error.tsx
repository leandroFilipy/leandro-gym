"use client";

import { ErrorView } from "@/components/layout/ErrorView";

export default function FocusError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView {...props} />;
}
