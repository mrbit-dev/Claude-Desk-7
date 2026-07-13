![Claude Desk 7](public/logo.png)

# Claude Desk 7

**A comprehensive Web Dashboard to manage, monitor, and control Claude Code.**

Claude Desk 7 provides a visual interface that replaces the need to use Claude Code via CLI or IDE extensions. Everything you can do with Claude Code can be done through this web dashboard — no command line needed.

[🇻🇳 Tiếng Việt](README.md) | 🇬🇧 English

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Overview of all Claude Code activity: sessions, agents, projects, MCP servers |
| 📋 **Session Manager** | View, search, and manage all working sessions |
| 🤖 **Agent Monitor** | Real-time monitoring of agents and sub-agents with tree visualization |
| 🚀 **Launch** | Send prompts to Claude Code directly from the dashboard with real-time output |
| 🔧 **MCP Servers** | Manage MCP servers: add, edit, delete, health check |
| 📘 **Skills** | Create and manage Claude Code skills (slash commands) |
| 🧩 **Plugins** | Browse marketplace, install and uninstall plugins |
| ⚙️ **Settings** | Edit Claude Code configuration through the UI |
| 📁 **Projects** | View all projects that have used Claude Code |
| 📜 **Logs** | Real-time server logs and Claude process output |
| 🔐 **Auth** | Check authentication status, API keys, proxy configuration |

---

## 🚀 Installation & Usage

### Requirements
- **Node.js** 18+ (download from [nodejs.org](https://nodejs.org))
- **Claude Code** installed on your machine ([guide](https://docs.anthropic.com/en/docs/claude-code/installation))

### 1. Download
```bash
git clone https://github.com/mrbit-dev/Claude-Desk-7.git
cd Claude-Desk-7
```

Or download the ZIP and extract.

### 2. Run (Windows)
Open the folder and double-click **`start.bat`** — automatically installs + builds + runs.

### 3. Setup & Run via CLI
```bash
npm install
npm run build
npm start
```

Open browser: **http://localhost:3712**

### Or run in dev mode (hot-reload):
```bash
npm install
npm run dev
```

Open browser: **http://localhost:5173**

### 4. Run 24/7 Background (Windows)
Double-click **`start.bat`** — the server runs minimized in the background.

To stop: double-click **`stop.bat`**

---

## 🗂️ Project Structure

```
claude-desk/
├── server/              # Express + TypeScript backend
│   └── src/
│       ├── routes/      # API routes
│       ├── services/    # Business logic
│       ├── websocket/   # WebSocket handler
│       ├── utils/       # Utilities
│       └── types/       # TypeScript types
├── src/                 # React + Vite + Tailwind frontend
│   ├── pages/           # Page components
│   ├── components/      # UI components
│   ├── hooks/           # React hooks
│   ├── api/             # API client
│   └── store/           # Zustand state management
├── screenshots/         # Screenshots
└── scripts/             # Helper scripts
```

---

## ❓ FAQ

### How to install Claude Code?
```bash
npm install -g @anthropic-ai/claude-code
```
Or follow the guide at [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code/installation)

### Does Claude Desk 7 work on macOS/Linux?
Yes! Claude Desk 7 auto-detects the Claude Code executable path on all platforms.

### How to contribute?
Fork the repo, create a branch, commit, and submit a Pull Request!

---

## 📝 License

MIT
