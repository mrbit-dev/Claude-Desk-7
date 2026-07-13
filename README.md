![Claude Desk 7](public/logo.png)

# Claude Desk 7

**Web Dashboard toàn diện để quản lý, giám sát và điều khiển Claude Code.**

🇻🇳 Tiếng Việt | [🇬🇧 English](README.en.md)

Claude Desk 7 là giao diện trực quan thay thế hoàn toàn cho việc dùng Claude Code qua CLI hay extension IDE. Tất cả những gì bạn cần làm với Claude Code đều có thể thao tác qua giao diện web — không cần gõ lệnh, không cần nhớ cú pháp.

---

## ✨ Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 📊 **Dashboard** | Tổng quan toàn bộ Claude Code: sessions, agents, projects, MCP servers |
| 📋 **Session Manager** | Xem, tìm kiếm, quản lý tất cả phiên làm việc |
| 🤖 **Agent Monitor** | Giám sát agents, sub-agents theo thời gian thực, hiển thị cây phân cấp |
| 🚀 **Launch** | Gửi câu hỏi đến Claude Code ngay từ dashboard, xem output realtime |
| 🔧 **MCP Servers** | Quản lý MCP servers, thêm/sửa/xoá, kiểm tra health |
| 📘 **Skills** | Tạo và quản lý Claude Code skills (slash commands) |
| 🧩 **Plugins** | Duyệt marketplace, cài và gỡ plugins |
| ⚙️ **Settings** | Chỉnh sửa cấu hình Claude Code qua giao diện |
| 📁 **Projects** | Xem tất cả dự án đã dùng Claude Code |
| 📜 **Logs** | Xem log server và output Claude process realtime |
| 🔐 **Auth** | Kiểm tra trạng thái xác thực, API key, proxy |

---

## 🚀 Cài đặt & Chạy

### Yêu cầu
- **Node.js** 18+ (tải tại [nodejs.org](https://nodejs.org))
- **Claude Code** đã cài trên máy ([hướng dẫn](https://docs.anthropic.com/en/docs/claude-code/installation))

### 1. Tải về
```bash
git clone https://github.com/mrbit-dev/Claude-Desk-7.git
cd Claude-Desk-7
```

Hoặc download ZIP và giải nén.

### 2. Chạy (Windows)
Mở thư mục, double-click **`start.bat**` — tự động cài đặt + build + chạy.

### 3. Cài đặt & Chạy bằng lệnh
```bash
npm install
npm run build
npm start
```

Mở trình duyệt: **http://localhost:3712**

### Hoặc chạy dev mode (hot-reload):
```bash
npm install
npm run dev
```

Mở trình duyệt: **http://localhost:5173**

### 4. Chạy nền 24/7 (Windows)
Mở thư mục, double-click **`start.bat`** — server chạy ẩn dưới taskbar.

Để tắt: double-click **`stop.bat`**

> 💡 Hoặc dùng **PowerShell** chạy ẩn:
> ```powershell
> Start-Process -WindowStyle Hidden -FilePath "npx" -ArgumentList "tsx server/src/index.ts"
> ```

---

## 🗂️ Cấu trúc thư mục

```
claude-desk/
├── server/              # Backend Express + TypeScript
│   └── src/
│       ├── routes/      # API routes
│       ├── services/    # Business logic
│       ├── websocket/   # WebSocket handler
│       ├── utils/       # Tiện ích
│       └── types/       # TypeScript types
├── src/                 # Frontend React + Vite + Tailwind
│   ├── pages/           # Các trang
│   ├── components/      # UI components
│   ├── hooks/           # React hooks
│   ├── api/             # API client
│   └── store/           # Zustand state
├── screenshots/         # Ảnh chụp màn hình
└── scripts/             # Scripts phụ trợ
```

---

## ❓ FAQ

### Làm sao để cài Claude Code?
```bash
npm install -g @anthropic-ai/claude-code
```
Hoặc theo hướng dẫn tại [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code/installation)

### Claude Desk 7 có chạy được trên macOS/Linux không?
Có! Claude Desk 7 tự động phát hiện đường dẫn Claude Code trên tất cả nền tảng.

### Làm sao để đóng góp?
Fork repo, tạo branch, commit và tạo Pull Request!

---

## 📝 License

MIT
