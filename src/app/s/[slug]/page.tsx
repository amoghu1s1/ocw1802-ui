import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { course, flattenEntries, getEntry } from "@/lib/course";
import ItemClient from "./ItemClient";

export async function generateStaticParams() {
  return flattenEntries(course).map(({ entry }) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = getEntry(slug);
  if (!data) return { title: "Not found" };
  return {
    title: data.entry.title,
    description: data.entry.summary.slice(0, 160),
  };
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = getEntry(slug);
  if (!data) notFound();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-text-faint">Loading…</div>}>
      <ItemClient slug={slug} />
    </Suspense>
  );
}
