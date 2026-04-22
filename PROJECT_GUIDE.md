# AI-Daily 项目使用说明书

> 本文档面向后续维护者、AI 开发工具及其他开发者，旨在提供完整的项目结构、数据流、部署方式和扩展指南。

---

## 1. 项目概述

**AI-Daily** 是一个每日 AI 资讯聚合平台，核心能力包括：

- **静态前端**：纯 HTML/CSS/JS 单页应用，支持中英文双语切换
- **动态数据**：通过 Vercel Serverless Function 每小时自动抓取 Hacker News 上的 AI 相关新闻
- **大模型摘要**：调用 Kimi (Moonshot) API 对抓取的新闻生成结构化中英文摘要和分类
- **响应式设计**：适配桌面端、平板和移动设备

### 当前部署地址
- 生产环境：`https://ai-daily-lemon.vercel.app`
- API 端点：`https://ai-daily-lemon.vercel.app/api/news`

---

## 2. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 纯 HTML5 + CSS3 + Vanilla JS | 无框架、无构建工具，直接浏览器运行 |
| 后端 | Node.js (Vercel Serverless Function) | `api/news.js`，运行在 Vercel Edge/Node 环境 |
| 数据抓取 | Hacker News Algolia API | JSON API，无需认证 |
| 摘要生成 | Moonshot (Kimi) API | OpenAI 兼容格式，`api.moonshot.cn/v1` |
| 部署平台 | Vercel | 静态托管 + Serverless Functions |
| 设计稿 | `pencil-new.pen` | Pencil 设计工具导出的原型文件（非生产代码） |

---

## 3. 项目结构

```
ai-daily/
├── api/
│   └── news.js              # [核心] Serverless Function：抓取 + 大模型摘要
├── index.html               # [核心] 前端页面：UI + 交互逻辑 + 静态兜底数据
├── package.json             # Node.js 项目配置，指定 Node 20.x 运行时
├── vercel.json              # Vercel 部署配置
├── .gitignore               # Git 忽略规则（排除 .vercel 目录）
├── pencil-new.pen           # 设计稿文件（可忽略，不影响运行）
└── PROJECT_GUIDE.md         # 本说明书
```

---

## 4. 核心文件详解

### 4.1 `index.html` — 前端页面

**定位**：单页应用入口，包含所有 UI、样式、交互逻辑和静态兜底数据。

**关键代码区域**：

| 区域 | 行号范围 | 说明 |
|------|---------|------|
| CSS 样式 | ~12-230 | 全部内联在 `<style>` 中，暗色主题 |
| HTML 结构 | ~232-348 | Navbar、Stats、News Feed、Sidebar、Footer |
| 静态数据 `NEWS` | ~353-450 | 8 条示例新闻，作为 API 失败时的 fallback |
| 静态数据 `TRENDING` | ~452-458 | 5 个示例热门话题 |
| 静态数据 `SOURCES` | ~460-473 | 12 个数据来源 |
| 国际化字典 `T` | ~477-522 | 中英文翻译表 |
| 渲染函数 | ~546-635 | `renderNews()` / `renderTrending()` / `renderSources()` 等 |
| API 数据加载 | ~657-670 | `fetch('/api/news')` 动态加载，失败时保留静态数据 |

**前端数据流**：
1. 页面加载 → 立即渲染静态 `NEWS` / `TRENDING` / `SOURCES`
2. 同时发起 `fetch('/api/news')`
3. API 成功 → 用 `splice()` 替换数组内容 → `renderAll()` 刷新页面
4. API 失败 → 控制台打印警告，页面保持静态数据不变

**分类体系 (`category`)**：
- `llm` — 大语言模型（GPT、Claude、Gemini 等）
- `research` — 学术研究、论文、基准测试
- `safety` — AI 安全、对齐、治理、监管
- `open` — 开源模型、权重、数据集、工具
- `industry` — 商业、市场、投资、芯片、产品发布
- `multi` — 视频/图像/音频生成、多模态

### 4.2 `api/news.js` — 后端 API

**定位**：Vercel Serverless Function，路由为 `/api/news`。

**核心函数**：

| 函数 | 职责 |
|------|------|
| `fetchHN()` | 调用 Hacker News Algolia API，获取最近 24 小时 AI 相关文章 |
| `summarizeWithKimi(articles)` | 构造 Prompt，调用 Kimi API 生成结构化 JSON |
| `module.exports` | HTTP 请求处理器，管理缓存和错误回退 |

**缓存策略**：
- 使用内存变量 `cache` + `cacheTime` 做简单缓存
- 缓存有效期：`CACHE_TTL = 1 小时`（60 * 60 * 1000 ms）
- 缓存命中时直接返回，不调用外部 API
- 缓存过期或不存在时，执行抓取 + 摘要流程

**错误处理**：
- Kimi API 失败 → 如果存在缓存，返回过期缓存（标记 `stale: true`）
- 首次调用就失败（无缓存）→ 返回 `500` + `fallback: true`
- 前端收到任何错误都会保留静态兜底数据

**API 响应格式**：
```json
{
  "news": [
    {
      "id": 1,
      "category": "llm",
      "source": "OpenAI Blog",
      "srcUrl": "openai.com",
      "link": "https://openai.com/blog/...",
      "title": { "zh": "中文标题", "en": "English Title" },
      "desc": { "zh": "中文摘要", "en": "English summary" },
      "hoursAgo": 3
    }
  ],
  "trending": [
    { "rank": "01", "color": "#A855F7", "text": { "zh": "...", "en": "..." }, "count": "1.2k" }
  ],
  "sources": [
    { "name": "Hacker News", "url": "news.ycombinator.com", "color": "#FF6600" }
  ],
  "updatedAt": "2026-04-22T09:00:00.000Z",
  "cached": false
}
```

### 4.3 `vercel.json` — 部署配置

```json
{
  "version": 2,           // Vercel 平台版本
  "public": true,         // 部署公开可访问
  "github": {
    "enabled": false      // 禁用 GitHub 自动集成
  }
}
```

**路由规则**（Vercel 自动推断）：
- `/api/news` → `api/news.js`（Serverless Function）
- `/` 及其他路径 → `index.html`（静态页面）

### 4.4 `package.json`

```json
{
  "name": "ai-daily",
  "version": "1.1.0",
  "private": true,
  "engines": { "node": "20.x" }
}
```

- 无外部 npm 依赖，使用 Node.js 20 内置的 `fetch()`
- `private: true` 防止意外发布到 npm

---

## 5. 环境变量配置

**必需环境变量**：

| 变量名 | 用途 | 获取方式 |
|--------|------|---------|
| `KIMI_API_KEY` | Kimi (Moonshot) API 认证 | [platform.moonshot.cn](https://platform.moonshot.cn/) → API Key 管理 |

**配置命令**（Vercel CLI）：

```bash
# 添加环境变量（Production 环境）
echo "sk-xxxxxxxx" | vercel env add KIMI_API_KEY production

# 重新部署以生效
vercel --prod
```

或在 Vercel Dashboard 中设置：
Project Settings → Environment Variables → Add New

**⚠️ 安全提醒**：
- API Key **严禁** 硬编码在代码中
- API Key **严禁** 提交到 Git 仓库
- 如 Key 泄露，应立即在 Moonshot 平台删除并重新生成

---

## 6. 本地开发与调试

### 6.1 安装依赖

```bash
# 无需安装 npm 包，项目零依赖
# 只需安装 Vercel CLI
npm install -g vercel
```

### 6.2 本地运行

```bash
# 1. 进入项目目录
cd ai-daily

# 2. 启动本地开发服务器（自动识别 api/ 目录和静态文件）
vercel dev

# 3. 浏览器访问 http://localhost:3000
```

### 6.3 单独测试 API

```bash
# 本地测试 API
curl http://localhost:3000/api/news

# 生产环境测试 API
curl https://ai-daily-lemon.vercel.app/api/news
```

---

## 7. 部署指南

### 7.1 首次部署

```bash
cd ai-daily
vercel login          # 浏览器 OAuth 授权
vercel --prod         # 生产环境部署
```

### 7.2 后续更新部署

```bash
# 方式一：CLI 直接部署
vercel --prod

# 方式二：使用 Token 部署（适合 CI/CD 或自动化工具）
vercel --prod --token $VERCEL_TOKEN --yes
```

### 7.3 查看部署日志

```bash
vercel logs --production
```

---

## 8. 扩展与定制指南

### 8.1 切换大模型服务商

修改 `api/news.js` 中的以下常量：

```javascript
const KIMI_API_KEY = process.env.KIMI_API_KEY;
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                改为其他兼容 OpenAI 格式的 API 地址
```

**常见替换方案**：

| 服务商 | API 地址 | 模型名 | 环境变量名 |
|--------|---------|--------|-----------|
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| SiliconFlow | `https://api.siliconflow.cn/v1/chat/completions` | `deepseek-ai/DeepSeek-V3` | `SILICONFLOW_API_KEY` |
| 阿里云百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | `qwen-plus` | `DASHSCOPE_API_KEY` |

> 切换后需同步更新环境变量名称，并重新部署。

### 8.2 添加更多新闻数据源

当前仅抓取 **Hacker News**。如需扩展，修改 `api/news.js` 中的 `fetchHN()` 或新增函数：

```javascript
// 示例：添加 Reddit r/MachineLearning RSS
async function fetchReddit() {
  const res = await fetch('https://www.reddit.com/r/MachineLearning/new.json?limit=10');
  const data = await res.json();
  return data.data.children.map(c => ({
    title: c.data.title,
    url: c.data.url,
    time: c.data.created_utc
  }));
}

// 在 summarizeWithKimi 之前合并多个源
const hnArticles = await fetchHN();
const redditArticles = await fetchReddit();
const allArticles = [...hnArticles, ...redditArticles];
const generated = await summarizeWithKimi(allArticles);
```

### 8.3 调整更新频率

修改 `api/news.js`：
```javascript
const CACHE_TTL = 60 * 60 * 1000;  // 1 小时（默认）
// 改为：
const CACHE_TTL = 30 * 60 * 1000;  // 30 分钟
const CACHE_TTL = 2 * 60 * 60 * 1000;  // 2 小时
```

### 8.4 修改前端样式/布局

- 所有 CSS 内联在 `index.html` 的 `<style>` 标签中
- 变量定义在 `:root` 选择器中（第 13-30 行）
- 响应式断点：1200px、960px、640px
- 直接修改 HTML/CSS 即可，无需构建步骤

### 8.5 修改分类标签

前端分类按钮定义在 `renderFilters()` 函数中（约第 558 行）：
```javascript
const cats = [
  ['all','catAll'], ['llm','catLLM'], ['research','catResearch'],
  ['safety','catSafety'], ['open','catOpen'], ['industry','catIndustry'], ['multi','catMulti'],
];
```

如需新增分类：
1. 在前端添加新的分类键值对（如 `['agent','catAgent']`）
2. 在 `T.zh` 和 `T.en` 中添加对应的翻译文本
3. 在 `CAT_CLASS` 和 `CAT_COLOR` 中添加样式映射
4. 在后端 Prompt 中告知 Kimi 新的分类规则

---

## 9. 故障排查

### 9.1 常见问题速查

| 现象 | 可能原因 | 解决方案 |
|------|---------|---------|
| 页面打开后新闻不更新 | Kimi API Key 无效或过期 | 检查 `KIMI_API_KEY` 环境变量，去 Moonshot 平台重新生成 |
| API 返回 `401 Invalid Authentication` | API Key 错误 | 确认 Key 格式为 `sk-...`，且未包含多余空格 |
| API 返回 `500` | Kimi API 超时或 HN API 故障 | 查看 Vercel Logs，检查外部服务状态 |
| 页面显示静态数据（旧新闻） | API 调用失败，回退到 fallback | 检查浏览器控制台网络请求，确认 `/api/news` 是否可达 |
| 新闻内容为空 | Kimi 返回的 JSON 格式异常 | 检查 Vercel Logs 中 Kimi 的原始返回内容 |
| 部署失败 | 代码语法错误 | 运行 `vercel --prod` 查看具体错误信息 |

### 9.2 调试技巧

```bash
# 查看实时日志
vercel logs --production

# 本地调试 API
vercel dev
# 另开终端
curl http://localhost:3000/api/news | jq .

# 测试 Kimi API 连通性（替换为你的 Key）
curl https://api.moonshot.cn/v1/models \
  -H "Authorization: Bearer $KIMI_API_KEY"
```

---

## 10. 与其他工具/Agent 集成

### 10.1 作为数据源被其他应用调用

```bash
# 任意客户端均可直接调用
curl https://ai-daily-lemon.vercel.app/api/news
```

返回的 JSON 结构稳定，可直接被：
- 其他前端应用
- 微信公众号/机器人
- Notion/Telegram/Discord Bot
- 数据分析脚本

### 10.2 被其他 AI Agent 修改

如果其他 AI 开发工具需要修改本项目，关键入口：

| 修改目标 | 操作文件 | 关键函数/区域 |
|---------|---------|-------------|
| 改 UI 样式 | `index.html` | `<style>` 标签内 CSS |
| 改新闻数据源 | `api/news.js` | `fetchHN()` 函数 |
| 切换大模型 | `api/news.js` | `KIMI_API_URL` + `summarizeWithKimi()` |
| 改摘要 Prompt | `api/news.js` | `summarizeWithKimi()` 中的 `prompt` 模板 |
| 改分类体系 | `index.html` + `api/news.js` | `CAT_CLASS` / `CAT_COLOR` / Prompt 中的分类规则 |
| 改更新频率 | `api/news.js` | `CACHE_TTL` 常量 |
| 添加新页面 | `index.html` | 新增 HTML 结构 + JS 逻辑 |

### 10.3 CI/CD 自动化部署示例

```yaml
# .github/workflows/deploy.yml（GitHub Actions 示例）
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 11. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | — | 纯静态 HTML 原型，数据硬编码 |
| 1.1.0 | 2026-04-22 | 接入 Vercel Serverless Function + Kimi API，实现自动抓取与摘要 |

---

## 12. 贡献者注意事项

1. **不要提交敏感信息**：API Key、Token、密码等必须通过环境变量注入
2. **保持零依赖**：`package.json` 中不添加额外 npm 包，使用 Node.js 内置 API
3. **兼容 Vercel Hobby 计划**：Serverless Function 执行时间控制在 10 秒内，必要时拆分逻辑
4. **前端向后兼容**：API 失败时页面必须能正常显示静态兜底数据

---

*本文档最后更新：2026-04-22*
