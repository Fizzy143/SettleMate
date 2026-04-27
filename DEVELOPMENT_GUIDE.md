# 朋友群分帳工具 - 開發指南

## 🎯 專案已完成初始化！

你的 Next.js + TypeScript + Tailwind CSS + Prisma + SQLite 專案已準備好開發。

---

## 📁 專案結構

```
/home/fizzy/Webapp/app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── groups/        # 群組管理 API
│   │   │   ├── members/       # 成員管理 API
│   │   │   ├── expenses/      # 支出記錄 API
│   │   │   └── settlements/   # 結算計算 API
│   │   ├── layout.tsx         # 根佈局
│   │   ├── page.tsx           # 首頁（待開發）
│   │   └── globals.css        # 全局樣式
│   ├── lib/
│   │   ├── db.ts              # Prisma 客戶端初始化
│   │   └── calculations.ts    # 結算計算邏輯（已實現）
│   ├── types/
│   │   └── index.ts           # TypeScript 類型定義
│   └── components/            # React 元件（待開發）
├── prisma/
│   ├── schema.prisma          # 資料庫 Schema（已配置）
│   ├── dev.db                 # SQLite 資料庫文件
│   └── migrations/            # 資料庫遷移記錄
├── .env                       # 環境變數
├── next.config.ts             # Next.js 配置
├── tailwind.config.ts         # Tailwind CSS 配置
├── tsconfig.json              # TypeScript 配置
└── package.json               # 依賴管理
```

---

## 🚀 快速開始

### 1. 啟動開發服務器

```bash
cd /home/fizzy/Webapp/app
npm run dev
```

訪問 http://localhost:3000 查看應用

### 2. 測試 API

所有 API 已實現且可用：

- **GET /api/groups** - 獲取所有群組
- **POST /api/groups** - 建立新群組
- **GET /api/groups/[id]** - 獲取群組詳情
- **PUT /api/groups/[id]** - 更新群組
- **DELETE /api/groups/[id]** - 刪除群組

- **GET /api/members?groupId=xxx** - 獲取群組成員
- **POST /api/members** - 添加新成員
- **GET /api/members/[id]** - 獲取成員詳情
- **PUT /api/members/[id]** - 更新成員
- **DELETE /api/members/[id]** - 移除成員

- **GET /api/expenses?groupId=xxx** - 獲取支出列表
- **POST /api/expenses** - 建立支出記錄
- **GET /api/expenses/[id]** - 獲取支出詳情
- **PUT /api/expenses/[id]** - 編輯支出
- **DELETE /api/expenses/[id]** - 刪除支出

- **GET /api/settlements?groupId=xxx** - 計算結算（誰付給誰多少）

### 3. 使用 Prisma Studio 查看資料庫

```bash
cd /home/fizzy/Webapp/app
npx prisma studio
```

---

## 📋 已實現的功能

### ✅ 後端 API 層
- [x] 群組 CRUD 操作
- [x] 成員 CRUD 操作
- [x] 支出記錄 CRUD 操作
- [x] 分攤計算（平均分攤 & 自訂金額）
- [x] 自動結算計算（誰該付給誰多少）

### ✅ 資料層
- [x] Prisma ORM 配置
- [x] SQLite 資料庫
- [x] 資料模型：Group, Member, Expense, ExpenseParticipant
- [x] 資料驗證和關係

### ✅ 工具函數
- [x] 結算計算邏輯（calculateMemberTotals、calculateSettlements）
- [x] 小數舍入函數（保留小數點後 2 位）

---

## 🛠️ 待開發的功能

### 前端頁面（MVP 階段優先級）
1. **群組主頁** - 顯示群組信息、成員列表、最近支出
2. **新增支出頁面** - 表單界面，包含分攤方式選擇
3. **支出列表** - 查看、編輯、刪除支出記錄
4. **結算頁面** - 顯示誰應該付給誰多少錢
5. **成員詳情頁** - 顯示個別成員的應收應付情況

### UI 元件（推薦優先開發）
- [ ] 群組選擇器 / 群組創建表單
- [ ] 成員卡片 / 成員列表
- [ ] 支出表單（平均分攤 & 自訂分攤）
- [ ] 支出卡片 / 支出列表
- [ ] 結算結果卡片
- [ ] 導航欄 / 底部導航

---

## 💡 開發建議

### 1. 開發流程建議
```
API 測試 → 構建 UI 元件 → 集成 API → 樣式調整 → 測試優化
```

### 2. 文件格式 / Payloads 示例

#### 建立群組
```json
POST /api/groups
{
  "name": "2024年朋友群"
}
```

#### 添加成員
```json
POST /api/members
{
  "groupId": "group-id-here",
  "name": "小王",
  "role": "朋友",
  "color": "bg-blue-200"
}
```

#### 建立支出（平均分攤）
```json
POST /api/expenses
{
  "groupId": "group-id-here",
  "date": "2025-04-23T12:00:00Z",
  "name": "聚餐",
  "amount": 900,
  "paidById": "payer-member-id",
  "notes": "新竹聚餐",
  "splitType": "equal",
  "participants": [
    { "memberId": "member-id-1" },
    { "memberId": "member-id-2" },
    { "memberId": "member-id-3" }
  ]
}
```

#### 建立支出（自訂分攤）
```json
POST /api/expenses
{
  "groupId": "group-id-here",
  "date": "2025-04-23T12:00:00Z",
  "name": "飲料",
  "amount": 150,
  "paidById": "payer-member-id",
  "notes": "店員飲料",
  "splitType": "custom",
  "participants": [
    { "memberId": "member-id-1", "amount": 50 },
    { "memberId": "member-id-2", "amount": 100 }
  ]
}
```

#### 計算結算
```json
GET /api/settlements?groupId=group-id-here

Response:
{
  "success": true,
  "data": {
    "memberTotals": [
      {
        "memberId": "id1",
        "paidTotal": 1000,
        "owedTotal": 500,
        "netAmount": 500
      }
    ],
    "settlements": [
      {
        "from": "member-id-2",
        "fromName": "小李",
        "to": "member-id-1",
        "toName": "小王",
        "amount": 250
      }
    ]
  }
}
```

---

## 🔧 常用命令

```bash
# 開發
npm run dev                 # 啟動開發服務器

# 編譯
npm run build              # 生產構建

# 執行
npm start                  # 執行生產版本

# Prisma
npx prisma studio         # 打開 Prisma Studio（可視化資料庫）
npx prisma migrate dev    # 創建新遷移
npx prisma generate       # 重新生成 Prisma Client
npx prisma db push        # 同步 schema 到資料庫

# Linting
npm run lint              # 運行 ESLint
```

---

## 📦 技術棧細節

| 層級 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **前端框架** | Next.js | 16.x | App Router、API 路由 |
| **語言** | TypeScript | 5.x | 類型安全 |
| **樣式** | Tailwind CSS | 3.x | Mobile-first CSS |
| **ORM** | Prisma | 5.x | 資料庫連接 |
| **資料庫** | SQLite | - | 本地開發 |
| **Node** | - | 20+ | 運行環境 |

---

## 🎨 設計建議

### Mobile-First 設計原則
- 優先設計移動版本（320px+）
- 再逐步適配平板（768px+）和桌面（1024px+）
- 使用 Tailwind 的響應式前綴：`sm:`、`md:`、`lg:`

### UI 建議
- 使用大按鈕，方便手指點擊（最小 44x44px）
- 清晰的顏色標記區分不同成員
- 簡潔的表格顯示支出和結算
- 視覺化的結算流程（誰付給誰）

---

## 🐛 遇到問題？

### 常見問題

1. **資料庫找不到**
   ```bash
   # 重新建立資料庫
   cd /home/fizzy/Webapp/app
   npx prisma migrate dev --name init
   ```

2. **Prisma types 錯誤**
   ```bash
   npx prisma generate
   ```

3. **環境變數未加載**
   - 確保 `.env` 文件存在且包含 `DATABASE_URL`

4. **端口 3000 被佔用**
   ```bash
   npm run dev -- -p 3001  # 使用其他端口
   ```

---

## 📞 下一步建議

1. **立即開始開發**：從首頁開始，構建基本導航
2. **優先完成群組 + 成員管理頁面**：這是基礎
3. **開發支出新增表單**：核心業務邏輯
4. **實現結算顯示**：MVP 的關鍵功能
5. **逐步美化 UI**：使用 Tailwind 優化樣式

專案已經準備好！🚀 開始開發吧！

如有任何問題或需要幫助，隨時告訴我！
