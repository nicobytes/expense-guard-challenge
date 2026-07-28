// Default Eve HTTP channel: session routes under /eve/v1/session* used by
// eve eval, the TUI, and SDK clients. Auth matches Eve's recommended local +
// Vercel OIDC defaults. The one-shot expense review endpoint lives in
// agent/channels/review.ts (POST /eve/v1/review).
import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";

export default eveChannel({
  auth: [localDev(), vercelOidc()],
});
