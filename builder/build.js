const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FEEDS_JSON = path.join(ROOT, 'feeds.json');
const OPML_FILE = path.join(ROOT, 'feeds.opml');
const OUTPUT_FILE = path.join(ROOT, 'data', 'data.json');

const MAX_AGE_HOURS = 72;
const MAX_AI_ITEMS = 500;
const MAX_ALL_ITEMS = 800;

function buildAIRegExp() {
  const patterns = [
    '\\bai\\b', 'artificial intelligence', 'machine learning', 'deep learning',
    'neural network', 'large language model', '\\bllm\\b', 'llms',
    '\\bgpt', 'chatgpt', '\\bopenai\\b', '\\bclaude\\b', '\\banthropic\\b',
    '\\bgemini\\b', 'google ai', '\\bllama\\b', 'meta ai',
    '\\bmistral\\b', '\\bcohere\\b', 'hugging face', 'huggingface',
    'stable diffusion', 'midjourney', 'dall-e', 'dalle',
    'generative ai', 'gen ai', 'generative',
    '\\btransformer\\b', '\\brag\\b', '\\bagent\\b', 'ai agent', '\\bcopilot\\b',
    'fine tuning', 'finetuning', 'pretrained', 'pre trained',
    '\\bembedding\\b', '\\btoken\\b', '\\bagi\\b', 'multimodal',
    'vision model', 'speech recognition', '\\bnlp\\b',
    'natural language', 'computer vision', 'reinforcement learning',
    '\\bpytorch\\b', '\\btensorflow\\b', '\\bjax\\b', 'langchain', 'llamaindex',
    'vector database', 'semantic search', 'retrieval augmented',
    'foundation model', 'frontier model',
    'ai safety', 'ai alignment', 'ai regulation',
    '\\bdiffusion\\b', 'attention mechanism',
    '\\bgpu\\b', '\\bnvidia\\b', '\\bh100\\b', '\\bh200\\b', 'ai chip',
    'ai assistant', 'ai coding', 'code generation',
    'ai policy', 'ai act',
    'prompt engineering', 'chain of thought',
  ];
  return new RegExp(patterns.join('|'), 'i');
}

const AI_RE = buildAIRegExp();

const CATEGORY_KEYWORDS = {
  '模型发布': ['release', 'launch', 'announce', 'new model', 'unveil', 'introduc', '推出', '发布', '亮相'],
  '开发者工具': ['developer', 'tool', 'sdk', 'api', 'framework', 'library', 'cli', '开发', '工具'],
  '行业动态': ['funding', 'acquisition', 'partner', 'invest', 'merger', '融资', '收购', '投资', '合作'],
  '研究突破': ['research', 'paper', 'arxiv', 'study', 'breakthrough', 'novel', '研究', '论文', '突破'],
  '政策法规': ['regulation', 'policy', 'law', 'governance', 'safety', 'compliance', '监管', '法规', '安全'],
  '产品更新': ['update', 'upgrade', 'new feature', 'version', 'improve', '更新', '升级', '新功能'],
};

function parseOPML(xml) {
  const feeds = [];
  const regex = /<outline[^>]*?xmlUrl="([^"]*)"[^>]*?text="([^"]*)"[^>]*?\/?>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    feeds.push({ name: match[2], url: match[1], category: '自定义', lang: 'en' });
  }
  return feeds;
}

function loadFeeds() {
  const sources = JSON.parse(fs.readFileSync(FEEDS_JSON, 'utf-8'));
  const feedList = (sources.feeds || sources.sources || []);

  try {
    if (fs.existsSync(OPML_FILE)) {
      const opml = fs.readFileSync(OPML_FILE, 'utf-8');
      const opmlFeeds = parseOPML(opml);
      feedList.push(...opmlFeeds);
      console.log(`  OPML: ${opmlFeeds.length} feeds`);
    }
  } catch (e) {
    console.log('  OPML: none');
  }

  return feedList;
}

function classifyItem(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const tags = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) tags.push(category);
  }
  if (tags.length === 0) tags.push('行业动态');
  return tags;
}

function isAIRelevant(title, summary, source) {
  const text = `${title} ${summary}`;
  const keywordMatch = AI_RE.test(text);
  const sourceIsAI = /\bai\b|openai|anthropic|hugging|deepmind|stability/i.test(source);
  return keywordMatch || sourceIsAI;
}

(async () => {
  console.log(`[${new Date().toISOString()}] Starting AI News Builder...`);

  let Parser;
  try {
    Parser = require('rss-parser');
  } catch (e) {
    console.error('rss-parser not installed. Run: cd builder && npm install');
    process.exit(1);
  }

  const parser = new Parser({
    timeout: 12000,
    headers: {
      'User-Agent': 'AI-News-Aggregator/1.0 (GitHub Pages)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
  });

  const feeds = loadFeeds();
  console.log(`Loaded ${feeds.length} sources`);

  const allItems = [];
  const feedResults = [];

  for (const feed of feeds) {
    try {
      console.log(`  Fetching: ${feed.name} (${feed.url})`);
      const parsedFeed = await parser.parseURL(feed.url);
      const count = parsedFeed.items ? parsedFeed.items.length : 0;

      feedResults.push({ name: feed.name, url: feed.url, status: 'success', itemCount: count });

      if (parsedFeed.items) {
        parsedFeed.items.forEach((item) => {
          const title = (item.title || '').trim();
          const link = (item.link || item.guid || '').trim();
          if (!title || !link) return;

          const date = item.isoDate || item.pubDate || item.date || '';
          const summary = (item.contentSnippet || item.content || item.description || '').substring(0, 400).trim();
          const tags = classifyItem(title, summary);
          const aiRel = isAIRelevant(title, summary, feed.name);

          allItems.push({
            id: Buffer.from(link).toString('base64').substring(0, 16),
            title,
            url: link,
            date,
            source: feed.name,
            sourceCategory: feed.category || '其他',
            summary,
            tags,
            aiRelevant: aiRel,
          });
        });
      }

      console.log(`    ✓ ${count} items`);
    } catch (err) {
      console.error(`    ✗ ${err.message}`);
      feedResults.push({ name: feed.name, url: feed.url, status: 'error', error: err.message });
    }
  }

  // Dedup
  const seen = new Set();
  const unique = allItems.filter((item) => {
    const key = item.url.toLowerCase().replace(/\/$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`\nFetched ${allItems.length} items, after dedup: ${unique.length}`);

  // Time filter
  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000);
  const recent = unique.filter((item) => {
    const d = new Date(item.date);
    return !isNaN(d.getTime()) && d >= cutoff;
  });
  console.log(`After ${MAX_AGE_HOURS}h filter: ${recent.length} items`);

  // Sort newest first
  recent.sort((a, b) => new Date(b.date) - new Date(a.date));

  const aiOnly = recent.filter((item) => item.aiRelevant);

  const dir = path.join(ROOT, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const output = {
    generated: new Date().toISOString(),
    totalItems: recent.length,
    aiOnlyItems: aiOnly.length,
    feeds: feedResults,
    aiOnly: aiOnly.slice(0, MAX_AI_ITEMS),
    all: recent.slice(0, MAX_ALL_ITEMS),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✓ Done. AI: ${output.aiOnly.length}, All: ${output.all.length}`);
  console.log(`  Saved to ${OUTPUT_FILE}`);
})().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
