import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { ethers } from "ethers";
import { getAddress } from "@zetachain/protocol-contracts";
import { getEndpoints } from "@zetachain/networks";

const fetchSupportedChains = async () => {
  const rpcEndpoint = getEndpoints("cosmos-http", "zeta_testnet")[0].url;
  const response = await fetch(
    `${rpcEndpoint}/zeta-chain/observer/supportedChains`
  );
  const data = await response.json();

  return data.chains
    .filter((chain: any) => chain.vm === "evm" && chain.name !== "zeta_testnet")
    .map((chain: any) => chain.name);
};

const fetchCoins = async () => {
  const rpcEndpoint = getEndpoints("cosmos-http", "zeta_testnet")[0].url;

  const chainsResponse = await fetch(
    `${rpcEndpoint}/zeta-chain/observer/supportedChains`
  );
  const chainsData = await chainsResponse.json();

  const chainMap = chainsData.chains.reduce((acc: any, chain: any) => {
    acc[chain.chain_id] = chain.name;
    return acc;
  }, {});

  const coinsResponse = await fetch(
    `${rpcEndpoint}/zeta-chain/fungible/foreign_coins`
  );
  const coinsData = await coinsResponse.json();

  return coinsData.foreignCoins.map((coin: any) => ({
    ...coin,
    chain_name: chainMap[coin.foreign_chain_id] || "Unknown Chain",
  }));
};

export const crossChainSwapTool = createTool({
  id: "cross-chain-token-swap",
  description:
    "Deposits and swap tokens between different blockchains. Show swap details.",
  inputSchema: z.object({
    recipientAddress: z
      .string()
      .describe("The wallet address that will receive the swapped tokens."),
    amount: z
      .string()
      .describe("The amount of tokens to swap from the source blockchain."),
    sourceChain: z
      .string()
      .describe("Source chain, from chain, chain from which tokens are sent."),
    destinationToken: z
      .string()
      .describe(
        "Destination token symbol, target token, token to be received, to token."
      ),
    destinationChain: z
      .string()
      .describe(
        "Destination chain, target chain, blockchain to receive the tokens."
      ),
    sourceToken: z
      .string()
      .describe(
        "Source token symbol, input token, token to be swapped, from token."
      ),
  }),
  outputSchema: z.object({
    selectedChain: z.string(),
    amount: z.string(),
    target: z.string(),
    recipient: z.string(),
    hash: z.string(),
    sourceToken: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ context, mastra }) => {
    return await crossChainSwap(context, mastra);
  },
});

const crossChainSwap = async (context: any, mastra: any) => {
  let result = {
    selectedChain: "",
    amount: context.amount,
    target: "",
    recipient: context.recipientAddress,
    hash: "",
    error: "",
    sourceToken: "",
  };

  try {
    const agent = mastra.agents.blockchainAgent;
    const chains = await fetchSupportedChains();
    const coins = await fetchCoins();

    result.selectedChain = (
      await agent.generate(
        `
        Given the list of blockchain names: ${chains}, determine the best match for the provided input: "${context.sourceChain} ${context.sourceToken}".
        - Ensure that the output is a valid chain name from the list.
        - Return only the name of the selected blockchain as a single string.
        `
      )
    ).text;

    const rpc = getEndpoints("evm", result.selectedChain)[0]?.url;
    if (!rpc)
      throw new Error(
        `No RPC endpoint found for chain: ${result.selectedChain}`
      );

    const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const client = new ZetaChainClient({ network: "testnet", signer });

    const sourceToken = (
      await agent.generate(
        `
        From data: ${JSON.stringify(coins)}
        Select a token that matches a symbol ${context.sourceToken}
        On chain ${result.selectedChain}
        If ${context.sourceToken} is a native gas asset, return 0x0000000000000000000000000000000000000000
        If ${context.sourceToken} is not a native gas asset, return asset contract address
        Only 0x0000000000000000000000000000000000000000 or a valid contract address as a string without additional text or formatting.
        `
      )
    ).text;

    const destinationToken = (
      await agent.generate(
        `
        From data: ${JSON.stringify(coins)}
        Select a token that matches a symbol ${context.destinationToken}
        On chain ${context.destinationChain}
        Return ZRC-20 address without additional text or formatting.
        `
      )
    ).text;

    if (!destinationToken)
      throw new Error(
        `No valid destination token found for "${context.destinationToken}".`
      );
    if (sourceToken === undefined)
      throw new Error(
        `No valid source token found for "${context.sourceToken}".`
      );
    result.target = destinationToken;
    result.sourceToken =
      sourceToken === "0x0000000000000000000000000000000000000000"
        ? ""
        : sourceToken;
    result.hash = await client.evmDepositAndCall({
      amount: context.amount,
      erc20: result.sourceToken,
      gatewayEvm: getAddress("gateway", result.selectedChain as any),
      receiver: context.recipientAddress,
      types: ["address", "bytes", "bool"],
      values: [result.target, context.recipientAddress, "true"],
      revertOptions: {
        callOnRevert: false,
        onRevertGasLimit: 0,
        revertAddress: signer.address,
        revertMessage: "",
      },
      txOptions: {
        gasLimit: 1000000,
        gasPrice: BigInt(50000000000) as any,
      },
    });
  } catch (error: any) {
    console.error("Cross-chain swap error:", error);
    result.error = error.message || "An error occurred.";
  }

  return result;
};
