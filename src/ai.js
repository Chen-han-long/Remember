import { partById } from './data';
import holeCatalog from './holeCatalog.json';

// Browser-only BYOK: requests go directly to the official DeepSeek API.
// The key is held in React component state; never save to localStorage or code.
export const DIRECT_API_URL = 'https://api.deepseek.com/chat/completions';

export function buildAIRequest({ partId, customModel, question, history = [], screenshot }) {
  const part = customModel ? null : partById[partId];
  if (!part && !customModel) throw new Error('请先选择一个零件。');
  if (typeof question !== 'string' || !question.trim() || question.length > 1500)
    throw new Error('请输入 1–1500 字的问题。');
  if (screenshot && (!/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(screenshot) || screenshot.length > 1400000))
    throw new Error('当前截图格式或大小无效，请关闭“附当前视角”后重试。');

  const holeGroups = part ? (holeCatalog[partId] || []).slice(0, 40) : [];
  const holeContext = holeGroups.length ? holeGroups.map((h, i) =>
    `${i + 1}. ${h.name}；模型：${h.model}；图纸：${h.drawing}；可靠性：${h.confidence === 'drawing' ? '原图可辨标注' : '建模估算'}；备注：${h.note}`
  ).join('\n') : '无已整理孔系';
  const partContext = part ? [
    `编号：2027-${part.id}`,
    `名称：${part.name} / ${part.english}`,
    `材料：${part.material}`,
    `外形尺寸说明：${part.dimensions}`,
    `主要结构：${part.shape}`,
    `已整理特征：${part.features.join('、')}`,
    `特别说明：${part.note}`,
    `孔系资料：\n${holeContext}`
  ].join('\n') : `用户导入模型：${String(customModel).slice(0, 200)}。除可选截图外，没有它的完整几何和材料数据。`;

  const system = `你是机械零件、工程图与三维可视化的中文工程助手。用户正在查看以下对象：\n${partContext}\n
必须严格区分：(1) 原图可确认的标注，(2) 网页孔系目录中标为估算的数据，(3) 当前截图中直观看到的外形。
你不能直接读取完整原始 PDF、STEP/GLB 几何，也不能从三维截图精确测量未知孔径、壁厚、公差或隐藏结构。
若网页模型与工程图可能存在差异，应明确说明模型是参考实体而不是已完成全尺寸检验的生产级 CAD。
禁止编造不存在的尺寸、孔数、工艺标准或机械性能。回答要清楚、有依据、直接，适合机械工程图研究与核对。`;

  const safeHistory = Array.isArray(history) ? history.slice(-12)
    .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 1800) })) : [];

  return {
    model: 'deepseek-flash',
    thinking: { type: 'disabled' },
    max_tokens: 1800,
    stream: false,
    messages: [
      { role: 'system', content: system },
      ...safeHistory,
      { role: 'user', content: screenshot ? [
        { type: 'text', text: question.trim() },
        { type: 'image_url', image_url: { url: screenshot, detail: 'low' } },
      ] : question.trim() },
    ],
  };
}

export async function askDeepSeek({ key, partId, customModel, question, history, screenshot, signal }) {
  const apiKey = String(key || '').trim();
  if (!apiKey) throw new Error('请先在 AI 聊天区输入 DeepSeek API Key。');
  if (signal?.aborted) throw new DOMException('已停止请求', 'AbortError');
  const payload = buildAIRequest({ partId, customModel, question, history, screenshot });
  const controller = new AbortController();
  let timedOut = false;
  const onExternalAbort = () => controller.abort();
  if (signal) signal.addEventListener('abort', onExternalAbort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 60000);

  try {
    const response = await fetch(DIRECT_API_URL, {
      method: 'POST',
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 400) throw new Error(`请求参数不受支持（400）：${data?.error?.message || '请关闭附图重试。'}`);
      if (response.status === 401) throw new Error('DeepSeek 密钥无效或已过期（401），请重新输入。');
      if (response.status === 402) throw new Error('DeepSeek API 账户余额不足（402），请检查额度。');
      if (response.status === 429) throw new Error('调用频率受限（429），请稍后重试。');
      throw new Error(data?.error?.message || `DeepSeek 请求失败（HTTP ${response.status}）。`);
    }
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim())
      throw new Error('DeepSeek 没有返回有效文字回答。');
    return answer.trim();
  } catch (error) {
    if (error?.name === 'AbortError') {
      if (signal?.aborted) throw error;
      throw new Error(timedOut ? '请求超过 60 秒，已停止；请检查网络后重试。' : '请求已停止。');
    }
    if (error instanceof TypeError)
      throw new Error('浏览器直连失败：可能是 DeepSeek API 未允许网页跨域请求（CORS），也可能是网络问题。纯浏览器页面不能绕过服务端 CORS；请查看 F12 → Console。');
    throw error;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}
