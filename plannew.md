# 🚀 Claude Code HQ — Kế hoạch Nâng cấp Toàn diện

## Context

Claude Desk 7 hiện là dashboard **giám sát** — xem sessions, projects, MCP servers, skills. Mục tiêu là biến nó thành **Claude Code HQ**: trung tâm điều khiển **tương tác + phân tích + quản lý** toàn diện cho Claude Code.

## Chiến lược

| Phase | Nội dung | Sprint | Files |
|---|---|---|---|
| **Phase 1** | Persistent Chat + MCP Tools/Logs | Sprint 1-3 | ~20 files |
| **Phase 2** | Token Dashboard + Git + Skill Editor + Super Search | Sprint 4-5 | ~15 files |
| **Phase 3** | PWA + Command Palette + Widgets + Plugin System | Sprint 6-8 | ~20 files |

## Phase 1 — Core Experience (🔥 Quan trọng nhất)

### Sprint 1: Foundation Infrastructure

**Mục tiêu:** Thiết lập types, WS protocol mở rộng, Zustand store mới.

| File | Action |
|---|---|
| `server/src/types/claude.ts` | Thêm ChatSession, ChatTurn, ChatMessage, MCPTool types, WS event types mới (chat:*, mcp:*) |
| `src/types/claude.ts` | Mirror chat/MCP types trên frontend |
| `src/types/api.ts` | Thêm chat API response types |
| `src/store/chatStore.ts` | **New** — Zustand store cho active chat session state (tabs, history) |
| `src/hooks/useWebSocket.ts` | Verify generic subscribe/unsubscribe pattern (không cần thay đổi) |

### Sprint 2: Persistent Chat 🗣️

**Mục tiêu:** Biến Launch từ one-shot thành conversational chat đa lượt.

**Kiến trúc:** Mỗi lượt chat là một `claude --print <prompt + context>`. Server tích lũy transcript thành context cho lượt sau. UI chat giống ChatGPT, render bằng MessageBubble có sẵn.

**New files (9):**
| File | Chức năng |
|---|---|
| `server/src/services/chat-store.ts` | CRUD chat session, quản lý turn, persist ~/.claude/desk-chats.json |
| `server/src/utils/context-builder.ts` | Xây prompt từ lịch sử hội thoại, truncate khi quá 80k chars |
| `server/src/routes/chat.ts` | 6 endpoints: POST/GET/DELETE sessions, POST turn, POST input |
| `src/hooks/useChat.ts` | React Query hooks + WS subscription cho live turns |
| `src/components/chat/ChatSidebar.tsx` | Sidebar danh sách chat sessions |
| `src/components/chat/ChatMessageList.tsx` | Thread messages, auto-scroll, thinking/tool-calls inline |
| `src/components/chat/ChatInput.tsx` | Input bar, Enter gửi, Shift+Enter xuống dòng |
| `src/components/chat/ChatTabBar.tsx` | Tab multiple sessions |
| `src/pages/Chat.tsx` | Page chính: `/chat` |

**Modified files (4):**
| File | Thay đổi |
|---|---|
| `server/src/index.ts` | Register chat router: `app.use('/api/chat', chatRouter)` |
| `src/App.tsx` | Add route `/chat` → Chat page |
| `src/components/layout/Sidebar.tsx` | Add "Chat" nav item |
| `src/components/layout/Header.tsx` | Add chat badge |

### Sprint 3: MCP Tool Explorer + Realtime Logs 🔌

**Mục tiêu:** Xem tools từ MCP servers + log realtime + test tool playground.

**New files (1):**
| File | Chức năng |
|---|---|
| `server/src/services/mcp-tools.ts` | JSON-RPC `tools/list`, cache 60s, `tools/call` playground |

**Modified files (4):**
| File | Thay đổi |
|---|---|
| `server/src/routes/mcps.ts` | Add `GET /:name/tools`, `POST /:name/tools/:tool/call` |
| `server/src/services/mcp-store.ts` | Thêm ring buffer log per MCP server process |
| `server/src/websocket/handler.ts` | Add `mcp:log` subscription type |
| `src/pages/MCPs.tsx` | Mỗi ServerCard có: collapsible tool list, log panel, playground modal |
| `src/hooks/useMCPs.ts` | Add `useMCPTools()`, `useCallTool()` hooks |

---

## Phase 2 — Analytics & Intelligence

### Sprint 4: Token Dashboard + Git + Skill Editor

**Token Dashboard** — Parse `message.usage` từ transcript JSONL, aggregate:
- `server/src/routes/dashboard.ts`: `GET /api/dashboard/token-usage?range=7d|30d|all`
- `src/components/dashboard/TokenUsageChart.tsx`: Recharts bar chart + pie chart + cost estimate
- `src/pages/Dashboard.tsx`: Thêm token usage section

**Git Integration** — `execSync` git commands trong project path:
- `server/src/services/git-service.ts`: GitInfo { branch, lastCommit, status }
- `server/src/routes/projects.ts`: `GET /:slug/git-info`
- `src/pages/Projects.tsx`: Hiển thị branch, commit, modified files trên mỗi card

**Skill Editor Inline** — Edit SKILL.md ngay trên dashboard:
- `server/src/routes/skills.ts`: `GET/PUT /:name/content`
- `server/src/services/skills-store.ts`: `getSkillContent()`, `updateSkillContent()`
- `src/pages/Skills.tsx`: Click skill → inline textarea editor + Save/Cancel

### Sprint 5: Global Super Search + Command Palette 🔍

**Super Search** — Tìm kiếm unified: sessions, projects, skills, MCP, transcripts, settings:
- `server/src/services/search-service.ts`: searchAll() → ranked results
- `server/src/routes/search.ts`: `GET /api/search?q=...`
- `src/components/command-palette/CommandPalette.tsx`: Modal overlay, as-you-type, ↑↓ Enter

**Command Palette:**
- Ctrl+K mở overlay search
- Results grouped by type (sessions, projects, skills, MCP...)
- Keyboard navigation, Enter để chọn
- `src/App.tsx`: Mount CommandPalette global
- `src/components/layout/Header.tsx`: Ctrl+K → CommandPalette thay vì AskClaudeModal

---

## Phase 3 — UX Đẳng Cấp

### Sprint 6: PWA 📱
- `vite.config.ts`: Add `vite-plugin-pwa` — manifest, service worker
- `index.html`: theme-color, apple-mobile-web-app-capable, manifest link
- `src/main.tsx`: registerSW, update notification
- `public/icons/icon-{192,512}.png`

### Sprint 7: Dashboard Widgets (Drag & Drop)
- `npm install react-grid-layout`
- `src/store/widgetStore.ts`: Zustand store cho layout
- `src/components/dashboard/WidgetGrid.tsx`: react-grid-layout wrapper
- 8 widgets: StatCards, TokenChart, RecentSessions, MCPStatus, ActiveAgents, ProjectActivity, QuickActions, ClaudeStatus
- Layout persisted to localStorage

### Sprint 8: Plugin System 🔌
- `server/src/services/desk-plugin-store.ts`: Scan ~/.claude/desk-plugins/<name>/plugin.json
- `server/src/routes/desk-plugins.ts`: List/detail plugins
- `src/services/plugin-registry.ts`: Load plugin components động
- `src/App.tsx` + `Sidebar.tsx`: Dynamic routes + nav items từ plugins

---

## Tổng kết Files

### New files (~25)
```
server/src/services/chat-store.ts
server/src/services/mcp-tools.ts
server/src/services/search-service.ts
server/src/services/git-service.ts
server/src/services/desk-plugin-store.ts
server/src/utils/context-builder.ts
server/src/routes/chat.ts
server/src/routes/search.ts
src/store/chatStore.ts
src/store/hotkeyStore.ts
src/store/widgetStore.ts
src/hooks/useChat.ts
src/hooks/useHotkey.ts
src/components/chat/ChatSidebar.tsx
src/components/chat/ChatMessageList.tsx
src/components/chat/ChatInput.tsx
src/components/chat/ChatTabBar.tsx
src/pages/Chat.tsx
src/components/command-palette/CommandPalette.tsx
src/components/dashboard/TokenUsageChart.tsx
src/components/dashboard/WidgetGrid.tsx
src/components/dashboard/widgets/*.tsx
src/services/plugin-registry.ts
public/icons/icon-{192,512}.png
```

### Modified files (~25)
```
server/src/index.ts
server/src/types/claude.ts
server/src/websocket/handler.ts
server/src/routes/mcps.ts
server/src/services/mcp-store.ts
server/src/routes/dashboard.ts
server/src/routes/projects.ts
server/src/routes/skills.ts
server/src/services/skills-store.ts
src/types/claude.ts
src/types/api.ts
src/App.tsx
src/components/layout/Sidebar.tsx
src/components/layout/Header.tsx
src/pages/MCPs.tsx
src/pages/Dashboard.tsx
src/pages/Projects.tsx
src/pages/Skills.tsx
src/hooks/useMCPs.ts
vite.config.ts
index.html
src/main.tsx
package.json
```

---

## Verification

1. **Chat**: Tạo session → gõ prompt → Claude trả lời → gõ tiếp → context được giữ → check transcript file được tạo
2. **MCP Tools**: Vào MCP page → click Tools trên server → thấy danh sách tools → click "Try it" → test tool call
3. **MCP Logs**: Health check server → thấy log output realtime trong collapsible panel
4. **Token Dashboard**: Vào Dashboard → thấy biểu đồ tokens theo ngày, cost estimate
5. **Git**: Vào Projects → thấy branch, commit, status trên mỗi card
6. **Skill Editor**: Click skill → edit SKILL.md → Save → mở file kiểm tra
7. **Super Search**: Ctrl+K → gõ keyword → thấy kết quả từ nhiều nguồn → Enter để navigate
8. **PWA**: Build → check manifest.json → install app → offline cache hoạt động
9. **Widgets**: Dashboard → drag widget → refresh → layout vẫn giữ
10. **Plugins**: Tạo plugin manifest → restart → thấy trong sidebar → click hoạt động
