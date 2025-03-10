import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { getBalancesTool, evmDepositTool, crossChainSwapTool } from "../tools";
import { Memory } from "@mastra/memory";
import { getPoolsTool } from "../tools/getPools";

export const blockchainAgent = new Agent({
  name: "Blockchain Agent",
  instructions: `
`,
  model: openai("gpt-4o"),
  memory: new Memory(),
  tools: { getBalancesTool, evmDepositTool, crossChainSwapTool, getPoolsTool },
});
