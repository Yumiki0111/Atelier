import { notFound } from "next/navigation";
import { getPublicEmbedWidgetFitProps } from "@/lib/widget/getPublicEmbedWidgetFitProps";
import { EmbedWidgetFitClient } from "./EmbedWidgetFitClient";

type Props = {
  searchParams: Promise<{
    publicKey?: string;
    externalProductId?: string;
    addToCartUrl?: string;
    deferStagedReveal?: string;
  }>;
};

export default async function EmbedWidgetFitPage({ searchParams }: Props) {
  const sp = await searchParams;
  const publicKey = sp.publicKey ?? "";
  const externalProductId = sp.externalProductId ?? "";
  const addToCartUrl = typeof sp.addToCartUrl === "string" ? sp.addToCartUrl : "";
  const deferStagedReveal = sp.deferStagedReveal === "1" || sp.deferStagedReveal === "true";
  const data = await getPublicEmbedWidgetFitProps(publicKey, externalProductId);
  if (!data) {
    notFound();
  }
  return <EmbedWidgetFitClient {...data} addToCartUrl={addToCartUrl} deferStagedReveal={deferStagedReveal} />;
}
