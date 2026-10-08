const weatherLocations = [
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Kyoto', latitude: 35.0116, longitude: 135.7681 },
  { name: 'Osaka', latitude: 34.6937, longitude: 135.5023 },
];

const weatherCode = (code) => {
  if (code === 0) return 'Clear skies';
  if ([1, 2, 3].includes(code)) return 'Partly cloudy';
  if ([45, 48].includes(code)) return 'Misty';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Light drizzle';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Rain';
  if ([71, 73, 75, 77].includes(code)) return 'Snow';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Forecast available';
};

const showToast = (message) => {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2500);
};

async function loadWeather() {
  const weatherCards = document.getElementById('weather-cards');
  const summary = document.getElementById('weather-summary');
  try {
    const results = await Promise.all(weatherLocations.map(async (location) => {
      const params = new URLSearchParams({
          latitude: location.latitude,
          longitude: location.longitude,
          current: 'temperature_2m,weather_code',
          daily: 'temperature_2m_max,temperature_2m_min',
          temperature_unit: 'fahrenheit',
          forecast_days: '1',
          timezone: 'auto',
        });

          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?${params}`
          );
          
          if (!response.ok) throw new Error('Weather request failed');
          
          const data = await response.json();
          
          return {
            ...location,
            temperature: Math.round(data.current.temperature_2m),
            high: Math.round(data.daily.temperature_2m_max[0]),
            low: Math.round(data.daily.temperature_2m_min[0]),
            condition: weatherCode(data.current.weather_code),
          };
    }));
            weatherCards.innerHTML = results.map((item) => `
              <div class="weather-card">
                <div>
                  <strong>${item.name}</strong>
                  <small>
                    ${item.condition}<br>
                    High ${item.high}°F · Low ${item.low}°F
                  </small>
                </div>
                <span class="weather-temp">${item.temperature}°F</span>
              </div>
            `).join('');    
    const tokyo = results.find((item) => item.name === 'Tokyo');
      summary.textContent = tokyo
    ? `${tokyo.temperature}°F · H ${tokyo.high}°F / L ${tokyo.low}°F`
    : 'Forecast ready';
  } catch (error) {
    weatherCards.innerHTML = '<div class="loading-card">Weather is unavailable right now. Try refreshing when you are online.</div>';
    summary.textContent = 'Weather offline';
  }
}

function initMap() {
  if (!window.L) return;
  const map = L.map('trip-map', { scrollWheelZoom: false }).setView([35.35, 137.8], 5.4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  const stops = [
    { name: 'Tokyo', coords: [35.6762, 139.6503] },
    { name: 'Kyoto', coords: [35.0116, 135.7681] },
    { name: 'Osaka', coords: [34.6937, 135.5023] },
  ];
  L.polyline(stops.map((stop) => stop.coords), { color: '#c94f3e', weight: 3, opacity: .75, dashArray: '7 8' }).addTo(map);
  stops.forEach((stop) => L.marker(stop.coords).addTo(map).bindPopup(`<strong>${stop.name}</strong><br>Update this stop when your route is confirmed.`));
}

function initChecklist() {
  const items = [...document.querySelectorAll('#checklist input')];
  const saved = JSON.parse(localStorage.getItem('japan-trip-checklist') || '[]');
  items.forEach((input, index) => {
    input.checked = Boolean(saved[index]);
    input.addEventListener('change', () => {
      localStorage.setItem('japan-trip-checklist', JSON.stringify(items.map((item) => item.checked)));
      updateCounter(items);
    });
  });
  updateCounter(items);
}

function updateCounter(items) {
  const complete = items.filter((item) => item.checked).length;
  document.getElementById('check-counter').textContent = `${complete} / ${items.length}`;
}

function initNotes() {
  const notes = document.getElementById('quick-notes');
  notes.value = localStorage.getItem('japan-trip-notes') || '';
  notes.addEventListener('input', () => localStorage.setItem('japan-trip-notes', notes.value));
}

const calendarState = { viewDate: new Date(), selectedDate: null, events: [] };
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const displayDate = (key, options = { month: 'long', day: 'numeric', year: 'numeric' }) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, options);
const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const eventTime = (event) => event.start_time ? `${event.start_time}${event.end_time ? `–${event.end_time}` : ''}` : 'All day';

async function loadCalendarEvents() {
  const status = document.getElementById('calendar-status');

  try {
    const response = await fetch('./events.json');

    if (!response.ok) {
      throw new Error('Could not load events');
    }

    const data = await response.json();

    calendarState.events = Array.isArray(data) ? data : [];

    status.textContent = 'Calendar updated from GitHub.';
    status.classList.remove('calendar-error');
  } catch (error) {
    calendarState.events = [];
    status.textContent = 'Calendar events could not be loaded.';
    status.classList.add('calendar-error');
  }

  if (!calendarState.selectedDate) {
    calendarState.selectedDate = dateKey(calendarState.viewDate);
  }

  renderCalendar();
}

function eventsForDate(key) {
  return calendarState.events.filter((event) => event.event_date === key).sort((a, b) => `${a.start_time || '99:99'}${a.title}`.localeCompare(`${b.start_time || '99:99'}${b.title}`));
}

function renderCalendar() {
  const year = calendarState.viewDate.getFullYear();
  const month = calendarState.viewDate.getMonth();
  document.getElementById('calendar-month-label').textContent = calendarState.viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const grid = document.getElementById('calendar-grid');
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = dateKey(new Date());
  let cells = '';
  for (let i = 0; i < firstDay; i += 1) cells += '<div class="calendar-day outside"></div>';
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = dateKey(new Date(year, month, day));
    const events = eventsForDate(key);
    const classes = ['calendar-day'];
    if (key === today) classes.push('today');
    if (key === calendarState.selectedDate) classes.push('selected');
    cells += `<button class="${classes.join(' ')}" data-date="${key}" type="button"><span class="day-number">${day}</span><span class="day-events">${events.slice(0, 2).map((event) => `<span class="calendar-event-chip">${escapeHTML(event.title)}</span>`).join('')}${events.length > 2 ? `<span class="more-events">+${events.length - 2} more</span>` : ''}</span></button>`;
  }
  const totalCells = firstDay + daysInMonth;
  for (let i = totalCells; i < 42; i += 1) cells += '<div class="calendar-day outside"></div>';
  grid.innerHTML = cells;
  grid.querySelectorAll('[data-date]').forEach((button) => button.addEventListener('click', () => { calendarState.selectedDate = button.dataset.date; renderCalendar(); }));
  renderAgenda();
}

function renderAgenda() {
  const key = calendarState.selectedDate;

  document.getElementById('selected-day-label').textContent = key
    ? displayDate(key, { month: 'short', day: 'numeric' })
    : 'Choose a date';

  const container = document.getElementById('selected-day-events');
  const events = key ? eventsForDate(key) : [];

  if (!events.length) {
    container.innerHTML =
      '<p class="empty-agenda">No events scheduled for this day.</p>';
    return;
  }

  container.innerHTML = events
    .map(
      (event) => `
        <article class="agenda-event">
          <div class="agenda-event-time">
            ${escapeHTML(eventTime(event))}
          </div>

          <div class="agenda-event-body">
            <strong>${escapeHTML(event.title)}</strong>

            ${
              event.location
                ? `<small>⌖ ${escapeHTML(event.location)}</small>`
                : ''
            }

            ${
              event.notes
                ? `<p>${escapeHTML(event.notes)}</p>`
                : ''
            }
          </div>
        </article>
      `
    )
    .join('');
}

function openEventDialog(event = null) {
  const selectedDate = event?.event_date || calendarState.selectedDate || dateKey(new Date());
  const dialog = document.createElement('div');
  dialog.className = 'modal-backdrop';
  dialog.innerHTML = `<div class="event-dialog" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title"><div class="dialog-header"><div><p class="eyebrow">${event ? 'Edit event' : 'New event'}</p><h3 id="event-dialog-title">${event ? 'Update calendar event' : 'Add to the trip plan'}</h3></div><button class="dialog-close" type="button" aria-label="Close dialog">×</button></div><form id="event-form"><label>Event name<input name="title" required maxlength="100" value="${escapeHTML(event?.title || '')}" placeholder="Dinner reservation, train, museum…" /></label><div class="form-row"><label>Date<input name="event_date" type="date" required value="${selectedDate}" /></label><label>Start time<input name="start_time" type="time" value="${escapeHTML(event?.start_time || '')}" /></label><label>End time<input name="end_time" type="time" value="${escapeHTML(event?.end_time || '')}" /></label></div><label>Location<input name="location" maxlength="120" value="${escapeHTML(event?.location || '')}" placeholder="Station, neighborhood, restaurant…" /></label><label>Notes<textarea name="notes" maxlength="500" placeholder="Reservation number, meeting point, or anything the group should know.">${escapeHTML(event?.notes || '')}</textarea></label><div class="dialog-actions"><button class="button button-ghost" id="cancel-event" type="button">Cancel</button><button class="button button-dark" type="submit">${event ? 'Save changes' : 'Add event'}</button></div></form></div>`;
  document.body.appendChild(dialog);
  const close = () => dialog.remove();
  dialog.querySelector('.dialog-close').addEventListener('click', close);
  dialog.querySelector('#cancel-event').addEventListener('click', close);
  dialog.addEventListener('click', (click) => { if (click.target === dialog) close(); });
  dialog.querySelector('input[name="title"]').focus();
  dialog.querySelector('#event-form').addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    const form = new FormData(submitEvent.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const saved = await saveEvent(payload, event?.id);
    if (saved) { close(); calendarState.selectedDate = payload.event_date; await loadCalendarEvents(); }
  });
}

async function saveEvent(payload, id = null) {
  const response = await fetch(id ? `/api/events/${id}` : '/api/events', { method: id ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) { showToast('Could not save the event'); return false; }
  showToast(id ? 'Event updated' : 'Event added');
  return true;
}

async function deleteEvent(id) {
  if (!window.confirm('Delete this event from the shared calendar?')) return;
  const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });
  if (!response.ok) { showToast('Could not delete the event'); return; }
  showToast('Event deleted');
  await loadCalendarEvents();
}

function initCalendar() {
  document
    .getElementById('previous-month')
    .addEventListener('click', () => {
      calendarState.viewDate.setMonth(
        calendarState.viewDate.getMonth() - 1
      );
      renderCalendar();
    });

  document
    .getElementById('next-month')
    .addEventListener('click', () => {
      calendarState.viewDate.setMonth(
        calendarState.viewDate.getMonth() + 1
      );
      renderCalendar();
    });

  document
    .getElementById('today-button')
    .addEventListener('click', () => {
      calendarState.viewDate = new Date();
      calendarState.selectedDate = dateKey(new Date());
      renderCalendar();
    });

  loadCalendarEvents();
}

document.getElementById('copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(window.location.href); showToast('Site link copied'); } catch (error) { showToast('Copy unavailable—use the browser address bar'); }
});

document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
}));

loadWeather();
initMap();
initChecklist();
initNotes();
initCalendar();
