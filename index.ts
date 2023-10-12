import config from "./src/config.js";

import { logger } from "./src/logger.js";
import { ping } from "./src/ping.js";
import { serve } from "./src/serve.js";
import { initializeManifest } from "./src/table-initialization.js";

logger.enable();
await ping();
await initializeManifest();
serve(config.PORT || 3000);
