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

export const evmDepositTool = createTool({
  id: "evm-deposit",
  description:
    "Deposit supported tokens from a connected EVM blockchain to ZetaChain",
  inputSchema: z.object({
    address: z.string().describe("Recipient address on ZetaChain"),
    amount: z.string().describe("Amount of tokens to deposit"),
    sourceChain: z
      .string()
      .describe("Chain from which the tokens are being deposited"),
  }),
  execute: async ({ context, mastra }) => {
    return await evmDeposit(context, mastra);
  },
});

const evmDeposit = async (context: any, mastra: any) => {
  const agent = mastra.agents.blockchainAgent;
  const chains = await fetchSupportedChains();
  const selectedChain = (
    await agent.generate(
      `Given the list ${chains}, return the closest matching string to "${context.sourceChain}". Only return one exact string from the list without additional text or formatting.`
    )
  ).text;
  const rpc = getEndpoints("evm", selectedChain)[0].url;
  const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const client = new ZetaChainClient({ network: "testnet", signer });

  const tx = await client.evmDeposit({
    amount: context.amount,
    erc20: "",
    gatewayEvm: getAddress("gateway", selectedChain),
    receiver: signer.address,
    revertOptions: {
      callOnRevert: false,
      onRevertGasLimit: 0,
      revertAddress: signer.address,
      revertMessage: "",
    },
    txOptions: {
      gasLimit: 500000,
      gasPrice: BigInt(50000000000) as any,
    },
  });
  await tx.wait();
  return { hash: tx.hash };
};
