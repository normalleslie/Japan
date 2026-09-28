const page = '__INLINE_PAGE__';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const eventPayload = (payload) => ({
  title: clean(payload.title, 100),
  event_date: clean(payload.event_date, 10),
  start_time: clean(payload.start_time, 5),
  end_time: clean(payload.end_time, 5),
  location: clean(payload.location, 120),
  notes: clean(payload.notes, 500),
});

function validEvent(payload) {
  return payload.title && /^\d{4}-\d{2}-\d{2}$/.test(payload.event_date);
}

async function eventsApi(request, env, path) {
  if (!env.DB) return json({ error: 'Shared calendar storage is not configured.' }, 503);
  try {
    if (request.method === 'GET' && path === '/api/events') {
      const { results } = await env.DB.prepare('SELECT id, title, event_date, start_time, end_time, location, notes FROM events ORDER BY event_date, start_time, id').all();
      return json({ events: results });
    }
    const match = path.match(/^\/api\/events\/(\d+)$/);
    const id = match ? Number(match[1]) : null;
    if (request.method === 'POST' && path === '/api/events') {
      const payload = eventPayload(await request.json());
      if (!validEvent(payload)) return json({ error: 'Event name and date are required.' }, 400);
      const result = await env.DB.prepare('INSERT INTO events (title, event_date, start_time, end_time, location, notes) VALUES (?, ?, ?, ?, ?, ?)').bind(payload.title, payload.event_date, payload.start_time, payload.end_time, payload.location, payload.notes).run();
      return json({ id: result.meta.last_row_id, ...payload }, 201);
    }
    if (!id) return json({ error: 'Event not found.' }, 404);
    if (request.method === 'PUT') {
      const payload = eventPayload(await request.json());
      if (!validEvent(payload)) return json({ error: 'Event name and date are required.' }, 400);
      const result = await env.DB.prepare('UPDATE events SET title = ?, event_date = ?, start_time = ?, end_time = ?, location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(payload.title, payload.event_date, payload.start_time, payload.end_time, payload.location, payload.notes, id).run();
      if (!result.meta.changes) return json({ error: 'Event not found.' }, 404);
      return json({ id, ...payload });
    }
    if (request.method === 'DELETE') {
      const result = await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
      if (!result.meta.changes) return json({ error: 'Event not found.' }, 404);
      return json({ deleted: id });
    }
    return json({ error: 'Method not allowed.' }, 405);
  } catch (error) {
    return json({ error: 'The calendar could not complete that request.' }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/events')) return eventsApi(request, env, url.pathname);
    if (url.pathname !== '/' && url.pathname !== '/index.html') return new Response('Not found', { status: 404 });
    return new Response(page, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } });
  },
};
