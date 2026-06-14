import express from "express";

const app = express();
app.use(express.json());

const TICKTICK_TOKEN = process.env.TICKTICK_TOKEN;
const BASE_URL = "https://api.ticktick.com/open/v1";

async function ticktick(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${TICKTICK_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`TickTick API Fehler: ${res.status}`);
  return res.json();
}

const TOOLS = [
  {
    name: "get_projects",
    description: "Gibt alle TickTick-Projekte zurück",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_all_tasks",
    description: "Gibt alle offenen Aufgaben aus allen Projekten zurück",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_tasks",
    description: "Gibt Aufgaben eines bestimmten Projekts zurück",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Die Projekt ID" }
      },
      required: ["project_id"]
    }
  }
];

app.post("/mcp", async (req, res) => {
  const { method, params, id } = req.body;

  if (method === "initialize") {
    return res.json({
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "TickTick", version: "1.0.0" }
      }
    });
  }

  if (method === "tools/list") {
    return res.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }

  if (method === "tools/call") {
    const tool = params.name;
    const args = params.arguments || {};
    try {
      let result;
      if (tool === "get_projects") {
        const projects = await ticktick("/project");
        result = projects.map((p) => ({ id: p.id, name: p.name }));
      } else if (tool === "get_all_tasks") {
