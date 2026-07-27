# 🚀 Vercel 部署指南

## 預部署清單

- [x] 更新 Prisma schema 支持 PostgreSQL
- [x] 創建本地開發環境配置
- [x] 配置 vercel.json
- [ ] 推送代碼到 GitHub
- [ ] 在 Vercel 上連接項目
- [ ] 配置 Vercel Postgres 資料庫
- [ ] 設置環境變數
- [ ] 首次部署測試

---

## 🔧 詳細步驟

### 1. 推送代碼到 GitHub

```bash
cd /home/fizzy/Webapp

# 初始化 git（如果還未初始化）
git init

# 添加所有文件
git add .

# 提交
git commit -m "feat: prepare for Vercel deployment with PostgreSQL support"

# 推送到 GitHub（需要先在 GitHub 創建 repo）
git push origin main
```

### 2. 在 Vercel 創建 PostgreSQL 資料庫

1. 訪問 https://vercel.com/dashboard
2. 選擇你的項目
3. 進入 **Storage** 標籤
4. 點擊 **Create Database** → **Postgres**
5. 配置數據庫名稱和區域
6. **複製連接字符串**

### 3. 在 Vercel 上配置環境變數

1. 進入項目 **Settings** → **Environment Variables**
2. 添加以下變數：

```
DATABASE_URL = <從 Vercel Postgres 複製的連接字符串>
```

連接字符串格式應該是：
```
postgresql://username:password@host:5432/dbname?schema=public
```

### 4. 部署前編輯 schema.prisma（部署時）

**只在部署到 Vercel 時執行以下步驟：**

編輯 `prisma/schema.prisma`：
```prisma
datasource db {
  provider = "postgresql"  # 改這裡（從 sqlite 改為 postgresql）
  url      = env("DATABASE_URL")
}
```

然後提交並推送：
```bash
git add prisma/schema.prisma
git commit -m "feat: switch to PostgreSQL for Vercel deployment"
git push origin main
```

### 5. Vercel 會自動執行以下操作

- 安裝依賴：`npm install`
- 生成 Prisma：`npx prisma generate`
- 推送 schema 到資料庫：`npx prisma db push`（自動化透過 Build 階段）
- 編譯應用：`npm run build`
- 部署應用

### 6. 驗證部署成功

部署完成後：

1. 訪問你的 Vercel 部署 URL
2. 測試群組建立功能
3. 檢查資料庫是否正確保存數據

---

## 🛠️ 部署前檢查

```bash
# 1. 確保本地構建成功
cd /home/fizzy/Webapp/app
npm run build

# 2. 確保 Prisma Client 正確生成
npx prisma generate

# 3. 確認沒有 TypeScript 錯誤
npx tsc --noEmit

# 4. 確認敏感文件已忽略
cat .gitignore | grep -E "\.env|\.vercel"
```

---

## 📝 schema.prisma 切換方法

### 本地開發版本（使用 SQLite）
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### 生產版本（Vercel PostgreSQL）
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 🔐 安全提示

- ✅ 確保 `.env` 和 `.env.local` 在 `.gitignore` 中
- ✅ 不要將敏感的 DATABASE_URL 提交到 GitHub
- ✅ 使用 Vercel 環境變數面板設置生產變數
- ✅ 定期檢查 Vercel Postgres 的備份

---

## 📊 架構

```
本地開發
├── SQLite (prisma/dev.db)
├── .env: file:./prisma/dev.db
└── npm run dev

        ↓ (git push)

Vercel 部署
├── PostgreSQL (Vercel Postgres)
├── 環境變數: postgresql://...
└── 自動 npm run build + npx prisma db push
```

---

## 🆘 常見問題

**Q: 我可以同時支持 SQLite 和 PostgreSQL 嗎？**
A: Prisma schema 一次只能設置一個 provider。建議：
- 本地用 SQLite（快速開發）
- 生產用 PostgreSQL（可靠性）
- 部署前改 schema 並提交

**Q: 如何測試 PostgreSQL 本地配置？**
A: 
```bash
# 使用 Docker Compose 快速啟動 PostgreSQL
docker run --name postgres -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres:15
# 修改 .env 為 postgresql://postgres:password@localhost:5432/split-bill
# npx prisma db push
```

**Q: 如果部署失敗了？**
A: 檢查 Vercel Logs：
1. 進入 Vercel Dashboard → 選擇項目
2. 進入 **Deployments** 標籤
3. 查看失敗部署的詳細日誌

---

## 🚀 下一步

1. 推送代碼到 GitHub
2. 在 Vercel 連接 GitHub repo
3. 創建 Vercel Postgres 資料庫
4. 設置環境變數
5. 編輯 schema.prisma 為 PostgreSQL
6. 提交並推送 - Vercel 自動部署！
