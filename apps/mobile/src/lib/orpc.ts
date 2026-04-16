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

const nativeFetch = globalThis.fetch.bind(globalThis);

/**
 * React Native / whatwg-fetch can throw `RangeError` when building a `Response`, or
 * return status `0` / out-of-range statuses on failures. Normalize to a thrown Error
 * so oRPC and TanStack see a real failure instead of `undefined` bodies.
 */
const link = new RPCLink({
  url: rpcUrl,
  fetch: async (request, init) => {
    try {
      const response = await nativeFetch(request, init);
      const status = response.status;
      if (
        status === 0 ||
        Number.isNaN(status) ||
        status < 200 ||
        status > 599
      ) {
        throw new Error(
          `Cannot reach API at ${rpcUrl} (HTTP ${String(status)}). Check EXPO_PUBLIC_API_URL and that the server is running and reachable from this device.`,
        );
      }
      return response;
    } catch (err) {
      const hint = `Cannot reach API at ${rpcUrl}. Check EXPO_PUBLIC_API_URL and that the server is running.`;
      if (err instanceof RangeError) {
        throw new Error(`${hint} (${err.message})`);
      }
      if (err instanceof TypeError) {
        throw new Error(`${hint} (${err.message})`);
      }
      throw err;
    }
  },
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
