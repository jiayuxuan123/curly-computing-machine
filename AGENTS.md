# AI News Aggregator

轻量级人工智能新闻聚合网站 / Lightweight AI news aggregator.

## 项目结构 / Project Structure

```
/
├── index.html          # 主页面 / Main SPA page
├── style.css           # 样式 / Styles
├── script.js           # 客户端逻辑 / Client-side JS
├── feeds.json          # RSS 源配置 / Feed configuration (edit this!)
├── feeds.opml          # OPML 格式的订阅源 / Alternate OPML format
├── data/
│   └── data.json       # 由 builder 生成的静态 JSON / Generated (do not edit)
├── builder/
│   ├── package.json    # Node.js 依赖 / Dependencies
│   └── build.js        # 构建脚本 / Build script
└── .github/workflows/
    └── update.yml      # GitHub Actions 自动更新 / Auto-update workflow
```

## 添加 RSS 源 / Adding Feeds

**方式 1: 编辑 feeds.json**
```json
{ "name": "来源名称", "url": "https://example.com/feed.xml", "category": "科技新闻", "lang": "en" }
```

**方式 2: 放入 feeds.opml**
在仓库根目录放入 OPML 文件，构建脚本会自动解析。

## 本地测试 / Local Testing

```bash
cd builder
npm install
node build.js
```

然后用任意静态服务器预览 `index.html`。

## 发布到 GitHub Pages / Deploy

1. 将仓库推送到 GitHub
2. 进入 Settings > Pages，Source 选择 "GitHub Actions"
3. Workflow 会自动每小时运行一次

## 安全说明 / Security

- 仓库中不存储任何 API 密钥、cookie 或令牌
- 所有 RSS 源均为公开源，无需认证
- No API keys, cookies, or tokens stored in this repo
