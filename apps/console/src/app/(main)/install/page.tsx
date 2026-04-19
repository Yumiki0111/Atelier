"use client";

import { PageHeader } from "@/components/page-header/PageHeader";
import { LinkIssuancePanel } from "@/features/install/LinkIssuancePanel";
import { consolePageShellClass } from "@/lib/console-ui";

export default function InstallPage() {
  return (
    <div className={consolePageShellClass}>
      <PageHeader title="埋め込みスニペット" />
      <LinkIssuancePanel />
    </div>
  );
}
