// Writes preview.html: the README rendered roughly the way github.com lays out a profile README.
// Open it with ?theme=light or ?theme=dark.
import { readFileSync, writeFileSync } from 'node:fs';

const md = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const html = `<!doctype html><meta charset="utf-8"><title>Profile preview</title>
<link rel="stylesheet" id="css">
<style>body{margin:0;padding:24px 16px}.markdown-body{box-sizing:border-box;max-width:896px;margin:0 auto;padding:24px;border:1px solid var(--borderColor-default,#30363d);border-radius:6px}</style>
<article class="markdown-body" id="out"></article>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script>
const theme = new URLSearchParams(location.search).get('theme') || 'dark';
document.getElementById('css').href = 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-' + theme + '.min.css';
document.body.style.background = theme === 'dark' ? '#0d1117' : '#ffffff';
document.getElementById('out').innerHTML = marked.parse(${JSON.stringify(md)});
</script>`;
writeFileSync(new URL('../preview.html', import.meta.url), html);
console.log('preview.html written');
