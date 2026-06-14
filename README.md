
# TickTick MCP Server für Poke

Ein MCP-Server der TickTick mit dem KI-Assistenten Poke verbindet.
Läuft kostenlos auf Render.com.

## Was kann er?

| Funktion | Poke Beispiel |
|----------|---------------|
| Alle Projekte anzeigen | "Zeig mir meine TickTick Projekte" |
| Alle offenen Aufgaben | "Was habe ich noch offen in TickTick?" |
| Aufgaben eines Projekts | "Zeig mir alle Aufgaben im Projekt Arbeit" |
| Aufgabe erstellen | "Erstell eine Aufgabe: Kunde anrufen, morgen fällig" |
| Aufgabe erledigen | "Markier die Aufgabe X als erledigt" |
| Aufgabe aktualisieren | "Ändere die Priorität von Aufgabe X auf hoch" |
| Aufgabe löschen | "Lösch die Aufgabe Y" |

> **Hinweis:** Die TickTick Inbox kann die API nicht lesen — das ist eine Einschränkung der offiziellen TickTick API.

## Setup

### 1. Render.com
- Service: `ticktick-mcp`
- Build Command: `npm install`
- Start Command: `node server.js`
- Environment Variable: `TICKTICK_TOKEN` = dein TickTick Access Token

### 2. Poke Integration
- Name: `TickTick`
- Server URL: `https://ticktick-mcp-nex3.onrender.com/mcp`

### 3. Token erneuern
Falls der Token abläuft: neuen Token in Postman holen und in Render unter
**Environment** → `TICKTICK_TOKEN` ersetzen → Save Changes.

## Technisches

- Node.js / Express
- TickTick Open API v1
- MCP Protokoll (Streamable HTTP, 2024-11-05)
- Hosted auf Render.com (Free Tier)
