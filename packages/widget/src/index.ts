// Widget entry point
// This will be built as a single widget.js file

import { initWidget } from "./widget";

// Auto-initialize when script loads
if (typeof window !== "undefined") {
  initWidget();
}
