// import { flushBuffer } from "./clickhouse/handleSinkRequest.js";
import { pause } from "./clickhouse/stores.js";
import { logger } from "./logger.js";
import * as buffer from "./buffer.js";

export async function exitHandler() {
    logger.info('[app]\t', `Server shutting down...`);
    pause(true);
    await buffer.flush(true);
    process.exit();
}

// do something when app is closing
process.on('beforeExit', exitHandler);

// catches ctrl+c event
process.on('SIGINT', exitHandler);

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler);
process.on('SIGUSR2', exitHandler);

// catches uncaught exceptions
process.on('uncaughtException', exitHandler);