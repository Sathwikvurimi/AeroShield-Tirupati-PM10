export const formatISTTime = (ts) => {
  if (!ts) {
    return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  }

  const str = String(ts).trim();
  if (str.includes('+05:30') || str.endsWith('Z') || str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    }
  }

  const parts = str.split(' ');
  const timePart = parts.length > 1 ? parts[1] : parts[0];

  if (/^\d{2}:\d{2}:\d{2}$/.test(timePart)) {
    const [h, m, s] = timePart.split(':').map(Number);
    const now = new Date();
    const currentIstHour = Number(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }));

    const diff = (currentIstHour - h + 24) % 24;
    if (diff === 5 || diff === 6) {
      let totalMins = h * 60 + m + 330;
      let istH = String(Math.floor((totalMins / 60) % 24)).padStart(2, '0');
      let istM = String(totalMins % 60).padStart(2, '0');
      let istS = String(s).padStart(2, '0');
      return `${istH}:${istM}:${istS}`;
    }

    return timePart;
  }

  return timePart;
};

export const formatISTFull = (ts) => {
  if (!ts) return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const timeStr = formatISTTime(ts);
  const dateStr = ts && ts.includes(' ') ? ts.split(' ')[0] : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return `${dateStr} ${timeStr}`;
};
