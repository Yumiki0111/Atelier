import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveDemoShareToken } from "@/lib/demo-share/resolveDemoShare";
import { ShareDemoClient } from "./ShareDemoClient";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await resolveDemoShareToken(token);
  if (!data) {
    return { title: "デモ | FIT&LOOK" };
  }
  return {
    title: `${data.productName} | 試着デモ`,
    description: "FIT&LOOK 仮想試着デモ",
  };
}

export default async function ShareDemoPage({ params }: Props) {
  const { token } = await params;
  const data = await resolveDemoShareToken(token);
  if (!data) {
    notFound();
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  const apiBaseUrl = host ? `${proto}://${host}` : "";

  return (
    <ShareDemoClient
      publicKey={data.publicKey}
      externalProductId={data.externalProductId}
      productName={data.productName}
      widgetJsPath="/widget.js"
      apiBaseUrl={apiBaseUrl}
    />
  );
}
