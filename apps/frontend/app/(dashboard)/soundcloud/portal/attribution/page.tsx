"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AttributionPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/soundcloud/portal");
  }, [router]);
  return null;
}
