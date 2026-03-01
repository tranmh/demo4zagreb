/**
 * Build Script
 *
 * Reads all source files, resolves ES module imports, and inlines everything
 * into a single dist/index.html file that works with file:// protocol.
 *
 * Usage: node build.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC_DIR = join(__dirname, 'src');
const DIST_DIR = join(__dirname, 'dist');
const HTML_FILE = join(SRC_DIR, 'index.html');

/**
 * Read a file and return its contents.
 */
function readFile(filePath) {
  return readFileSync(filePath, 'utf-8');
}

/**
 * Resolve all ES module imports in a JS file recursively.
 * Returns the concatenated JS code with imports removed and modules ordered correctly.
 */
function resolveModules(entryPath) {
  const visited = new Set();
  const modules = [];

  function visit(filePath) {
    const absPath = resolve(filePath);
    if (visited.has(absPath)) return;
    visited.add(absPath);

    let content = readFile(absPath);
    const dir = dirname(absPath);

    // Find all import statements and resolve them first (depth-first)
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        const resolvedPath = resolve(dir, importPath);
        visit(resolvedPath);
      }
    }

    // Remove import statements
    content = content.replace(/import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"][^'"]+['"]\s*;?\n?/g, '');

    // Remove export statements but keep the declarations (only match at line start)
    content = content.replace(/^export\s+(class|function|const|let|var)\s+/gm, '$1 ');
    content = content.replace(/^export\s+default\s+/gm, '');
    content = content.replace(/^export\s+\{[^}]*\}\s*;?\n?/gm, '');

    // Add module marker comment
    const relPath = relative(SRC_DIR, absPath);
    modules.push(`// --- ${relPath} ---\n${content.trim()}`);
  }

  visit(entryPath);
  return modules.join('\n\n');
}

/**
 * Collect all CSS files referenced in the HTML.
 */
function collectCSS(html) {
  const cssRegex = /<link\s+(?=[^>]*rel="stylesheet")[^>]*href="([^"]+)"[^>]*\/?>/g;
  const cssContents = [];
  let match;

  while ((match = cssRegex.exec(html)) !== null) {
    const cssPath = join(SRC_DIR, match[1]);
    if (existsSync(cssPath)) {
      cssContents.push(`/* --- ${match[1]} --- */\n${readFile(cssPath).trim()}`);
    }
  }

  return cssContents.join('\n\n');
}

/**
 * Build the single-file HTML.
 */
function build() {
  console.log('Building...');

  // Ensure dist directory exists
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }

  // Read HTML template
  let html = readFile(HTML_FILE);

  // Collect and inline CSS
  const allCSS = collectCSS(html);

  // Remove CSS link tags
  html = html.replace(/<link\s+rel="stylesheet"\s+href="[^"]+"\s*\/?>\n?/g, '');

  // Collect and inline JS
  const jsMatch = html.match(/<script\s+type="module"\s+src="([^"]+)"\s*><\/script>/);
  let allJS = '';
  if (jsMatch) {
    const jsEntryPath = join(SRC_DIR, jsMatch[1]);
    allJS = resolveModules(jsEntryPath);
  }

  // Remove script tags
  html = html.replace(/<script\s+type="module"\s+src="[^"]+"\s*><\/script>\n?/g, '');

  // Insert inlined CSS before </head>
  if (allCSS) {
    html = html.replace(
      '</head>',
      `  <style>\n${allCSS}\n  </style>\n</head>`,
    );
  }

  // Insert inlined JS before </body>
  if (allJS) {
    html = html.replace(
      '</body>',
      `  <script>\n${allJS}\n  </script>\n</body>`,
    );
  }

  // Write output
  const outputPath = join(DIST_DIR, 'index.html');
  writeFileSync(outputPath, html, 'utf-8');

  const sizeKB = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
  console.log(`Build complete: dist/index.html (${sizeKB} KB)`);
}

build();
