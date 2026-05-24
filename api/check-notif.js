const DEFAULT_TIMEZONE = 'America/Toronto';
const DEFAULT_DAILY_TIME = '20:30';
const DEFAULT_WATER_HOURS = [10, 13, 16, 19];
const NOTIFY_KEY = 'private_dashboard_notifications_v1';

function asciiOnly(value) {
  return String(value || '').replace(/[^\x20-\x7E]/g, '');
}

function send(res, body) {
  if (typeof body === 'string') {
    res.status(200).send(body);
    return;
  }
  res.status(200).json(body);
}

function getQuery(req, key) {
  const value = req.query && req.query[key];
  return Array.isArray(value) ? value[0] : value;
}

function getHourParts(timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date());
  const out = {};
  for (const part of parts) out[part.type] = part.value;
  let hour = Number(out.hour);
  if (hour === 24) hour = 0;
  return {
    currentHour: hour,
    currentMinute: Number(out.minute),
    dateKey: `${out.year}-${out.month}-${out.day}`,
  };
}

function timeToHour(value, fallback) {
  const raw = String(value || fallback || DEFAULT_DAILY_TIME);
  const hour = Number(raw.split(':')[0]);
  return Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 20;
}

function parseHours(value, fallback) {
  if (!value) return fallback;
  const hours = String(value)
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isInteger(x) && x >= 0 && x <= 23);
  return hours.length ? hours : fallback;
}

function getWaterProgress(state, dateKey) {
  const water = state && state.po_water_v1;
  if (!water || typeof water !== 'object') return { done: 0, total: 0 };
  const done = (water.logs || {})[dateKey] || 0;
  const profile = water.profile || { weightKg: 75 };
  const weightKg = water.weightUnit === 'lb'
    ? (profile.weightKg || 0) / 2.20462
    : (profile.weightKg || 0);
  const base = weightKg * 35;
  const exercise = ((profile.activityHrsPerWeek || 0) / 7) * 500;
  const caffeine = Math.max(0, (water.caffeineMgPerDay || 0) - 200) * 1.5;
  const substances = (water.substances || []).reduce((sum, item) => {
    const dose = (item && item.dose != null ? item.dose : item && item.defaultDose) || 0;
    return sum + Math.max(0, dose * ((item && item.mlPerUnit) || 0));
  }, 0);
  let adjust = 0;
  if (profile.sex === 'm') adjust += 200;
  if ((profile.age || 0) >= 50) adjust += 100;
  const totalMl = base + exercise + caffeine + substances + adjust;
  let unitVol = water.bottleMl || 500;
  if (water.unit === 'glass') unitVol = water.glassMl || 250;
  if (water.unit === 'oz') unitVol = 30;
  if (water.unit === 'ml') unitVol = 1;
  return { done, total: Math.max(1, Math.ceil(totalMl / unitVol)) };
}

async function loadBackendState() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appKey = process.env.NOTIF_APP_STATE_KEY || 'health';

  if (!supabaseUrl || !supabaseKey) {
    return { data: {}, error: 'Missing SUPABASE_URL or SUPABASE key env var.' };
  }

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/app_state?key=eq.${encodeURIComponent(appKey)}&select=data`;
  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });
  if (!response.ok) {
    return { data: {}, error: `Supabase status ${response.status}` };
  }
  const rows = await response.json();
  return { data: rows && rows[0] && rows[0].data ? rows[0].data : {}, error: null };
}

async function publishNtfy(title, body) {
  const topic = process.env.NTFY_TOPIC;
  const server = process.env.NTFY_SERVER || 'https://ntfy.sh';
  if (!topic) return { sent: false, status: 0, error: 'Missing NTFY_TOPIC env var.' };

  const response = await fetch(`${server.replace(/\/$/, '')}/${encodeURIComponent(topic)}`, {
    method: 'POST',
    headers: {
      Title: asciiOnly(title),
      Priority: process.env.NTFY_PRIORITY || 'default',
      Tags: asciiOnly(process.env.NTFY_TAGS || ''),
    },
    body: asciiOnly(body),
  });

  return { sent: response.ok, status: response.status, text: await response.text() };
}

function notificationSettings(state) {
  const settings = state && state[NOTIFY_KEY] && typeof state[NOTIFY_KEY] === 'object'
    ? state[NOTIFY_KEY]
    : {};
  const envEnabled = String(process.env.NOTIF_ENABLED || '').toLowerCase();
  const enabledByEnv = envEnabled === '1' || envEnabled === 'true' || envEnabled === 'yes';
  return {
    enabled: settings.enabled === true || enabledByEnv,
    water: settings.water !== false,
    daily: settings.daily !== false,
    dailyTime: settings.dailyTime || process.env.NOTIF_DAILY_TIME || DEFAULT_DAILY_TIME,
  };
}

function buildDueMessages(state, settings, clock) {
  const messages = [];
  const dailyHour = timeToHour(settings.dailyTime, DEFAULT_DAILY_TIME);
  const wakeHour = timeToHour(process.env.NOTIF_WAKE_TIME, process.env.NOTIF_WAKE_HOUR || '');
  const waterHours = parseHours(process.env.NOTIF_WATER_HOURS, DEFAULT_WATER_HOURS);
  const water = getWaterProgress(state, clock.dateKey);

  if (process.env.NOTIF_WAKE_HOUR || process.env.NOTIF_WAKE_TIME) {
    if (clock.currentHour === wakeHour) {
      messages.push({
        kind: 'wake',
        title: 'Dashboard wake check',
        body: 'Open your dashboard and set the day up.',
      });
    }
  }

  if (settings.water && waterHours.includes(clock.currentHour) && water.total && water.done < water.total) {
    messages.push({
      kind: 'water',
      title: 'Water check',
      body: `Water today: ${water.done}/${water.total}.`,
    });
  }

  if (settings.daily && clock.currentHour === dailyHour) {
    messages.push({
      kind: 'daily',
      title: 'Daily check-in',
      body: 'Review goals, health, and training for today.',
    });
  }

  return { messages, dailyHour, wakeHour, waterHours, water };
}

module.exports = async function handler(req, res) {
  try {
    const timezone = process.env.NOTIF_TIMEZONE || process.env.TZ || DEFAULT_TIMEZONE;
    const clock = getHourParts(timezone);

    if (getQuery(req, 'test') === '1') {
      try {
        const result = await publishNtfy('Dashboard test', 'Test notification from Vercel.');
        send(res, { ok: true, test: true, ntfy: result });
      } catch (error) {
        send(res, { ok: false, test: true, error: asciiOnly(error && error.message) });
      }
      return;
    }

    const backend = await loadBackendState();
    const settings = notificationSettings(backend.data);
    const due = buildDueMessages(backend.data, settings, clock);

    if (getQuery(req, 'debug') === '1') {
      send(res, {
        ok: true,
        timezone,
        currentHour: clock.currentHour,
        currentMinute: clock.currentMinute,
        dateKey: clock.dateKey,
        enabled: settings.enabled,
        dailyHour: due.dailyHour,
        wakeHour: due.wakeHour,
        waterHours: due.waterHours,
        water: due.water,
        due: due.messages.map((message) => message.kind),
        backendError: backend.error,
      });
      return;
    }

    if (settings.enabled && !backend.error) {
      for (const message of due.messages) {
        try {
          await publishNtfy(message.title, message.body);
        } catch (error) {
          // Keep cron-job.org green; use ?test=1 or ?debug=1 to inspect failures.
        }
      }
    }

    send(res, 'ok');
  } catch (error) {
    send(res, { ok: false, error: asciiOnly(error && error.message) });
  }
};
