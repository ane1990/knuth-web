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

function parseTemplateRow(lines) {
  // Accept forms like:
  // | template | index |
  // template | index
  // | key | value | with optional separator on next line
  if (!lines.length) return { template: null, startIndex: 0 };
  const first = lines[0].trim();
  if (!first) return { template: null, startIndex: 0 };
  let row = first;
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|')) row = row.slice(0, -1);
  const parts = row.split('|').map((s) => s.trim());
  if (parts.length < 2) return { template: null, startIndex: 0 };
  const key = parts[0].toLowerCase();
  const value = parts[1];
  if (key !== 'template' || !value) return { template: null, startIndex: 0 };
  // skip optional separator row if present next
  let startIndex = 1;
  if (lines[1] && /^\s*\|?\s*-+\s*\|\s*-+/.test(lines[1])) startIndex = 2;
  return { template: value, startIndex };
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
  // sitemap.xml will be generated dynamically after pages are built

  const mdFiles = (await fs.readdir(contentDir)).filter((f) => f.endsWith('.md'));
  for (const file of mdFiles) {
    const name = path.basename(file, '.md');
    const outName = name === 'index' ? 'index' : name;
    const raw = await fs.readFile(path.join(contentDir, file), 'utf8');
    const lines = raw.split(/\r?\n/);
    const { template, startIndex } = parseTemplateRow(lines);
    if (!template) {
      throw new Error(`Missing template declaration in first row for ${file}. Expected "| template | name |"`);
    }
    const templatePath = path.join(templatesDir, `${template}.html`);
    if (!(await fs.pathExists(templatePath))) {
      throw new Error(`Template not found: ${templatePath}`);
    }
    const tpl = await fs.readFile(templatePath, 'utf8');

    const bodyContent = lines.slice(startIndex).join('\n');

    if (template === 'sudoku_solver') {
      const initial = parseSudokuInitial(bodyContent);
      const html = replacePlaceholders(tpl, {
        sudoku_initial: JSON.stringify(initial),
        content: ''
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

