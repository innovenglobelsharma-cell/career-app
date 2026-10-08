import { WebSocket } from "ws";

const baseUrl = process.argv[2] || process.env.API_TEST_URL || "http://localhost:3001";
const origin = process.env.APP_URL || "http://localhost:5173";

async function login(email) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Demo@123" }),
  });
  if (!response.ok) throw new Error(await response.text());
  return {
    cookie: response.headers.get("set-cookie").split(";")[0],
    body: await response.json(),
  };
}

const seeker = await login("arjun.mehta@careerly.demo");
const recruiter = await login("maya.chen@careerly.demo");
const websocketUrl = baseUrl.replace(/^http/, "ws") + "/ws";
const socket = new WebSocket(websocketUrl, { headers: { Cookie: seeker.cookie, Origin: origin } });
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const incoming = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("WebSocket message timeout")), 5_000);
  socket.on("message", (data) => {
    const event = JSON.parse(String(data));
    if (event.type === "message.created") { clearTimeout(timeout); resolve(event); }
  });
});
const response = await fetch(`${baseUrl}/api/messages`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: recruiter.cookie },
  body: JSON.stringify({ toUserId: seeker.body.user.id, body: `Realtime verification ${new Date().toISOString()}` }),
});
if (!response.ok) throw new Error(await response.text());
const event = await incoming;
const history = await fetch(`${baseUrl}/api/messages`, { headers: { Cookie: seeker.cookie } }).then((result) => result.json());
const stored = history.messages.find((message) => message.id === event.message.id);
console.log(`WS=${event.type} STORED=${Boolean(stored)} HASH_VALID=${stored?.integrityValid === true}`);
socket.close();
