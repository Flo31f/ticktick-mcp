import express from "express";
const app = express();
app.use(express.json());

const TOKEN = process.env.TICKTICK_TOKEN;
const BASE = "https://api.ticktick.com/open/v1";

async function tt(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok) throw new Error(`Fehler ${r.status}: ${await r.text()}`);
  if (r.status === 204) return { success: true };
  return r.json();
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
    name: "get_tasks_by_project",
    description: "Gibt alle Aufgaben eines bestimmten Projekts zurück",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Die Projekt-ID" }
      },
      required: ["project_id"]
    }
  },
  {
    name: "create_task",
    description: "Erstellt eine neue Aufgabe in TickTick",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titel der Aufgabe" },
        project_id: { type: "string", description: "Projekt-ID (optional)" },
        due_date: { type: "string", description: "Fälligkeitsdatum z.B. 2026-06-20T10:00:00+0000 (optional)" },
        priority: { type: "number", description: "Priorität: 0=keine, 1=niedrig, 3=mittel, 5=hoch (optional)" },
        content: { type: "string", description: "Beschreibung der Aufgabe (optional)" }
      },
      required: ["title"]
    }
  },
  {
    name: "complete_task",
    description: "Markiert eine Aufgabe als erledigt",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Projekt-ID der Aufgabe" },
        task_id: { type: "string", description: "ID der Aufgabe" }
      },
      required: ["project_id", "task_id"]
    }
  },
  {
    name: "update_task",
    description: "Aktualisiert eine bestehende Aufgabe",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "ID der Aufgabe" },
        project_id: { type: "string", description: "Projekt-ID der Aufgabe" },
        title: { type: "string", description: "Neuer Titel (optional)" },
        due_date: { type: "string", description: "Neues Fälligkeitsdatum (optional)" },
        priority: { type: "number", description: "Neue Priorität: 0=keine, 1=niedrig, 3=mittel, 5=hoch (optional)" },
        content: { type: "string", description: "Neue Beschreibung (optional)" }
      },
      required: ["task_id", "project_id"]
    }
  },
  {
    name: "delete_task",
    description: "Löscht eine Aufgabe dauerhaft",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Projekt-ID der Aufgabe" },
        task_id: { type: "string", description: "ID der Aufgabe" }
      },
      required: ["project_id", "task_id"]
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
        serverInfo: { name: "TickTick", version: "2.0.0" }
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
      let data;

      if (tool === "get_projects") {
        const p = await tt("/project");
        data = p.map(x => ({ id: x.id, name: x.name, color: x.color }));

      } else if (tool === "get_all_tasks") {
        const projects = await tt("/project");
        data = [];
        for (const p of projects) {
          try {
            const d = await tt(`/project/${p.id}/data`);
            (d.tasks || []).filter(t => t.status === 0).forEach(t => data.push({
              id: t.id,
              project_id: p.id,
              project: p.name,
              title: t.title,
              priority: ["keine","niedrig","","mittel","","hoch"][t.priority] || "keine",
              due: t.dueDate || null,
              content: t.content || ""
            }));
          } catch(_) {}
        }

      } else if (tool === "get_tasks_by_project") {
        const d = await tt(`/project/${args.project_id}/data`);
        data = (d.tasks || []).filter(t => t.status === 0).map(t => ({
          id: t.id,
          project_id: args.project_id,
          title: t.title,
          priority: ["keine","niedrig","","mittel","","hoch"][t.priority] || "keine",
          due: t.dueDate || null,
          content: t.content || ""
        }));

      } else if (tool === "create_task") {
        const body = { title: args.title };
        if (args.project_id) body.projectId = args.project_id;
        if (args.due_date) body.dueDate = args.due_date;
        if (args.priority !== undefined) body.priority = args.priority;
        if (args.content) body.content = args.content;
        data = await tt("/task", "POST", body);

      } else if (tool === "complete_task") {
        data = await tt(`/project/${args.project_id}/task/${args.task_id}/complete`, "POST");

      } else if (tool === "update_task") {
        const body = { id: args.task_id, projectId: args.project_id };
        if (args.title) body.title = args.title;
        if (args.due_date) body.dueDate = args.due_date;
        if (args.priority !== undefined) body.priority = args.priority;
        if (args.content) body.content = args.content;
        data = await tt(`/task/${args.task_id}`, "POST", body);

      } else if (tool === "delete_task") {
        data = await tt(`/task/${args.project_id}/${args.task_id}`, "DELETE");
      }

      return res.json({
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }
      });

    } catch(e) {
      return res.json({
        jsonrpc: "2.0", id,
        error: { code: -32000, message: e.message }
      });
    }
  }

  res.json({ jsonrpc: "2.0", id, result: {} });
});

app.get("/", (req, res) => res.send("TickTick MCP v2 läuft ✅"));
app.listen(process.env.PORT || 3000, () => console.log("Server läuft"));
