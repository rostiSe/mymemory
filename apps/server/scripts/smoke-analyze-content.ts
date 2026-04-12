/**
 * Smoke test for `analyzeContent` (needs OPENAI_API_KEY).
 * Run as a real ESM file so top-level await works — `tsx -e` uses CJS and cannot use TLA.
 *
 * Usage: pnpm smoke:analyze-content [-- "your markdown..."]
 */
import 'dotenv/config';

import { analyzeContent } from '../src/modules/ai/tools/analyze-content.js';

const markdown = process.argv.slice(2).join('\n').trim() || '# Hi\n\nTest.';

try {
  const result = await analyzeContent({ markdown });
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
