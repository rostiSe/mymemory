import { appContract } from "@mymemory/shared";
import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import Constants from "expo-constants";

let rpcUrl = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/api`
  : "http://localhost:8787/api";

// In development, if the URL is localhost, replace it with the actual host IP
// so that physical devices and Android emulators can reach the Hono server.
if (__DEV__ && rpcUrl.includes("localhost")) {
  const hostUri = Constants?.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(":")[0];
    rpcUrl = rpcUrl.replace("localhost", hostIp);
  }
}

const link = new RPCLink({
  url: rpcUrl,
  interceptors: [
    onError((error) => {
      if (__DEV__) {
        console.error("[orpc]", error);
      }
    }),
  ],
});

export const orpcClient: ContractRouterClient<typeof appContract> =
  createORPCClient(link);

/** TanStack Query helpers: `useQuery(orpc.ping.queryOptions({ input: undefined }))`, etc. */
export const orpc = createTanstackQueryUtils(orpcClient);
