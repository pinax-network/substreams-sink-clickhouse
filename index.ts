import { ping } from "./src/commands/ping.js";
import config from "./src/config.js";

import { logger } from "./src/logger.js";
import { initializeManifest } from "./src/manifest.js";
import { serveSink } from "./src/sink.js";

logger.enable();
await ping();
await initializeManifest();
serveSink(config.PORT || 3000);
