#!/usr/bin/env node

/**
 * Documentation Generator
 *
 * Automatically regenerates the "Basic functionality" and "How the prompt works"
 * sections in cover-letter-how-it-works.md based on the actual prompt code in server/server.js
 *
 * Usage: npm run docs:generate
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const SERVER_FILE = resolve(PROJECT_ROOT, 'server/server.js');
const MARKDOWN_FILE = resolve(PROJECT_ROOT, 'src/content/cover-letter-how-it-works.md');
const HASH_FILE = resolve(__dirname, '.docs-prompt-hash');

// Load environment variables
try {
  const envPath = resolve(PROJECT_ROOT, '.env');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      }
    }
  }
} catch {}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Extract the buildPrompts function from server.js
 */
function extractPromptCode() {
  console.log('[docs] Reading server/server.js...');
  const serverCode = readFileSync(SERVER_FILE, 'utf8');

  // Find the buildPrompts function
  const functionStart = serverCode.indexOf('function buildPrompts(');
  if (functionStart === -1) {
    throw new Error('Could not find buildPrompts function in server/server.js');
  }

  // Find the end of the function (matching braces)
  let braceCount = 0;
  let inFunction = false;
  let functionEnd = functionStart;

  for (let i = functionStart; i < serverCode.length; i++) {
    if (serverCode[i] === '{') {
      inFunction = true;
      braceCount++;
    } else if (serverCode[i] === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        functionEnd = i + 1;
        break;
      }
    }
  }

  const promptCode = serverCode.substring(functionStart, functionEnd);
  console.log(`[docs] Extracted ${promptCode.length} characters of prompt code`);
  return promptCode;
}

/**
 * Parse markdown and extract sections by heading
 */
function parseMarkdown() {
  console.log('[docs] Reading markdown file...');
  const markdown = readFileSync(MARKDOWN_FILE, 'utf8');

  const lines = markdown.split('\n');
  const sections = {};
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    // Check for ## level headings
    if (line.startsWith('## ')) {
      // Save previous section
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n');
      }
      // Start new section
      currentSection = line.substring(3).trim();
      currentContent = [line];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections[currentSection] = currentContent.join('\n');
  }

  console.log(`[docs] Extracted ${Object.keys(sections).length} sections:`, Object.keys(sections));
  return sections;
}

/**
 * Generate documentation using OpenAI
 */
async function generateDynamicSections(promptCode) {
  if (!OPENAI_API_KEY) {
    console.warn('[docs] OPENAI_API_KEY not found - skipping generation');
    console.warn('[docs] Set OPENAI_API_KEY in .env to enable automatic documentation generation');
    return null;
  }

  console.log('[docs] Calling OpenAI API to generate documentation...');

  const system = "You are a technical documentation writer. Generate clear, concise markdown sections explaining software functionality. Match the style and tone of existing documentation.";

  const user = `Given this cover letter generator prompt code from server/server.js:

\`\`\`javascript
${promptCode}
\`\`\`

Generate two markdown sections that explain how this system works:

1. "## Basic functionality" section - Explain the user workflow:
   - What inputs the user provides (resume and job description)
   - How they provide those inputs (upload, paste, URL import)
   - What happens when they click Generate
   - Where the output appears

2. "## How the prompt works" section - Explain the technical approach:
   - Start with a "Purpose" paragraph explaining the goal
   - "### Generation flow" subsection explaining Phase A (metadata extraction) and Phase B (composition)
   - "### Humanity touch" subsection explaining the requirements for making output sound human
   - "### AI style filter" subsection explaining banned patterns and style constraints
   - "### Quality checks" subsection listing verification criteria

Requirements:
- Use the EXACT section and subsection titles shown above
- Be specific and technical, referencing actual constraints from the code
- Use bullet points for lists
- Keep it concise (the current docs are about 40 lines for these two sections combined)
- Match the existing documentation style (factual, direct, no marketing fluff)
- Output ONLY the markdown for these two sections, nothing else

Output ONLY the markdown for these two sections, nothing else.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${error}`);
    }

    const data = await response.json();
    let generatedText = data.choices?.[0]?.message?.content || '';

    if (!generatedText.trim()) {
      throw new Error('OpenAI returned empty response');
    }

    // Strip markdown code fences if present - filter out lines that are just fences
    const lines = generatedText.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      // Match lines that are only backticks with optional language identifier
      return !(/^```(markdown|md|)?$/i.test(trimmed));
    });
    generatedText = filteredLines.join('\n');

    console.log('[docs] Successfully generated documentation');
    return generatedText.trim();
  } catch (error) {
    console.error('[docs] Error calling OpenAI:', error.message);
    return null;
  }
}

/**
 * Compute hash of prompt code for change detection
 */
function computeHash(text) {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Check if prompt has changed since last generation
 */
function hasPromptChanged(promptCode) {
  if (!existsSync(HASH_FILE)) {
    return true;
  }

  const lastHash = readFileSync(HASH_FILE, 'utf8').trim();
  const currentHash = computeHash(promptCode);

  return lastHash !== currentHash;
}

/**
 * Save hash of current prompt
 */
function saveHash(promptCode) {
  const hash = computeHash(promptCode);
  writeFileSync(HASH_FILE, hash, 'utf8');
}

/**
 * Assemble final markdown document
 */
function assembleMarkdown(sections, dynamicContent) {
  const contribute = '\n---\n\n*You can contribute and improve the prompt by using the "Contribute" button at the top of the page.*';

  // Static section 1: Why build this?
  const whyBuildThis = sections['Why build this?'] || '';

  // Dynamic sections (will be replaced with generated content)
  const dynamicSections = dynamicContent;

  // Static section 2: Evidence (strip any existing contribute footer)
  let evidence = sections['Evidence'] || '';
  // Remove any existing contribute footers and separators from the evidence section
  evidence = evidence.replace(/\n*---\n*\*You can contribute.*?\*\n*/gs, '');
  evidence = evidence.trim();

  return `${whyBuildThis}

${dynamicSections}

${evidence}
${contribute}
`;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('[docs] Starting documentation generation...');

    // Extract prompt code
    const promptCode = extractPromptCode();

    // Check if prompt has changed
    if (!hasPromptChanged(promptCode)) {
      console.log('[docs] Prompt unchanged since last generation - skipping');
      return;
    }

    // Parse existing markdown
    const sections = parseMarkdown();

    // Generate dynamic content
    const dynamicContent = await generateDynamicSections(promptCode);

    if (!dynamicContent) {
      console.warn('[docs] Could not generate dynamic content - keeping existing documentation');
      return;
    }

    // Assemble and write
    const finalMarkdown = assembleMarkdown(sections, dynamicContent);
    writeFileSync(MARKDOWN_FILE, finalMarkdown, 'utf8');

    // Save hash
    saveHash(promptCode);

    console.log('[docs] ✓ Documentation successfully updated!');
    console.log(`[docs] Updated: ${MARKDOWN_FILE}`);
  } catch (error) {
    console.error('[docs] ✗ Error generating documentation:', error.message);
    process.exit(1);
  }
}

main();
