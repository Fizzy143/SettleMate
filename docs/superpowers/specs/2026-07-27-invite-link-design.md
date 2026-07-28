# SettleMate 邀請連結功能設計

日期：2026-07-27
狀態：已核准，待實作

## 目標

讓群組使用者能複製可分享的邀請連結。受邀者開啟連結後，可以先確認群組資訊，再依目前瀏覽器是否已有本機身分完成加入。

加入流程必須讓使用者自行決定是否同時建立可參與分帳的 `Member`。群組 owner 原有的手動新增成員能力必須保留，且仍可建立多名未綁定使用者身分的成員。

## 不在本次範圍

- 邀請碼到期時間。
- 重新產生或撤銷邀請碼。
- 一次性邀請、使用次數上限或邀請權限分級。
- 新增群組描述欄位。設計稿中的描述列使用固定提示文案，不擴充 `Group` schema。
- 改造目前成員頁的整體權限模型。
- 清理既有未使用的 `User` 資料。
- 將透過邀請連結加入的使用者，與 owner 先前手動建立的既有未綁定成員（`userId = null`）自動合併，或提供「這是我」的認領流程。

## 已知限制

- **不自動認領既有成員**：migration 不回填 `Member.userId`，因此所有既有 `Member`（包含 owner 原本的成員）仍是 `userId = null`。系統無法安全判斷哪一筆既有 `Member` 代表目前使用者。
- **已加入者不補建**：MVP 只要偵測到既有 `GroupMembership` 就直接前往群組，不提供補建立或重新啟用 linked `Member` 的入口，避免產生重複成員或違反 owner 停用成員的管理意圖。
- **未來認領流程**：後續若要支援 membership 已存在但缺少 linked Member 的情況，必須另做「認領既有成員」流程，由使用者或 owner 明確選擇要把哪一筆 `Member` 綁到 `User`，再開放安全的 linked Member 補建。
- **既有資料不受影響**：舊支出、餘額與結算仍綁在原本的 `Member`；migration 不刪除或重分配任何既有資料。

## 已確認的產品決策

- 邀請網址使用 `/invite/[code]`。
- 沿用目前永久且唯一的六碼 `Group.inviteCode`。
- 首頁的手動邀請碼輸入保留，送出後導向相同邀請頁，不再直接加入。
- 邀請頁採用已確認的原版 C 版型：
  - 上方深色區塊顯示群組摘要。
  - 下方淺色區塊顯示身分與加入設定。
- 邀請頁公開顯示群組名稱、有效分帳成員數與支出筆數，但不公開成員姓名、支出內容或金額。
- 「同時將我加入分帳成員名單」預設勾選。
- 首次使用者只輸入一次顯示名稱；建立分帳成員時直接沿用相同名稱。
- 已有本機身分的使用者保留原版畫面，可在加入前修改初始分帳成員名稱。
- 取消勾選時，只建立群組資格，不建立分帳成員。
- 加入後直接前往 `/groups/[groupId]/members`。
- 只要使用者已經有該群組的 `GroupMembership`，邀請頁就直接顯示「前往群組」，不提供補建立 linked `Member` 或重新啟用成員的入口。
- 重複開啟邀請連結不得建立重複資格或重複分帳成員。

## 使用者流程

### 發出邀請

群組頁目前顯示邀請碼的按鈕維持原位置與邀請碼文字。點擊後改為複製：

```text
{window.location.origin}/invite/{INVITE_CODE}
```

互動規則：

- 按鈕標題改為「複製邀請連結」。
- 複製成功後短暫顯示「邀請連結已複製」。
- Clipboard API 不可用時，以包含完整連結的 prompt 作為 fallback。
- 畫面仍顯示六碼邀請碼，讓使用者可以口頭或手動分享。

### 手動輸入邀請碼

首頁既有表單保留。使用者提交後：

1. 去除前後空白並轉成大寫。
2. 導向 `/invite/[normalizedCode]`。
3. 後續使用與邀請連結完全相同的預覽及加入流程。

### 開啟邀請頁

頁面先讀取本機身分，再呼叫唯讀邀請預覽 API。載入期間顯示單一載入狀態，避免先錯誤顯示首次使用者畫面。

上方群組摘要固定顯示：

- `SettleMate`
- 群組名稱
- 固定提示文案：「朋友邀請你加入這個分帳群組」
- 有效分帳成員數
- 支出筆數

不顯示「預覽群組」或其他類別標籤；群組名稱直接作為品牌區下方的主要視覺焦點。

設計稿中的「2026 夏季旅遊共同帳本」只屬於展示內容；正式功能不新增或推測群組描述。

### 手機版卡片呈現

手機版採核准的「B 平衡置中」設計：

- 頁面背景需在卡片四周可見，整張邀請卡水平置中，不貼齊手機螢幕邊緣。
- 卡片頂端相較原始畫面往下約 18px，形成較明顯的浮動卡片感。
- 左右留白採平衡尺寸，不能使用 CSS `transform: scale()` 縮放整個表單，以免文字與觸控區域過小。
- 上方深色群組資訊區相較原始畫面縮短約 18%；同步縮小行動版內距、Logo、群組名稱與統計資訊間距。
- 下方表單仍維持可讀文字與至少 44px 高的主要輸入、按鈕觸控區域。
- `sm` 以上尺寸維持現有桌面／平板比例，這次只調整行動版。

## 邀請頁狀態

### 無本機身分

下方顯示：

- 標題「設定顯示名稱」
- 不顯示「第一次使用 SettleMate」副標題
- 單一欄位「顯示名稱」
- 提示「這個名稱會儲存在目前裝置上」
- 預設勾選「同時將我加入分帳成員名單」
- 提示「使用相同名稱；加入群組後可修改暱稱」
- 主要按鈕「加入『群組名稱』」
- 次要操作「取消」

未輸入有效名稱前，主要按鈕停用。名稱去除前後空白後必須介於 1 至 50 個字元。

若勾選建立分帳成員，初始 `Member.name` 與本機 `displayName` 相同。加入後在現有成員頁修改 `Member.name`，不連動修改本機身分名稱或 `User.displayName`。

### 已有本機身分、尚未加入群組

下方使用使用者提供的原版 C 畫面：

- 顯示「以 {displayName} 加入」。
- 顯示「這是你目前的裝置身分」。
- 預設勾選「建立分帳成員」。
- 勾選時顯示「成員顯示名稱」，預填本機 `displayName`，加入前可修改。
- 取消勾選時隱藏成員名稱欄位。
- 主要按鈕「加入『群組名稱』」。
- 次要操作「取消」。

成員名稱去除前後空白後必須介於 1 至 50 個字元。

### 已經加入群組

只要 `viewerState = "member"`，不論是否存在 linked `Member` 或該成員是否 active，頁面都不再次送出 join request，也不提供補建立或重新啟用成員的入口。顯示：

- 「你已經加入這個群組」
- 「不會重複建立群組資格或分帳成員」
- 主要按鈕「前往『群組名稱』」
- 次要操作「回到首頁」

主要按鈕導向 `/groups/[groupId]/members`。

此安全策略避免把既有未綁定 `Member` 誤判為缺少成員。現有 membership、成員、支出、餘額與結算資料維持原狀。

### 無效邀請

邀請碼不存在或對應群組已刪除時，顯示：

- 「邀請連結無效」
- 「邀請碼不存在，或群組已被刪除」
- 「回到首頁」

此狀態不得建立或更新 `User`、`GroupMembership` 或 `Member`。

### 加入失敗

若加入 API 發生可重試錯誤：

- 在目前邀請頁顯示錯誤訊息。
- 保留輸入名稱及勾選狀態。
- 提供「再試一次」。
- 首次使用者的 provisional identity 尚未寫入 localStorage。

## 資料模型

在 `Member` 增加可選的使用者關聯：

```prisma
model User {
  // existing fields
  memberships GroupMembership[]
  members     Member[]
}

model Member {
  // existing fields
  userId String?
  user   User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@unique([groupId, userId])
}
```

規則：

- 邀請流程自動建立的分帳成員設定 `Member.userId`。
- 新群組為 owner 自動建立的分帳成員也設定 `Member.userId`。
- 手動新增成員維持 `userId = null`。
- PostgreSQL 的複合 unique constraint 允許多筆 `NULL`，因此同一群組仍可手動建立多名未綁定使用者的成員。
- 同一使用者在同一群組最多只有一筆已綁定 `Member`。
- 既有 `Member` 保持 `userId = null`；本次 migration 不嘗試猜測或回填關聯。
- 刪除 `User` 時將 `Member.userId` 設為 `NULL`，保留既有分帳與支出歷史。

此 migration 只有新增 nullable 欄位、索引與外鍵，不刪除或改寫既有使用者、群組、成員、支出或結算資料。

## API 設計

### `GET /api/invites/[code]`

用途：無副作用地取得邀請頁需要的安全摘要。

處理：

1. 正規化邀請碼：trim 並轉成大寫。
2. 查找對應群組。
3. 統計 `isActive = true` 的 `Member`。
4. 統計 `kind = "expense"` 的 `Expense`，不將結算紀錄列入「支出筆數」。
5. 若 request 帶有本機 user ID header，只查詢既有 membership，不建立 `User`。

此 endpoint 在進入 Route Handler 前，由 Vercel Firewall 執行 rate limiting（見下方「Rate limiting」）。

成功回應：

```json
{
  "success": true,
  "data": {
    "group": {
      "id": "group-id",
      "name": "東京旅行",
      "memberCount": 6,
      "expenseCount": 28
    },
    "viewerState": "member"
  }
}
```

`viewerState` 值：

- `anonymous`：沒有本機身分 header。
- `eligible`：有本機身分但尚未加入群組。
- `member`：已有 `GroupMembership`。

失敗：

- `404`：邀請碼不存在。
- `429`：由 Vercel Firewall 在超過 rate limit 時回傳（見下方）；不可依賴固定 JSON body。
- `500`：讀取失敗。

#### Rate limiting

不在 Route Handler 內維護 `Map`、sliding window 或 token bucket。部分部署環境會把 Next.js Route Handler 部署成 Lambda，執行個體之間不能共享資料，因此記憶體內計數無法形成可靠的全域限制。參考 [Next.js Backend for Frontend：Deployment environment](https://nextjs.org/docs/app/guides/backend-for-frontend#deployment-environment)。

在 Vercel 專案建立一條 Firewall rate-limit rule，於請求進入應用程式前同時保護 preview 與 join endpoint。Hobby 方案每個專案目前可使用一條 rate-limit rule，因此兩個 endpoint 合併在同一條規則中。參考 [Vercel WAF Rate Limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)。

建議初始設定：

- Rule name：`Invite API rate limit`。
- Condition group A：path starts with `/api/invites/` 且 method 為 `GET`。
- Condition group B：path equals `/api/groups/join` 且 method 為 `POST`。
- A、B 兩組條件採 OR；各組內的 path 與 method 採 AND。
- Algorithm：Fixed Window。
- Counting key：IP；不使用可由瀏覽器偽造的 identity headers 作為限流 key。
- Window：60 秒。
- Limit：30 次；兩個 endpoint 共用同一個 IP bucket。上線後依 Firewall 流量紀錄調整。
- Exceeded action：Default 429。

Vercel Firewall 的 rate-limit rule 需透過專案 Dashboard 或 Firewall REST API 建立並 Publish，不能使用 `vercel.json` 宣告。這是 production 上線前的必要部署設定，不新增 `src/lib/rateLimit.ts`、資料表或外部 Redis。

本機開發與單元測試不會經過 Vercel Firewall；Route Handler 仍必須完整執行輸入驗證與 transaction 安全性。Firewall 是濫用防護，不是身分驗證；目前 MVP 仍接受 client-generated identity，但不能再以 identity header 當作 join endpoint 不需限流的理由。

回應不得包含完整 Group、inviteCode、成員清單、支出清單、金額或其他私人資料。

### `POST /api/groups/join`

請求：

```json
{
  "inviteCode": "TYO826",
  "createMember": true,
  "memberName": "Fizzy"
}
```

規則：

- `inviteCode` 必填並正規化。
- `createMember` 必須是 boolean。
- identity headers 中的 display name 必須先以 `decodeURIComponent` 解碼，再去除前後空白，最後檢查長度介於 1 至 50；缺少 header、解碼失敗、trim 後為空或超過 50 時回傳 `400`。
- 僅在尚未加入群組且 `createMember = true` 時，`memberName` 必填且長度為 1 至 50。
- `createMember = false` 時忽略 `memberName`，也不得停用或刪除已存在的 linked Member。
- 必須先確認邀請碼有效，再進行任何寫入。
- 若 `userId` 已有該群組的 `GroupMembership`，通過 inviteCode、identity headers 與 `createMember` 基本驗證後即視為 idempotent success；忽略 `memberName`，且不得建立或更新 `User`、`GroupMembership` 或 `Member`。

呼叫 `getValidatedDisplayName(request)`（見「元件與責任邊界」的 `src/lib/serverIdentity.ts`）驗證 displayName；驗證失敗直接回傳 `400`，不進入 transaction、不呼叫 `ensureUser()`。

所有資料庫寫入放在同一個 Prisma transaction：

1. 在 transaction 內先查詢是否已有該群組的 `GroupMembership`。
2. 若 membership 已存在，立即回傳既有 membership 的 role，且不執行任何資料庫寫入。
3. 若 membership 不存在，使用上一步驗證過的 displayName 建立或更新 `User`（不重新透過既有寬鬆的 `ensureUser()` 取得名稱，避免驗證被繞過）。
4. upsert `GroupMembership`；競態下若另一個 request 已先建立，既有 owner role 仍必須保留，不可改成 member。
5. 僅在 transaction 開始時 membership 不存在且 `createMember = true` 時，以 `(groupId, userId)` upsert linked `Member`。create branch 使用 `role = null`、`color = "bg-blue-200"` 與 `isActive = true`；update branch 不修改名稱或 `isActive`，避免透過競態或異常資料重新啟用既有成員。

成功回應：

```json
{
  "success": true,
  "data": {
    "groupId": "group-id",
    "groupName": "東京旅行",
    "currentUserRole": "member",
    "memberId": "member-id-or-null"
  }
}
```

重複 request 必須是 idempotent，不得產生第二筆 membership 或 linked Member。

失敗：

- `400`：參數或名稱無效。
- `401`：缺少使用者身分 headers。
- `404`：邀請碼不存在。
- `429`：由 Vercel Firewall 在超過 rate limit 時回傳；client 必須能處理非 JSON response body。
- `500`：transaction 失敗；所有資料庫寫入 rollback。

## 首次身分的客戶端處理

目前 `saveClientIdentity()` 會立即產生 ID 並寫入 localStorage，不適合直接用於可失敗的首次邀請流程。

本功能需要把身分處理拆成兩步：

1. 建立 provisional identity：產生 `userId` 與整理後的 `displayName`，但不寫入 localStorage。
2. 使用 provisional identity headers 呼叫 join API。
3. API 成功後才把相同 identity 寫入 localStorage。

若 API 失敗，畫面保留輸入值，但 localStorage 與資料庫都不留下新身分。既有首頁建立本機身分的行為維持不變。

## 元件與責任邊界

### `src/app/invite/[code]/page.tsx`

- 讀取 URL code 與本機身分。
- 載入 preview。
- 依 viewer state 呈現畫面。
- 管理名稱、checkbox、loading 與 error UI。
- 提交 join，成功後保存 provisional identity 並導向成員頁。

### `src/app/api/invites/[code]/route.ts`

- 邀請碼正規化。
- 安全摘要查詢。
- viewer state 判定。
- 不做任何寫入。

### `src/app/api/groups/join/route.ts`

- 請求驗證。
- 邀請碼有效性確認。
- transaction 與 idempotent upsert。
- 回傳導頁所需的最小資料。

### `src/app/api/groups/route.ts`

- 建立群組時，owner 自動建立的 Member 需一併寫入 `userId`，綁定到建立者的 user ID（呼應「資料模型」規則：新群組為 owner 自動建立的分帳成員也設定 `Member.userId`）。
- 既有群組的 owner member 不回填，維持現狀。

### `src/lib/serverIdentity.ts`

- 新增一個僅供 join 流程使用的顯示名稱驗證方法 `getValidatedDisplayName(request)`：讀取 raw header 後先執行 `decodeURIComponent`，解碼成功才 trim，最後以 trim 後字串的 `length` 檢查 1 至 50。缺少 header、malformed percent encoding、trim 後為空或超過 50 時回傳 `null`，讓 join route 回應 `400`。
- 不修改既有 `getDisplayName()` / `ensureUser()` 的寬鬆行為（空白 fallback 為 `"Guest"`、無長度上限），避免影響其他既有呼叫 `ensureUser` 的路由。
- `POST /api/groups/join` 改用新的驗證方法取得 displayName，驗證失敗時在呼叫 `ensureUser` 之前就回傳 `400`，不寫入任何資料。

### `src/lib/clientIdentity.ts`

- 保留既有 get/save/clear API。
- 增加 provisional identity 的建立、header 使用與成功後保存能力。
- 不讓 invite page 自行複製 user ID 產生邏輯。

### 現有群組頁與首頁

- 群組頁只負責建立並複製完整邀請 URL。
- 首頁手動邀請碼表單只負責導向邀請頁。
- 兩個入口共用同一 invite page 與 join API。

## 安全與隱私

- 任何持有永久邀請連結的人都能看到群組名稱及兩個數量摘要；這是本功能明確接受的公開範圍。
- preview 不得回傳成員姓名、使用者 ID、支出內容、支出金額或 inviteCode。
- preview 不以查無權限與查無群組洩露額外資訊；無效 code 一律回傳相同 404 形狀。
- join endpoint 只接受目前既有 identity headers，不從 body 接受任意 user ID。
- server 必須重新 trim 與驗證所有名稱，不依賴 client validation。
- 永久邀請碼的到期與撤銷不在本次範圍。
- 由同一條 Vercel Firewall per-IP rule 同時保護 `GET /api/invites/*` 與 `POST /api/groups/join`，降低邀請碼掃描與大量建立 User、GroupMembership、Member 的風險。
- identity headers 由瀏覽器產生且可偽造，不視為 authentication，也不能作為排除 join rate limiting 的依據。

## 相容性與資料安全

- schema 變更為 additive migration。
- 既有 `Member`、`Expense`、`ExpenseParticipant` 與 `GroupMembership` 不修改或刪除。
- 未綁定的既有成員仍可照常付款、分攤、編輯與停用。
- owner 手動新增多名成員的現有 UI 與 API 流程保持可用。
- 新群組建立時，owner 的自動成員會綁定 owner user ID。
- 現有群組中的 owner member 不自動回填，避免錯誤關聯造成資料歸屬改變。
- migration 後所有既有 `Member.userId` 都維持 `null`；invite preview 只用 `GroupMembership` 判斷已加入狀態，不以 linked Member 推測使用者是否已有分帳身分。
- 已加入使用者重新開啟邀請連結時不建立、認領或重新啟用 `Member`，因此不會把舊支出、餘額或結算拆到新的身分。

## 測試與驗收

### API 與資料層

- 有效 code 的 preview 只回傳允許欄位與正確計數。
- preview 不帶 headers 時回傳 `anonymous`，且不建立 User。
- preview 帶未加入 user header 時回傳 `eligible`，且不建立 User。
- preview 帶已加入 user header 時回傳 `member`。
- 無效 code 回傳 404，資料庫沒有任何新增或更新。
- `createMember = false` 只建立 membership。
- `createMember = true` 在同一 transaction 建立 User、membership 與 linked Member。
- transaction 中任一步失敗時不留下 membership 或 Member。
- 相同 join request 重送不建立重複資料。
- 既有 owner 重送 join request 時保留 owner role。
- 既有 membership 即使直接 POST `createMember = true`，也不更新 User 或 GroupMembership，並且不建立、更新、認領或重新啟用任何 Member。
- 手動建立多名 `userId = null` 的 Member 不受 unique constraint 阻擋。
- 新群組 owner 的自動 Member 會帶 owner user ID。
- join API 能正確解碼 percent-encoded 中文與空白；必須在 decode 後 trim 與檢查長度。缺少 display name header、malformed percent encoding、trim 後為空或超過 50 字時回傳 400，且不建立或更新 User、membership 或 Member。
- Vercel Firewall rule 的 path 與 method 條件同時涵蓋 preview GET 與 join POST；任一 endpoint 超過共用 IP 門檻時在進入 Route Handler 前回傳 429。
- client 遇到 Firewall 429 時即使 response body 不是 JSON，也顯示可重試訊息；join 表單保留輸入內容且不保存 provisional identity。

### 邀請頁

- 載入完成前不短暫顯示錯誤身分狀態。
- 首次使用者只看到一個名稱欄位。
- 首次使用者未輸入名稱時加入按鈕停用。
- 已有身分者顯示原版 identity panel。
- 已有身分者取消 checkbox 時隱藏成員名稱欄位。
- 只要 preview 回傳 `viewerState = "member"`，使用者就顯示「前往群組」而非加入表單，不查詢或補建立 linked Member。
- 加入失敗時保留欄位與 checkbox，且不保存 provisional identity。
- 加入成功後保存 identity 並導向 `/groups/[groupId]/members`。

### 現有入口

- 群組頁複製的是完整 `/invite/[code]` URL，不是只有 code。
- Clipboard fallback 顯示完整 URL。
- 首頁手動 code 導向正規化後的 invite URL。
- owner 仍能在成員頁手動新增多名成員。

### 靜態與手動驗證

- Prisma schema validation 與 client generation 成功。
- ESLint 通過。
- production build 通過。
- 桌面與手機寬度下，首次、已有身分、已加入、無效邀請及重試畫面皆可操作。
- 手動驗證瀏覽器重新整理、直接貼上 URL、重複點擊加入與重複開啟邀請連結。
- 在 Vercel Firewall Dashboard 確認 `Invite API rate limit` 已 Publish，且兩個 OR condition groups 分別命中 preview GET 與 join POST。
- 在不會留下資料的測試情境驗證兩個 endpoint 超過共用 IP 門檻時皆回傳 429；不要求固定 JSON body，並確認受限請求沒有到達 Route Handler。

## 驗收標準

1. 使用者可以從群組頁複製完整邀請連結。「done」
2. 沒有本機身分的受邀者能在邀請頁輸入一次名稱並完成加入。「done」
3. 有本機身分的受邀者能確認身分、選擇是否建立分帳成員並完成加入。「done」
4. 使用者取消建立分帳成員時仍能加入群組。「done」
5. 相同使用者與群組不會出現重複 linked Member。
6. owner 仍能手動建立多名未綁定使用者的成員。
7. 無效邀請或 transaction 失敗不會留下部分資料。
8. 既有線上使用者、成員、支出與結算資料不會因 migration 遺失或被重新歸屬。
9. 已經有 `GroupMembership` 的使用者再次開啟邀請連結時，只能直接前往群組，不建立、認領或重新啟用任何 `Member`。
10. 同一條 Vercel Firewall rule 對 `GET /api/invites/*` 與 `POST /api/groups/join` 執行 per-IP fixed-window 限流，超過門檻時回傳 429，且不依賴應用程式 instance 內的記憶體狀態。
