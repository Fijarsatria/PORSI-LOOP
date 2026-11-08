import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PageLoading } from "@/components/ui";
export const metadata = { title: "Ruang gerai", robots: { index: false } };
export default function Page() { return <Suspense fallback={<PageLoading/>}><AppShell role="seller"/></Suspense>; }
