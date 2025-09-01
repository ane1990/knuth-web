import fs from 'fs-extra';
import path from 'path';
import { marked } from 'marked';

const rootDir = path.resolve('.');
const distDir = path.join(rootDir, 'dist');
const contentDir = path.join(rootDir, 'content');
const templatesDir = path.join(rootDir, 'templates');

async function ensureDirs() {
  await fs.emptyDir(distDir);
  await fs.ensureDir(path.join(distDir, 'css'));
  await fs.ensureDir(path.join(distDir, 'js'));
}

function replacePlaceholders(template, variables) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : '';
  });
}

function includePartials(template) {
  const partialsDir = path.join(templatesDir, 'partials');
  return template.replace(/\{\{\s*>\s*(.*?)\s*\}\}/g, (_, partialName) => {
    try {
      const partialPath = path.join(partialsDir, `${partialName}.html`);
      if (fs.existsSync(partialPath)) {
        return fs.readFileSync(partialPath, 'utf8');
      }
      return `<!-- Partial not found: ${partialName} -->`;
    } catch (err) {
      return `<!-- Error loading partial: ${partialName} -->`;
    }
  });
}

function parseHeaderTable(lines) {
  // Parses consecutive key|value rows at the start of the file
  // Example:
  // | template | blog-post |
  // | title | My Title |
  // | description | ... |
  // (optional) separator rows containing dashes are skipped
  const meta = {};
  let index = 0;
  function isSeparator(l) {
    return /\|?\s*-+\s*\|\s*-+/.test(l.trim());
  }
  while (index < lines.length) {
    const raw = lines[index].trim();
    if (!raw) { index++; break; }
    if (isSeparator(raw)) { index++; continue; }
    let row = raw;
    const hasPipe = row.includes('|');
    if (!hasPipe) break;
    if (row.startsWith('|')) row = row.slice(1);
    if (row.endsWith('|')) row = row.slice(0, -1);
    const parts = row.split('|').map((s) => s.trim());
    if (parts.length < 2) break;
    const key = parts[0].toLowerCase();
    const value = parts.slice(1).join(' | ').trim();
    meta[key] = value;
    index++;
  }
  const template = meta.template || null;
  return { template, meta, startIndex: index };
}

function parseSudokuInitial(content) {
  const trimmed = content.trim();
  if (!trimmed) return {};
  // JSON object form
  if (trimmed.startsWith('{')) {
    try { return JSON.parse(trimmed); } catch { return {}; }
  }
  // 9x9 grid lines (digits, 0/space for blank)
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length !== 9) return {};
  const initial = {};
  for (let i = 0; i < 9; i++) {
    const row = lines[i].replace(/\s+/g, '');
    if (row.length < 9) return {};
    for (let j = 0; j < 9; j++) {
      const ch = row[j];
      const n = Number(ch);
      if (!Number.isNaN(n) && n > 0) initial[`${i},${j}`] = n;
    }
  }
  return initial;
}

async function build() {
  await ensureDirs();
  await fs.ensureDir(contentDir);
  await fs.ensureDir(templatesDir);

  // copy assets
  await fs.copy(path.join(rootDir, 'css'), path.join(distDir, 'css')).catch(() => {});
  await fs.copy(path.join(rootDir, 'js'), path.join(distDir, 'js')).catch(() => {});
  await fs.copy(path.join(rootDir, 'robots.txt'), path.join(distDir, 'robots.txt')).catch(() => {});
  await fs.copy(path.join(rootDir, 'favicon.ico'), path.join(distDir, 'favicon.ico')).catch(() => {});
  // sitemap.xml will be generated dynamically after pages are built

  const mdFiles = (await fs.readdir(contentDir)).filter((f) => f.endsWith('.md'));
  for (const file of mdFiles) {
    const name = path.basename(file, '.md');
    const outName = name === 'index' ? 'index' : name;
    const raw = await fs.readFile(path.join(contentDir, file), 'utf8');
    const lines = raw.split(/\r?\n/);
    const { template, meta, startIndex } = parseHeaderTable(lines);
    if (!template) {
      throw new Error(`Missing template declaration in first row for ${file}. Expected "| template | name |"`);
    }
    const templatePath = path.join(templatesDir, `${template}.html`);
    if (!(await fs.pathExists(templatePath))) {
      throw new Error(`Template not found: ${templatePath}`);
    }
    let tpl = await fs.readFile(templatePath, 'utf8');
    tpl = includePartials(tpl);

    const bodyContent = lines.slice(startIndex).join('\n');

    if (template === 'sudoku_solver') {
      const initial = parseSudokuInitial(bodyContent);
      const currentUrl = meta.current_url || '';
      const html = replacePlaceholders(tpl, {
        sudoku_initial: JSON.stringify(initial),
        content: '',
        current_url: escapeHtml(currentUrl)
      });
      await fs.outputFile(path.join(distDir, `${outName}.html`), html, 'utf8');
    } else if (template === 'index') {
      const { aboutHtml, achievementsHtml, quoteHtml } = renderIndexSections(bodyContent);
      const html = replacePlaceholders(tpl, {
        about_message_html: aboutHtml,
        achievements_cards_html: achievementsHtml,
        quote_html: quoteHtml
      });
      await fs.outputFile(path.join(distDir, `${outName}.html`), html, 'utf8');
    } else if (template === 'blog-post') {
      const title = meta.title || '';
      const description = meta.description || '';
      const keywords = meta.keywords || '';
      const summary = meta.summary || '';
      const publishDate = meta.publish_date || '';
      const currentUrl = meta.current_url || '';
      const metaDescription = meta.meta_description || description;
      const metaKeywords = meta.meta_keywords || keywords;
      const articleHtml = marked.parse(bodyContent || '');
      const summaryHtml = marked.parse(summary || '');
      const html = replacePlaceholders(tpl, {
        page_title: escapeHtml(title),
        meta_description: escapeHtml(metaDescription),
        meta_keywords: escapeHtml(metaKeywords),
        summary_html: summaryHtml,
        article_html: articleHtml,
        publish_date: escapeHtml(publishDate),
        current_url: escapeHtml(currentUrl)
      });
      await fs.outputFile(path.join(distDir, `${outName}.html`), html, 'utf8');
    } else if (template === 'knuth') {
      const structured = renderKnuthSections(bodyContent);
      const currentUrl = meta.current_url || '';
      const html = replacePlaceholders(tpl, {
        content: structured,
        current_url: escapeHtml(currentUrl)
      });
      await fs.outputFile(path.join(distDir, `${outName}.html`), html, 'utf8');
    } else {
      const rendered = marked.parse(bodyContent || '');
      const html = replacePlaceholders(tpl, {
        content: rendered
      });
      await fs.outputFile(path.join(distDir, `${outName}.html`), html, 'utf8');
    }
  }

  await generateSitemap();
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});


async function generateSitemap() {
  // Determine base URL from robots.txt Sitemap line or env var
  const robotsPath = path.join(distDir, 'robots.txt');
  let baseUrl = process.env.BASE_URL || '';
  try {
    const robots = await fs.readFile(robotsPath, 'utf8');
    const match = robots.split(/\r?\n/).map((l) => l.trim()).find((l) => l.toLowerCase().startsWith('sitemap:'));
    if (match) {
      const sitemapUrl = match.split(':')[1].trim();
      const url = new URL(sitemapUrl);
      baseUrl = `${url.protocol}//${url.host}`;
    }
  } catch {}
  if (!baseUrl) baseUrl = 'http://localhost';

  // Collect HTML files in dist (recursively)
  const htmlFiles = await listHtmlFiles(distDir);

  // Build URLs
  const entries = await Promise.all(
    htmlFiles.map(async (absPath) => {
      const relPath = path.posix.join('/', path.relative(distDir, absPath).split(path.sep).join('/'));
      const loc = relPath === '/index.html' ? '/' : relPath;
      const stat = await fs.stat(absPath);
      const lastmod = stat.mtime.toISOString().slice(0, 10);
      return { loc: `${baseUrl}${loc}`, lastmod };
    })
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries
      .sort((a, b) => a.loc.localeCompare(b.loc))
      .map((e) => `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`),
    '</urlset>'
  ].join('\n');

  await fs.outputFile(path.join(distDir, 'sitemap.xml'), xml, 'utf8');
}

async function listHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((ent) => {
      const res = path.join(dir, ent.name);
      if (ent.isDirectory()) return listHtmlFiles(res);
      return res.endsWith('.html') ? [res] : [];
    })
  );
  return files.flat();
}

function renderIndexSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const text = markdown;
  function extractSection(title) {
    const pattern = new RegExp(`^##\\s*${title}\\s*$`, 'mi');
    const match = text.match(pattern);
    if (!match) return '';
    const start = match.index + match[0].length;
    // find next heading
    const rest = text.slice(start);
    const nextMatch = rest.match(/^##\s+.*$/m);
    const body = nextMatch ? rest.slice(0, nextMatch.index) : rest;
    return body.trim();
  }

  const aboutMd = extractSection('About This Platform');
  const achievementsMd = extractSection('Technical Achievements');
  // Quote: first blockquote block
  const quoteBlock = (text.match(/(^>.*(?:\n>.*)*)/m) || [null, ''])[1];

  const aboutHtml = marked.parse(aboutMd || '');

  // Build achievements cards from list items in achievementsMd
  const achievementLines = (achievementsMd || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '));
  const achievementsHtml = achievementLines
    .map((item) => {
      const content = item.replace(/^-\s*/, '');
      // Try to split **Title**: description
      const m = content.match(/^\*\*(.*?)\*\*\s*:?\s*(.*)$/);
      let title = '';
      let desc = content;
      if (m) {
        title = m[1];
        desc = m[2];
      }
      const descHtml = marked.parse(desc || '');
      return `
        <div class="achievement">
          <div class="achievement-title">${title || ''}</div>
          <div>${descHtml}</div>
        </div>`;
    })
    .join('\n');

  let quoteHtml = '';
  if (quoteBlock) {
    const qLines = quoteBlock
      .split(/\r?\n/)
      .map((l) => l.replace(/^>\s?/, '').trim())
      .filter((l) => l.length > 0);
    const quoteText = qLines[0] || '';
    const caption = qLines.slice(1).join(' ') || '';
    quoteHtml = `<blockquote class="quote">${quoteText}<br><small>${caption}</small></blockquote>`;
  }

  return { aboutHtml, achievementsHtml, quoteHtml };
}

function renderKnuthSections(markdown) {
  const text = markdown;
  function sectionMd(title) {
    const pattern = new RegExp(`^##\\s*${title}\\s*$`, 'mi');
    const match = text.match(pattern);
    if (!match) return '';
    const start = match.index + match[0].length;
    const rest = text.slice(start);
    const nextMatch = rest.match(/^##\s+.*$/m);
    const body = nextMatch ? rest.slice(0, nextMatch.index) : rest;
    return body.trim();
  }

  const lifetimeMd = sectionMd('A Lifetime of Dedication');
  const achievementsMd = sectionMd('Monumental Achievements');
  const beyondMd = sectionMd("Beyond Code: A Teacher's Heart");
  const legacyMd = sectionMd('The Legacy Continues');
  const quoteBlock = (text.match(/(^>.*(?:\n>.*)*)/m) || [null, ''])[1];

  const lifetimeHtml = lifetimeMd ? `
    <section class="tribute-section">
      <h2 class="section-title">A Lifetime of Dedication</h2>
      <div class="message">${marked.parse(lifetimeMd)}</div>
    </section>` : '';

  const achievementLines = (achievementsMd || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '));
  const achievementsCards = achievementLines
    .map((item) => {
      const content = item.replace(/^-\s*/, '');
      const m = content.match(/^\*\*(.*?)\*\*\s*:?\s*(.*)$/);
      let title = '';
      let desc = content;
      if (m) {
        title = m[1];
        desc = m[2];
      }
      const descHtml = marked.parse(desc || '');
      return `
        <div class="achievement">
          <div class="achievement-title">${title || ''}</div>
          <div>${descHtml}</div>
        </div>`;
    })
    .join('\n');
  const achievementsHtml = achievementsCards ? `
    <section class="tribute-section">
      <h2 class="section-title">Monumental Achievements</h2>
      <div class="achievements">${achievementsCards}</div>
    </section>` : '';

  let quoteHtml = '';
  if (quoteBlock) {
    const qLines = quoteBlock
      .split(/\r?\n/)
      .map((l) => l.replace(/^>\s?/, '').trim())
      .filter((l) => l.length > 0);
    const quoteText = qLines[0] || '';
    const caption = qLines.slice(1).join(' ');
    quoteHtml = `<blockquote class="quote">${quoteText}${caption ? `<br><small>${caption}</small>` : ''}</blockquote>`;
  }

  const beyondHtml = beyondMd ? `
    <section class="tribute-section">
      <h2 class="section-title">Beyond Code: A Teacher's Heart</h2>
      <div class="message">${marked.parse(beyondMd)}</div>
    </section>` : '';

  const legacyHtml = legacyMd ? `
    <section class="tribute-section">
      <h2 class="section-title">The Legacy Continues</h2>
      <div class="message">${marked.parse(legacyMd)}</div>
    </section>` : '';

  return [lifetimeHtml, achievementsHtml, quoteHtml, beyondHtml, legacyHtml].join('\n');
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

