import 'dotenv/config';
import express, { Request, Response } from 'express';
import * as chrono from 'chrono-node';
import { LunataskAPI } from 'lunatask-api';

const REQUIRED_ENV = ['LUNATASK_TOKEN', 'SHORTCUT_SECRET'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
	console.error(`Missing required env var: ${key}`);
	process.exit(1);
  }
}

const lunatask = new LunataskAPI(process.env.LUNATASK_TOKEN!);
const SECRET = process.env.SHORTCUT_SECRET!;
const DEFAULT_AREA_ID = process.env.LUNATASK_DEFAULT_AREA_ID;
const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

interface TaskLineResult {
  line: string;
  title: string;
  dueDate: string | null;
  ok: boolean;
  error?: string;
}

function extractTaskLines(text: string): string[] {
  console.log(text);
  return text
	.split('\n')
	.filter((l) => l.startsWith('- ') || l.startsWith('-\t'))
	.map((l) => l.trim())
	.map((l) => l.slice(1).trim());
}

function parseLine(line: string): { title: string; dueDate: string | null } {
  const results = chrono.parse(line, new Date(), { forwardDate: true });
  if (results.length === 0) {
	return { title: line, dueDate: null };
  }

  const match = results[0];
  const dueDate = match.start.date().toISOString().slice(0, 10);
  const title = (line.slice(0, match.index) + line.slice(match.index + match.text.length))
	.replace(/\s{2,}/g, ' ')
	.trim();

  return { title: title.length > 0 ? title : line, dueDate };
}

app.get('/healthz', (_req: Request, res: Response) => res.json({ status: 'ok' }));

app.post('/notes', async (req: Request, res: Response) => {
  if (req.header('x-secret') !== SECRET) {
	return res.status(401).json({ error: 'unauthorized' });
  }

  const { text, areaId } = req.body as { text?: string; areaId?: string };

  if (typeof text !== 'string' || text.trim().length === 0) {
	console.log('missing "text" in request body');
	return res.status(400).json({ error: 'missing "text" in request body' });
  }

  const targetAreaId = areaId ?? DEFAULT_AREA_ID;
  if (!targetAreaId) {
	console.log("no areaID provided")
	return res.status(400).json({ error: 'no areaId provided and no default configured' });
  }

  const lines = extractTaskLines(text);
  if (lines.length === 0) {
	return res.json({ created: 0, failed: [], results: [] });
  }

  const results: TaskLineResult[] = [];

  for (const line of lines) {
	const { title, dueDate } = parseLine(line);
	try {
	  const task = await lunatask.tasks.createTask({
		name: title,
		area_id: targetAreaId,
		scheduled_on: dueDate ?? undefined,
	  });
	  // the lunatask api returns null when it detects a potentially duplicate task
	  results.push({ line, title, dueDate, ok: true, error: task ? undefined : 'possible duplicate, skipped' });
	} catch (err) {
	  results.push({
		line,
		title,
		dueDate,
		ok: false,
		error: err instanceof Error ? err.message : String(err),
	  });
	}
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`created ${results.length - failed.length} tasks`)

  res.json({
	created: results.length - failed.length,
	failed: failed.map((f) => f.line),
	results,
  });
});

app.listen(PORT, () => {
  console.log(`metztli server listening on port ${PORT}`);
});
