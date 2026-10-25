import { TexResources } from '../app/tex-resources.ts';
const resources = new TexResources();
resources.prepare();
const progress = setInterval(() => console.log(`${resources.status.state}: ${Math.round(resources.status.downloaded / 1000000)} / ${Math.round(resources.status.total / 1000000)} MB`), 30_000);
await resources.task; clearInterval(progress);
console.log(JSON.stringify(resources.status));
if (resources.status.state !== 'ready') process.exitCode = 1;
