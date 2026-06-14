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

// SSE Endpoint für Poke
app.get("/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const manifest = {
    type: "manifest",
    manifest: {
      schema_version: "v1",
      name: "TickTick",
      description: "Liest deine TickTick-Aufgaben und Projekte",
      tools: [
        {
          name: "get_projects",
          description: "Gibt alle deine TickTick-Projekte zurück",
          parameters: { type: "object", properties: {} },
        },
        {
          name: "get_all_tasks",
          description: "Gibt alle offenen Aufgaben zurück",
          parameters: { type: "object", properties: {} },
        },
        {
          name: "get_tasks",
          description: "Gibt Aufgaben eines bestimmten Projekts zurück",
          parameters: {
            type: "object",
            properties: {
              project_id: { type: "string", description: "Projekt ID" },
            },
            required: ["project_id"],
          },
        },
      ],
    },
  };

  res.write(`data: ${JSON.stringify(manifest)}\n\n`);
  req.on("close", () => res.end());
});

// Tool-Ausführung
app.post("/sse", async (req, res) => {
  const { tool, parameters } = req.body;
  try {
    if (tool === "get_projects") {
      const projects = await ticktick("/project");
      return res.json({ result: projects.map((p) => ({ id: p.id, name: p.name })) });
    }
    if (tool === "get_all_tasks") {
      const projects = await ticktick("/project");
      const allTasks = [];
      for (const project of projects) {
        try {
          const data = await ticktick(`/project/${project.id}/data`);
          (data.tasks || []).filter((t) => t.status === 0).forEach((t) =>
            allTasks.push({
              project: project.name,
              title: t.title,
              priority: ["keine", "niedrig", "mittel", "hoch"][t.priority] || "keine",
              due_date: t.dueDate || null,
            })
          );
        } catch (_) {}
      }
      return res.json({ result: allTasks });
    }
    if (tool === "get_tasks") {
      const data = await ticktick(`/project/${parameters.project_id}/data`);
      return res.json({
        result: (data.tasks || []).filter((t) => t.status === 0).map((t) => ({
          title: t.title,
          priority: ["keine", "niedrig", "mittel", "hoch"][t.priority] || "keine",
          due_date: t.dueDate || null,
        })),
      });
    }
    res.status(400).json({ error: "Unbekanntes Tool" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => res.send("TickTick MCP läuft ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
