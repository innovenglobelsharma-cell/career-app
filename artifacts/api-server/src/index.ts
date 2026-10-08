import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { setupMessageWebSocket } from "./lib/message-hub";

const rawPort = process.env["PORT"] ?? "3001";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
setupMessageWebSocket(server);

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
