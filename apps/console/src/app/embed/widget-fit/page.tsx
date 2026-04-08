import { notFound } from "next/navigation";
import { getPublicEmbedWidgetFitProps } from "@/lib/widget/getPublicEmbedWidgetFitProps";
import { EmbedWidgetFitClient } from "./EmbedWidgetFitClient";

type Props = { searchParams: Promise<{ publicKey?: string; externalProductId?: string }> };

export default async function EmbedWidgetFitPage({ searchParams }: Props) {
  const sp = await searchParams;
  const publicKey = sp.publicKey ?? "";
  const externalProductId = sp.externalProductId ?? "";
  const data = await getPublicEmbedWidgetFitProps(publicKey, externalProductId);
  if (!data) {
    notFound();
  }
  return <EmbedWidgetFitClient {...data} />;
}
