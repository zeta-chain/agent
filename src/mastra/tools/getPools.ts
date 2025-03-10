import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { ZetaChainClient } from "@zetachain/toolkit/client";

export const getPoolsTool = createTool({
  id: "get-liquidity-pools",
  description:
    "Get liquidity pool information on ZetaChain. Format output in a table.",
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    return await getPools();
  },
});

const getPools = async () => {
  const client = new ZetaChainClient({ network: "testnet" });
  const balances = await client.getPools();
  return balances;
};
