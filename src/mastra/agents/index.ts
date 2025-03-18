import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { getBalancesTool, evmDepositTool, crossChainSwapTool, getPoolsTool } from "../tools";
import { Memory } from "@mastra/memory";

export const blockchainAgent = new Agent({
  name: "Blockchain Agent",
  instructions: `
`,
  model: openai("gpt-4o"),
  memory: new Memory(),
  tools: { getBalancesTool, evmDepositTool, crossChainSwapTool, getPoolsTool },
});
