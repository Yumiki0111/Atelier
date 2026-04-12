"use client";

import { LinkIssuancePanel } from "@/features/install/LinkIssuancePanel";
import { PageHeader } from "@/components/page-header/PageHeader";

export default function InstallPage() {
  return (
    <div className="mx-auto w-full max-w-[120rem] space-y-8">
      <PageHeader title="埋め込みスニペット" />
      <LinkIssuancePanel />
    </div>
  );
}
