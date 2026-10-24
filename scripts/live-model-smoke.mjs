// Opt-in network verification. Credentials arrive through the environment and
// are never printed or saved in the verification report.
import { CompatibleModel } from '../app/model.ts';
import { writeFileSync } from 'node:fs';

const apiKey = process.env.OPENLAB_SMOKE_API_KEY;
if (!apiKey) throw new Error('Set OPENLAB_SMOKE_API_KEY for the opt-in live test');
const provider = new CompatibleModel({ baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', apiKey, maxOutputTokens: 256, extra: { thinking: { type: 'disabled' } } });
const tool = { name: 'record_probe', description: 'Record the supplied verification word.', parameters: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'], additionalProperties: false } };
const results = { at: new Date().toISOString(), node: process.version, platform: `${process.platform}/${process.arch}`, endpoint: 'https://api.deepseek.com', model: 'deepseek-flash', tests: [] };
for (const [name, prompt, tools] of [
  ['Chinese streaming', '请用中文写一句简短的文献研究说明，不超过二十个字。', []],
  ['Structured tool calling', 'Call record_probe with word=OpenLab. Do not answer in text.', [tool]],
]) {
  try {
    const chunks = [];
    for await (const chunk of provider.stream([{ role: 'user', content: prompt }], tools, AbortSignal.timeout(45_000))) chunks.push(chunk);
    const calls = chunks.filter(c => c.type === 'tool');
    const passed = tools.length ? calls.length === 1 && calls[0].call.name === tool.name && JSON.parse(calls[0].call.arguments).word === 'OpenLab' : chunks.some(c => c.type === 'text' && /[\u3400-\u9fff]/u.test(c.text));
    results.tests.push({ name, passed, textChunks: chunks.filter(c => c.type === 'text').length, tools: calls.map(c => c.call.name), usage: chunks.filter(c => c.type === 'usage') });
  } catch (error) {
    // Only safe, known error classes are reported. Network errors are generic.
    results.tests.push({ name, passed: false, error: error.name === 'DomainError' ? error.message : 'Connection or response parsing failed' });
  }
}
writeFileSync('.cache/live-model-smoke.json', JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
if (results.tests.some(test => !test.passed)) process.exitCode = 1;
