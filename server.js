import express from "express";
const app = express();
app.use(express.json());

const TOKEN = process.env.TICKTICK_TOKEN;

async function tt(path) {
  const r = await fetch(`https://api.ticktick.com/open/v1${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!r.ok) throw new Error(`Fehler: ${r.status}`);
  return r.json();
}

app.post("/mcp", async (req, res) => {
  const { method, params, id } = req.body;

  if (method === "initialize") return res.json({ jsonrpc:"2.0", id, result: { protocolVersion:"2024-11-05", capabilities:{ tools:{} }, serverInfo:{ name:"TickTick", version:"1.0.0" } } });

  if (method === "tools/list") return res.json({ jsonrpc:"2.0", id, result: { tools: [
    { name:"get_projects", description:"Alle TickTick Projekte", inputSchema:{ type:"object", properties:{} } },
    { name:"get_all_tasks", description:"Alle offenen Aufgaben", inputSchema:{ type:"object", properties:{} } }
  ]}});

  if (method === "tools/call") {
    try {
      let data;
      if (params.name === "get_projects") {
        const p = await tt("/project");
        data = p.map(x => ({ id: x.id, name: x.name }));
      } else if (params.name === "get_all_tasks") {
        const projects = await tt("/project");
        data = [];
        for (const p of projects) {
          try {
            const d = await tt(`/project/${p.id}/data`);
            (d.tasks || []).filter(t => t.status === 0).forEach(t => data.push({ project: p.name, title: t.title, due: t.dueDate || null }));
          } catch(_) {}
        }
      }
      return res.json({ jsonrpc:"2.0", id, result:{ content:[{ type:"text", text: JSON.stringify(data, null, 2) }] } });
    } catch(e) {
      return res.json({ jsonrpc:"2.0", id, error:{ code:-32000, message: e.message } });
    }
  }

  res.json({ jsonrpc:"2.0", id, result:{} });
});

app.get("/", (req, res) => res.send("TickTick MCP läuft"));
app.listen(process.env.PORT || 3000, () => console.log("Server läuft"));
