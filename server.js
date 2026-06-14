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

app.get("/sse", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Sende endpoint event
  res.write(`event: endpoint\ndata: ${JSON.stringify({ uri: "/messages" })}\n\n`);

  req.on("close", () => res.end());
});

app.post("/messages", async (req, res) => {
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
    return res.json({
      jsonrpc: "2.0", id,
      result: {
        tools: [
          {
            name: "get_projects",
            description: "Gibt alle TickTick-Projekte zurück",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "get_all_tasks",
            description: "Gibt alle offenen Aufgaben zurück",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "get_tasks",
            description: "Gibt Aufgaben eines Projekts zurück",
            inputSchema: {
              type: "object",
              properties: {
                project_id: { type: "string", description: "Projekt ID" }
              },
              required: ["project_id"]
            }
          }
        ]
      }
    });
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
        const projects = await ticktick("/project");
        const allTasks = [];
        for (const project of projects) {
          try {
            const data = await ticktick(`/project/${project.id}/data`);
            (data.tasks || []).filter((t) => t.status === 0).forEach((t) =>
              allTasks.push({
                project: project.name,
                title: t.title,
                priority: ["keine","niedrig","mittel","hoch"][t.priority] || "keine",
                due_date: t.dueDate || null,
              })
            );
          } catch (_) {}
        }
        result = allTasks;
      } else if (tool === "get_tasks") {
        const data = await ticktick(`/project/${args.project_id}/data`);
        result = (data.tasks || []).filter((t) => t.status === 0).map((t) => ({
          title: t.title,
          priority: ["keine","niedrig","mittel","hoch"][t.priority] || "keine",
          due_date: t.dueDate || null,
        }));
      }
      return res.json({
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
      });
    } catch (err) {
      return res.json({
        jsonrpc: "2.0", id,
        error: { code: -32000, message: err.message }
      });
    }
  }

  res.json({ jsonrpc: "2.0", id, result: {} });
});

app.get("/", (req, res) => res.send("TickTick MCP läuft ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
