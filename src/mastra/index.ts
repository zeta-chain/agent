import { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@mastra/core/logger";

import { blockchainAgent } from "./agents";

export const mastra = new Mastra({
  agents: { blockchainAgent },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});
