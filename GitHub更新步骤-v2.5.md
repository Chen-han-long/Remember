# FORGE STUDIO v2.5 GitHub Pages 更新步骤

这次**不用改动八个模型、PDF 图纸、孔径文件、DeepSeek 密钥或 GitHub Pages 现有设置**。

## 已有网站：推荐使用更新补丁

1. 下载 `2027-cad-studio-v2.5-AI-更新补丁.zip`，解压到电脑。
2. 打开 GitHub 仓库的 **Code** 页，进入 `src` 文件夹，更新以下三个原有文件：
   - `App.jsx`
   - `main.jsx`
   - `ai.js`
3. 在同一个 `src` 文件夹新增 `ai-workspace.css`。注意它与原来的 `style.css`、`responsive.css` 是不同文件，**不要覆盖原有 CSS**。
4. 返回仓库根目录，更新 `package.json`。
5. 在 `scripts` 文件夹中新增 `test-browser-ai.mjs`（用于本地或 CI 的模拟请求测试；若未更新 `package.json` 可以省略）。
6. 将修改提交到 `main`，打开 **Actions** 等待自动构建显示绿色对勾。
7. 打开网站，按 **Ctrl + Shift + R** 强制刷新（Mac 使用 Command + Shift + R）。
8. 右侧应直接出现 AI 聊天，顶部“模型外观与显示设置”默认收起；按下可以展开。点击“连接 DeepSeek 密钥”输入 Key，展开栏可以再收起。

## 手机／平板

手机底部有 AI 助手及外观设置入口。“AI 助手”只显示聊天；“外观设置”显示同一个面板，并展开顶部的模型设置。

## 如 AI 无法发送

确认 API Key、网络状态，并在浏览器按 F12 → Console 查看错误。如果显示 `CORS`、`blocked by CORS policy`，说明 DeepSeek 服务端没有授权网页跨域访问。**这不是 GitHub 文件放错了**；纯浏览器模式不能从网页代码自行修复 CORS。需要服务提供方支持跨域，或者另选支持浏览器访问的官方接口。本版按照你的要求，没有加入自建网关。

如果出现 `401`，检查 API Key；如果 `402`，检查 DeepSeek API 账户额度。

## 文件清单

| 文件 | 用途 |
|---|---|
| `src/App.jsx` | AI 优先布局、折叠外观设置、加长聊天、会话操作 |
| `src/ai.js` | 只用浏览器调用 DeepSeek 官方 API |
| `src/main.jsx` | 加载新的 AI 样式 |
| `src/ai-workspace.css` | 电脑、平板、手机 AI 布局 |
| `package.json` | v2.5 版本与模拟测试命令 |
| `scripts/test-browser-ai.mjs` | 直连模拟测试，不会产生真实 API 费用 |

不需要 Vercel，也不需要 Cloudflare Worker。
