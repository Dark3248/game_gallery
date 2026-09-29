import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import { migrateDb } from "@/db";
import { markInterruptedRuns } from "@/lib/sync/runner";

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

migrateDb();
markInterruptedRuns();
