// src/app/api/profile/route.ts
export const maxDuration = 60;
const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

interface LanguageBar { name: string; percentage: number; bytes: number; }
interface CommitDay { date: string; count: number; }

function makeEncoder() {
  const enc = new TextEncoder();
  return (obj: object) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
}

function extractContactDetails(user: any) {
  const blog = (user.blog || '').trim();
  const linkedinMatch = blog.match(/linkedin\.com\/(in|pub)\/[\w\-]+/i);
  const linkedin = linkedinMatch ? `https://${linkedinMatch[0]}` : null;
  const portfolio = (!linkedinMatch && blog && !blog.includes('twitter.com') && !blog.includes('x.com'))
    ? (blog.startsWith('http') ? blog : `https://${blog}`) : null;
  let twitter = user.twitter_username || null;
  if (!twitter) { const m = blog.match(/(?:twitter|x)\.com\/@?([\w]+)/i); if (m) twitter = m[1]; }
  return { email: user.email || null, twitter, linkedin, portfolio };
}

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
    if (!res.ok) throw new Error('GraphQL failed');
    const data = await res.json();
    const weeks = data?.data?.user?.contributionsCollection?.contributionCalendar?.weeks || [];
    return weeks.flatMap((w: any) => w.contributionDays.map((d: any) => ({ date: d.date, count: d.contributionCount })));
  } catch {
    const days: CommitDay[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().split('T')[0], count: 0 });
    }
    return days;
  }
}

async function getLanguageProficiency(login: string, repos: any[], gHeaders: HeadersInit): Promise<LanguageBar[]> {
  const targets = repos.filter(r => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 15);
  const langBytes: Record<string, number> = {};
  await Promise.all(targets.map(async (repo) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${login}/${repo.name}/languages`, { headers: gHeaders });
      if (!res.ok) return;
      const data: Record<string, number> = await res.json();
      for (const [lang, bytes] of Object.entries(data)) langBytes[lang] = (langBytes[lang] || 0) + bytes;
    } catch { /* skip */ }
  }));
  const total = Object.values(langBytes).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(langBytes).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, bytes]) => ({ name, bytes, percentage: Math.round((bytes / total) * 1000) / 10 }));
}

async function callAI(prompt: string, provider: string, key: string, baseUrl?: string, modelName?: string): Promise<string> {
  const cleanPrompt = prompt.replace(/[^\x00-\x7F]/g, ' ');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (provider === 'gemini') {
        const bodyData = new TextEncoder().encode(JSON.stringify({ contents: [{ parts: [{ text: cleanPrompt }] }], generationConfig: { temperature: 0.3 } }));
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: bodyData
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else if (provider === 'anthropic') {
        const bodyData = new TextEncoder().encode(JSON.stringify({ model: 'claude-3-5-haiku-latest', max_tokens: 2048, messages: [{ role: 'user', content: cleanPrompt }], temperature: 0.3 }));
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: bodyData
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.content?.[0]?.text || '';
      } else {
        const url = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : `${(baseUrl||'').replace(/\/+$/,'')}/chat/completions`;
        const model = provider === 'openai' ? 'gpt-4o-mini' : (modelName || '');
        const bodyData = new TextEncoder().encode(JSON.stringify({ model, messages: [{ role: 'user', content: cleanPrompt }], temperature: 0.3 }));
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: bodyData
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices?.[0]?.message?.content || '';
      }
    } catch (err: any) {
      if (attempt >= 2) throw err;
      await delay((attempt + 1) * 2000);
    }
  }
  return '';
}

export async function POST(req: Request) {
  const encode = makeEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: object) => { try { controller.enqueue(encode(msg)); } catch { /* closed */ } };

      try {
        const body = await req.json();
        const { username, provider, llmKey, githubToken, baseUrl, modelName } = body;
        const gHeaders = { 
          'Authorization': `token ${githubToken}`, 
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'LibreHire-App'
        };

        send({ type: 'progress', step: 1, total: 4, label: `Fetching @${username}'s GitHub profile...` });

        const [uRes, rRes, eRes] = await Promise.all([
          fetch(`https://api.github.com/users/${username}`, { headers: gHeaders }),
          fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`, { headers: gHeaders }),
          fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, { headers: gHeaders }),
        ]);

        if (!uRes.ok) throw new Error('User not found or GitHub API limit reached');
        const [u, repos, events] = await Promise.all([uRes.json(), rRes.json(), eRes.json()]);

        send({ type: 'progress', step: 2, total: 4, label: 'Evaluating technical depth...' });
        const [langBars, commitCalendar] = await Promise.all([
          getLanguageProficiency(username, repos, gHeaders),
          getYearContributions(username, githubToken)
        ]);

        send({ type: 'progress', step: 3, total: 4, label: 'Running AI analysis...' });
        const prompt = `Assess the GitHub developer "${username}". Bio: ${u.bio}. 
        Top Repos: ${repos.filter((r:any)=>!r.fork).slice(0,3).map((r:any)=>`${r.name}: ${r.description}`).join(', ')}.
        Return a professional 2-sentence summary of their core expertise.`;
        
        const summary = await callAI(prompt, provider, llmKey, baseUrl, modelName);

        const contact = extractContactDetails(u);
        const own = repos.filter((r: any) => !r.fork);

        const profile = {
          handle: u.login, name: u.name || u.login, avatar: u.avatar_url, bio: u.bio || '',
          location: u.location, own_repos: own.length,
          stars: own.reduce((a: number, r: any) => a + (r.stargazers_count || 0), 0),
          languages: langBars, proficientLanguages: langBars.slice(0, 3).map(l => l.name),
          commitCalendar, topRepos: repos.filter((r:any)=>!r.fork).slice(0,5).map(r=>({name:r.name,stars:r.stargazers_count,description:r.description,language:r.language})),
          score: 85, scoreBreakdown: {}, summary, accountCreated: u.created_at, contact
        };

        send({ type: 'done', data: profile });
        controller.close();

      } catch (err: any) {
        send({ type: 'error', message: err.message });
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
}
