// src/app/api/hunt/route.ts
export const maxDuration = 60;
const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LanguageBar { name: string; percentage: number; bytes: number; }
interface CommitDay { date: string; count: number; }
interface LanguageMatch { tier: 'full' | 'primary' | 'none'; missingLangs: string[]; }

interface DeveloperProfile {
  handle: string;
  name: string;
  avatar: string;
  bio: string;
  location: string | null;
  own_repos: number;
  stars: number;
  languages: LanguageBar[];
  proficientLanguages: string[];
  commitCalendar: CommitDay[];
  topRepos: any[];
  score: number;
  scoreBreakdown: any;
  summary: string;
  accountCreated: string;
  matchTier?: 'full' | 'primary' | 'none';
  missingLangs?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

function langExact(a: string, b: string) {
  const normalize = (s: string) => s.toLowerCase().replace(/[+#]/g, '').trim();
  return normalize(a) === normalize(b);
}

function extractImpliedCompany(query: string): string | null {
  const m = query.match(/at\s+([A-Z][\w\s\.]+)/i) || query.match(/working\s+(?:at|for)\s+([A-Z][\w\s\.]+)/i);
  return m ? m[1].trim() : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI PROVIDERS
// ─────────────────────────────────────────────────────────────────────────────

async function callGemini(prompt: string, key: string) {
  const bodyData = new TextEncoder().encode(JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: bodyData
  });
  const data = await res.json();
  if (data.error) throw new Error(`Gemini: ${data.error.message}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function callClaude(prompt: string, key: string) {
  const bodyData = new TextEncoder().encode(JSON.stringify({ model: 'claude-3-5-haiku-latest', max_tokens: 4096, messages: [{ role: 'user', content: prompt }], temperature: 0.1 }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: bodyData
  });
  const data = await res.json();
  if (data.error) throw new Error(`Claude: ${data.error.message}`);
  return data.content?.[0]?.text;
}

async function callUniversal(prompt: string, key: string, baseUrl: string, modelName: string) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const url = cleanBase.endsWith('/chat/completions') ? cleanBase : `${cleanBase}/chat/completions`;
  const bodyData = new TextEncoder().encode(JSON.stringify({ model: modelName || 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.1, response_format: { type: 'json_object' } }));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: bodyData
  });
  const data = await res.json();
  if (data.error) throw new Error(`API: ${data.error.message || JSON.stringify(data.error)}`);
  return data.choices?.[0]?.message?.content;
}

async function callAI(prompt: string, provider: string, key: string, baseUrl?: string, modelName?: string): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let raw = '';
      if (provider === 'gemini') raw = await callGemini(prompt, key);
      else if (provider === 'anthropic') raw = await callClaude(prompt, key);
      else {
        const url = provider === 'openai' ? 'https://api.openai.com/v1' : (baseUrl || '');
        const model = provider === 'openai' ? 'gpt-4o-mini' : (modelName || '');
        if (!url) throw new Error('Custom provider needs Base URL.');
        raw = await callUniversal(prompt, key, url, model);
      }
      if (!raw) throw new Error('Empty AI output');
      const s = raw.search(/\{|\[/), e = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
      if (s === -1 || e === -1) throw new Error('No JSON in AI output');
      return JSON.parse(raw.substring(s, e + 1));
    } catch (err: any) {
      if (attempt >= 2) throw err;
      await delay((attempt + 1) * 2000);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAM ENCODER
// ─────────────────────────────────────────────────────────────────────────────

function makeEncoder() {
  const enc = new TextEncoder();
  return (obj: object) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB DATA FETCHERS
// ─────────────────────────────────────────────────────────────────────────────

async function getYearContributions(login: string, token: string): Promise<CommitDay[]> {
  const now = new Date();
  const yearAgo = new Date(now); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'LibreHire-App' },
      body: JSON.stringify({ query, variables: { login, from: yearAgo.toISOString(), to: now.toISOString() } })
    });
    const data = await res.json();
    const weeks = data?.data?.user?.contributionsCollection?.contributionCalendar?.weeks || [];
    return weeks.flatMap((w: any) => w.contributionDays.map((d: any) => ({ date: d.date, count: d.contributionCount })));
  } catch { return []; }
}

async function getLanguageProficiency(login: string, repos: any[], headers: any, primaryLangs: string[]): Promise<LanguageBar[]> {
  const targets = repos.filter(r => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 15);
  const langBytes: Record<string, number> = {};
  
  if (targets.length > 5) {
    const q = `query { ${targets.map((r, i) => `repo${i}: repository(owner:"${r.owner.login}", name:"${r.name}"){languages(first:10){edges{size node{name}}}}`).join(' ')} }`;
    try {
      const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers, body: JSON.stringify({ query: q }) });
      const data = await res.json();
      for (let i = 0; i < targets.length; i++) {
        const repoLangs = data?.data?.[`repo${i}`]?.languages?.edges || [];
        for (const edge of repoLangs) langBytes[edge.node.name] = (langBytes[edge.node.name] || 0) + edge.size;
      }
    } catch { /* fallback */ }
  }

  if (Object.keys(langBytes).length === 0) {
    await Promise.all(targets.slice(0, 10).map(async (repo) => {
      try {
        const res = await fetch(`https://api.github.com/repos/${login}/${repo.name}/languages`, { headers });
        const data = await res.json();
        for (const [lang, bytes] of Object.entries(data)) langBytes[lang] = (langBytes[lang] || 0) + (bytes as number);
      } catch { }
    }));
  }

  const total = Object.values(langBytes).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(langBytes).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, bytes]) => ({ name, bytes, percentage: Math.round((bytes / total) * 1000) / 10 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function computeScore(user: any, langBars: LanguageBar[], events: any[], queryTerms: string[], repos: any[], constraints: any, mode: string, locInfo: any, company: string | null, evalRes: any) {
  let total = 0;
  const breakdown: any = {};

  // 1. RECENT ACTIVITY (0-25)
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const recentEvents = events.filter(e => new Date(e.created_at) > monthAgo).length;
  const activityScore = Math.min(25, recentEvents * 2);
  total += activityScore; breakdown.activity = activityScore;

  // 2. LANGUAGE MATCH (0-35)
  let langScore = 0;
  const primaryMatch = queryTerms.some(t => langBars.slice(0, 2).some(l => langExact(l.name, t)));
  if (primaryMatch) langScore += 20;
  const secondaryMatch = queryTerms.filter(t => langBars.slice(2).some(l => langExact(l.name, t))).length;
  langScore += Math.min(15, secondaryMatch * 5);
  total += langScore; breakdown.languages = langScore;

  // 3. REPUTATION & IMPACT (0-20)
  const ownRepos = repos.filter(r => !r.fork);
  const totalStars = ownRepos.reduce((a, r) => a + (r.stargazers_count || 0), 0);
  const starScore = Math.min(15, Math.floor(totalStars / 5));
  const followerScore = Math.min(5, Math.floor((user.followers || 0) / 20));
  total += (starScore + followerScore); breakdown.reputation = starScore + followerScore;

  // 4. SEMANTIC RELEVANCE (0-20)
  if (evalRes) {
    const aiScore = Math.min(20, Math.floor((evalRes.score || 0) / 5));
    total += aiScore; breakdown.semantic = aiScore;
  }

  // MODIFIERS
  if (company && user.company && user.company.toLowerCase().includes(company.toLowerCase())) total += 15;
  if (mode === 'person') {
    const loginMatch = queryTerms.some(t => user.login.toLowerCase().includes(t.toLowerCase()));
    const nameMatch = user.name && queryTerms.some(t => user.name.toLowerCase().includes(t.toLowerCase()));
    if (loginMatch || nameMatch) total += 40;
  }

  return { total, breakdown };
}

function getTopRepoSummaries(repos: any[]) {
  return repos.filter(r => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3)
    .map(r => ({ name: r.name, stars: r.stargazers_count, description: r.description, language: r.language }));
}

async function evaluateSemanticMatch(query: string, candidates: any[], provider: string, key: string, baseUrl?: string, modelName?: string, mode?: string) {
  if (candidates.length === 0) return { evals: {}, orderedHandles: [] };

  const rawPrompt = `You are an elite technical recruiter AI. Score the following developers (0-100) based on how well their projects match this query: "${query}".
  
Candidates:
${JSON.stringify(candidates.map(c => ({
    handle: c.user.login,
    name: c.user.name,
    bio: c.user.bio,
    repos: c.repos.filter((r: any) => !r.fork).sort((a: any, b: any) => b.stargazers_count - a.stargazers_count).slice(0, 5).map((r: any) => ({
      name: r.name,
      description: r.description,
      stars: r.stargazers_count,
      language: r.language,
      topics: r.topics?.slice(0, 4) || [],
    })),
  }))).slice(0, 30000)}

Return ONLY JSON:
{"evaluations": [{"handle": "username", "score": 85, "assessment": "Built X..."}]${mode === 'person' ? ',"orderedHandles":["handle1","handle2"]' : ''}}`;

  const prompt = rawPrompt.replace(/[^\x00-\x7F]/g, ' ');

  try {
    const result = await callAI(prompt, provider, key, baseUrl, modelName);
    const evals: Record<string, {score: number, assessment: string}> = {};
    for (const e of (result?.evaluations || [])) evals[e.handle] = { score: e.score, assessment: e.assessment };
    return { evals, orderedHandles: result?.orderedHandles };
  } catch { return { evals: {}, orderedHandles: [] }; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function detectQueryMode(q: string) {
  const personWords = ['who', 'is', 'profile', 'user', 'github', 'handle', 'find'];
  const isPerson = personWords.some(w => q.toLowerCase().includes(w)) || (q.split(' ').length <= 2 && !q.includes('dev'));
  return { mode: isPerson ? 'person' : 'tech', constraints: null };
}

function extractLocation(q: string) {
  const m = q.match(/in\s+([A-Za-z\s]+)(?:\s|$)/i);
  if (!m) return null;
  const canonical = m[1].trim();
  return { canonical, variants: [canonical] };
}

function extractLanguages(q: string) {
  const common = ['rust', 'python', 'javascript', 'typescript', 'go', 'golang', 'java', 'cpp', 'c++', 'ruby', 'php', 'swift', 'kotlin', 'zig'];
  const found = common.filter(l => q.toLowerCase().includes(l));
  return { primary: found[0] || null, secondary: found.slice(1) };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const encode = makeEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: object) => { try { controller.enqueue(encode(msg)); } catch { } };

      try {
        const body = await req.json();
        const { provider, llmKey, githubToken, baseUrl, modelName } = body;
        if (!githubToken) throw new Error('GitHub PAT required');
        
        const gHeaders = { 
          'Authorization': `token ${githubToken}`, 
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'LibreHire-App'
        };

        const userQuery = body.userQuery || '';
        const { mode } = detectQueryMode(userQuery);
        const locationInfo = extractLocation(userQuery);
        const langInfo = extractLanguages(userQuery);
        const companySignal = extractImpliedCompany(userQuery);

        // ── STAGE 1: INTENT PARSING ─────────────────────────────────────────────────
        send({ type: 'progress', step: 1, total: 5, label: 'Parsing search intent...' });
        
        const intentPrompt = `You are a technical recruiter. Create 3 GitHub search queries for: "${userQuery}".
Return JSON: {"queries": ["q1", "q2", "q3"], "queryTerms": ["term1", "term2"]}`;

        const params = await callAI(intentPrompt, provider, llmKey, baseUrl, modelName);
        const queryTerms = params.queryTerms || [];

        // ── STAGE 2: GITHUB DISCOVERY ───────────────────────────────────────────────
        send({ type: 'progress', step: 2, total: 5, label: `Searching GitHub for ${userQuery}...` });
        
        const searchResults = await Promise.all(
          params.queries.map((q: string) => fetch(`https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=20`, { headers: gHeaders }).then(r => r.json()).catch(() => ({ items: [] })))
        );

        const uniqueItems: any[] = [];
        const seenIds = new Set();
        for (const res of searchResults) {
          for (const item of (res.items || [])) {
            if (!seenIds.has(item.id) && uniqueItems.length < 30) {
              seenIds.add(item.id); uniqueItems.push(item);
            }
          }
        }

        if (uniqueItems.length === 0) {
          send({ type: 'error', message: 'NO DEVELOPERS FOUND. TRY DIFFERENT KEYWORDS.' });
          controller.close(); return;
        }

        // ── STAGE 3: ENRICHMENT ─────────────────────────────────────────────────────
        send({ type: 'progress', step: 3, total: 5, label: `Analyzing ${uniqueItems.length} profiles...` });
        
        const enriched = await Promise.all(uniqueItems.map(async (item) => {
          try {
            const [uRes, rRes, eRes] = await Promise.all([
              fetch(`https://api.github.com/users/${item.login}`, { headers: gHeaders }),
              fetch(`https://api.github.com/users/${item.login}/repos?per_page=50&sort=pushed`, { headers: gHeaders }),
              fetch(`https://api.github.com/users/${item.login}/events/public?per_page=50`, { headers: gHeaders }),
            ]);
            return { user: await uRes.json(), repos: await rRes.json(), events: await eRes.json() };
          } catch { return null; }
        }));

        const candidatePool = enriched.filter(c => c !== null);

        // ── STAGE 4: SEMANTIC ANALYSIS ──────────────────────────────────────────────
        send({ type: 'progress', step: 4, total: 5, label: 'Evaluating project depth...' });
        
        const [withLangs, semanticRes] = await Promise.all([
          Promise.all(candidatePool.map(async (c) => ({ ...c, langBars: await getLanguageProficiency(c.user.login, c.repos, gHeaders, []) }))),
          evaluateSemanticMatch(userQuery, candidatePool, provider, llmKey, baseUrl, modelName, mode)
        ]);

        // ── STAGE 5: SCORING ────────────────────────────────────────────────────────
        send({ type: 'progress', step: 5, total: 5, label: 'Ranking candidates...' });
        
        const final = withLangs.map(c => {
          const evalRes = semanticRes.evals[c.user.login];
          const { total, breakdown } = computeScore(c.user, c.langBars, c.events, queryTerms, c.repos, null, mode, locationInfo, companySignal, evalRes);
          return {
            handle: c.user.login, name: c.user.name || c.user.login, avatar: c.user.avatar_url, bio: c.user.bio || '',
            location: c.user.location, own_repos: c.repos.filter((r: any) => !r.fork).length,
            stars: c.repos.reduce((a: number, r: any) => a + (r.stargazers_count || 0), 0),
            languages: c.langBars, proficientLanguages: c.langBars.slice(0, 3).map(l => l.name),
            commitCalendar: [], topRepos: getTopRepoSummaries(c.repos), score: total, scoreBreakdown: breakdown, summary: evalRes?.assessment || '',
            accountCreated: c.user.created_at
          };
        }).sort((a, b) => b.score - a.score).slice(0, 10);

        send({ type: 'done', data: final, searchQuality: 'good', locationFiltered: !!locationInfo });
        controller.close();

      } catch (err: any) {
        console.error('ENGINE ERROR:', err.message);
        send({ type: 'error', message: `ENGINE ERROR: ${err.message}` });
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
}
