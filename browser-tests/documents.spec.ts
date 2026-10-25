import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import type { Page } from '@playwright/test';

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  const resources = await page.evaluate(async () => {
    const response = await fetch('/api/v1/plugins/openlab.busytex/resources');
    return { status: response.status, body: await response.json() };
  }).catch(error => ({ error: String(error) }));
  const build = await page.locator('.document-build').allTextContents().catch(() => []);
  await testInfo.attach('compiler-diagnostics', { body: JSON.stringify({ resources, build }, null, 2), contentType: 'application/json' });
});

async function document(page: Page, name: string) {
  await page.goto(JSON.parse(readFileSync('.cache/browser-launch.json', 'utf8')).launchUrl);
  await page.getByRole('button', { name: '新建项目', exact: false }).click();
  await page.getByLabel('项目名称', { exact: true }).fill(name);
  await page.getByRole('button', { name: '保存项目', exact: true }).click();
  await expect(page.getByLabel('研究问题', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '研究成果', exact: true }).click();
  await page.getByRole('button', { name: '新建文档', exact: true }).click();
  await page.getByRole('button', { name: 'LaTeX', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '编译', exact: true })).toBeVisible();
}
function png(): Buffer {
  const chunk = (type: string, bytes: Buffer) => { const data = Buffer.concat([Buffer.from(type), bytes]); let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } const header = Buffer.alloc(4); header.writeUInt32BE(bytes.length); const footer = Buffer.alloc(4); footer.writeUInt32BE((crc ^ 0xffffffff) >>> 0); return Buffer.concat([header, data, footer]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(1); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from([0, 20, 20, 20]))), chunk('IEND', Buffer.alloc(0))]);
}
test('real XeLaTeX compiles Chinese, formula, image and BibTeX; failure retains the exact previous PDF', async ({ page }) => {
  test.setTimeout(240_000);
  await document(page, '技术编译受控测试');
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByLabel('文档名称').fill('中文研究文档');
  const source = String.raw`\documentclass{article}
\usepackage{fontspec}
\setmainfont[Path=fonts/]{FandolSong-Regular.otf}
\usepackage{amsmath}
\usepackage{graphicx}
\begin{document}
中文研究报告。 This is a controlled compiler test.
\[\int_0^1 x^2\,dx=\frac{1}{3}\]
\input{section.tex}
\includegraphics[width=1cm]{sample.png}
Reference~\cite{sample}.
\bibliographystyle{plain}
\bibliography{references}
\end{document}`;
  await page.getByRole('textbox', { name: '文档编辑器' }).fill(source);
  await page.getByText('文档资源', { exact: false }).click();
  await page.locator('input[multiple]').setInputFiles([
    { name: 'section.tex', mimeType: 'text/plain', buffer: Buffer.from('受管的章节文件。') },
    { name: 'references.bib', mimeType: 'text/plain', buffer: Buffer.from('@article{sample,author={Researcher, A.},title={Controlled bibliography fixture},year={2024},journal={Technical test}}') },
    { name: 'sample.png', mimeType: 'image/png', buffer: png() },
  ]);
  await expect(page.getByRole('combobox', { name: '当前编辑文件' })).toBeVisible();
  await expect(page.locator('.resource-row')).toHaveCount(3);
  await page.getByRole('button', { name: '保存并编译', exact: true }).click();
  await expect(page.getByText('编译完成', { exact: true })).toBeVisible({ timeout: 125_000 });
  await expect(page.locator('.pdf-text-layer')).toContainText('中文研究报告', { timeout: 20_000 });
  await expect(page.locator('.pdf-text-layer')).toContainText('Controlled bibliography fixture');
  const download = page.waitForEvent('download'); await page.getByRole('link', { name: '下载 PDF', exact: true }).click();
  const pdf = readFileSync((await (await download).path())!); expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  writeFileSync('.cache/real-tex-proof.pdf', pdf);
  const archiveDownload = page.waitForEvent('download'); await page.getByRole('link', { name: '导出项目', exact: true }).click();
  const archive = JSON.parse(readFileSync((await (await archiveDownload).path())!, 'utf8'));
  expect(archive.schemaVersion).toBe(2);
  expect(archive.records.some((record: {kind:string;data:{outputHash?:string}}) => record.kind === 'build' && record.data.outputHash === createHash('sha256').update(pdf).digest('hex'))).toBe(true);

  await page.getByRole('button', { name: '专注阅读', exact: true }).click();
  for (const [label, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('.pdf-text-layer')).toContainText('中文研究报告');
    await page.screenshot({ path: `.cache/document-${label}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations.map(value => value.id)).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.keyboard.press('Escape');
  const oldPdfUrl = await page.getByRole('link', { name: '下载 PDF', exact: true }).getAttribute('href');
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByRole('textbox', { name: '文档编辑器' }).fill(source.replace('\n\\usepackage{fontspec}', '\n\\usepackage{openlab-missing-package}\n\\usepackage{fontspec}'));
  await page.getByRole('button', { name: '保存并编译', exact: true }).click();
  await expect(page.getByText('编译失败', { exact: true })).toBeVisible({ timeout: 125_000 });
  await expect(page.getByRole('link', { name: '下载 PDF', exact: true })).toHaveAttribute('href', oldPdfUrl!);
  await expect(page.getByText('显示另一修订的上次成功 PDF', { exact: false })).toBeVisible();
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByRole('textbox', { name: '文档编辑器' }).fill(String.raw`\documentclass{article}
\begin{document}
Offline pdfLaTeX with $x^2$.
\end{document}`);
  await page.getByRole('combobox', { name: 'TeX', exact: true }).click();
  await page.getByRole('option', { name: 'pdfLaTeX', exact: true }).click();
  await page.getByRole('button', { name: '保存并编译', exact: true }).click();
  await expect(page.getByText('编译完成', { exact: true })).toBeVisible({ timeout: 125_000 });
  await expect(page.locator('.pdf-text-layer')).toContainText('Offline pdfLaTeX', { timeout: 20_000 });
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByRole('textbox', { name: '文档编辑器' }).fill(String.raw`\documentclass{article}
\begin{document}
\OpenLabUndefinedCommand
\end{document}`);
  await page.getByRole('button', { name: '保存并编译', exact: true }).click();
  await expect(page.getByText('编译失败', { exact: true })).toBeVisible({ timeout: 125_000 });
  await page.getByText('编译日志', { exact: true }).click();
  await expect(page.locator('.document-build pre')).toContainText('Undefined control sequence');
  await expect(page.locator('.document-build pre')).toContainText('main.tex:3');


});

test('compiler cancellation and deadline terminate a controlled stalled worker without model work', async ({ page }) => {
  test.setTimeout(60_000);
  await document(page, '编译生命周期受控测试');
  await page.route('**/assets/busytex.worker-*.js', route => route.fulfill({ contentType: 'text/javascript', body: 'self.onmessage = event => { if (event.data.busytex_wasm) postMessage({initialized:{xetex:"controlled-stall"}}); };' }));
  const font = page.waitForResponse(response => response.url().endsWith('/FandolSong-Regular.otf'));
  await page.getByRole('button', { name: '编译', exact: true }).click(); await font;
  await page.getByRole('tab', { name: '来源 0', exact: true }).click();
  await page.getByRole('tab', { name: '报告 1', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消编译', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '取消编译', exact: true }).click();
  await expect(page.getByText('已取消编译', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '编译', exact: true })).toBeEnabled();
  await page.clock.install();
  const nextFont = page.waitForResponse(response => response.url().endsWith('/FandolSong-Regular.otf'));
  await page.getByRole('button', { name: '编译', exact: true }).click(); await nextFont;
  await page.clock.fastForward(121_000);
  await expect(page.getByText('编译失败', { exact: true })).toBeVisible();
  await page.getByText('编译日志', { exact: true }).click();
  await expect(page.locator('.document-build pre')).toContainText('120 seconds');
  await expect(page.locator('.user-message')).toHaveCount(0);
});

test('switching documents never requests a comparison revision from the previous document', async ({ page }) => {
  const firstCreated = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/documents'));
  await document(page, '文档修订范围受控测试');
  const first = await (await firstCreated).json();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  await page.getByRole('textbox', { name: '文档编辑器', exact: true }).fill('First document revision');
  await page.getByRole('dialog').getByRole('button', { name: '保存修订', exact: true }).click();
  await expect(page.locator('.document-reading')).toContainText('First document revision');
  const foreignRequests: string[] = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith(`/revisions/${first.revision.id}`) && !path.includes(`/artifacts/${first.artifact.id}/`)) foreignRequests.push(path);
  });
  await page.getByRole('button', { name: '新建文档', exact: true }).click();
  await page.getByRole('button', { name: 'LaTeX', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '下载源文件', exact: true })).toBeEnabled();
  expect(foreignRequests).toEqual([]);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a crashing view plugin falls back without losing download or conversation controls', async ({ page }) => {
  await page.route('**/assets/text-editor-*.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export default function ControlledBrokenPlugin(){throw new Error("controlled plugin failure")}' }));
  await document(page, '插件隔离受控测试');
  await expect(page.getByRole('alert')).toContainText('插件未能加载');
  await expect(page.getByRole('button', { name: '下载源文件', exact: true })).toBeEnabled();
  await expect(page.getByLabel('研究问题', { exact: true })).toBeEnabled();
});
