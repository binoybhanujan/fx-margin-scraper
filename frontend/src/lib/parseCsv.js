/** Minimal RFC 4180 CSV parser (header row → objects). */

export function parseCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((cols) => {
    /** @type {Record<string, string>} */
    const raw = {};
    for (let i = 0; i < headers.length; i += 1) {
      raw[headers[i]] = cols[i] ?? "";
    }
    return raw;
  });
}

/**
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const next = src[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") {
      rows.push(row);
    }
  }
  return rows;
}
