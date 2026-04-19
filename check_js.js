const utcStr = '2026-04-18T09:59:57.801163+00:00';
const formatTW = (utcStr, options) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Taipei',
      ...options
    }).format(new Date(utcStr));
  } catch (e) {
    return "—";
  }
};

const dateStr = formatTW(utcStr, { month: 'numeric', day: 'numeric' });
const timeStr = formatTW(utcStr, { hour: '2-digit', minute: '2-digit', hour12: false });
console.log(`Original: ${utcStr}`);
console.log(`Date: ${dateStr}`);
console.log(`Time: ${timeStr}`);
