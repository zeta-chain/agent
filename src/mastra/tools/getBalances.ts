import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { ZetaChainClient } from "@zetachain/toolkit/client";

export const getBalancesTool = createTool({
  id: "get-token-balances",
  description:
    "Get token balances of a wallet address across all blockchains. Format output in a table.",
  inputSchema: z.object({
    address: z.string().describe("Address"),
  }),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    return await getBalances(context.address);
  },
});

const getBalances = async (address: string) => {
  const client = new ZetaChainClient({ network: "testnet" });
  const balances = await client.getBalances({
    evmAddress: address,
  });
  return balances;
};
