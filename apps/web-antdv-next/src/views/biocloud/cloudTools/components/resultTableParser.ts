interface TableColumn {
  dataIndex: string;
  ellipsis: boolean;
  key: string;
  title: string;
}

interface ParsedResultTable {
  columns: TableColumn[];
  data: Array<Record<string, number | string>>;
}

const countDelimiter = (line: string, delimiter: string) => {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      count += 1;
    }
  }

  return count;
};

const detectDelimiter = (headerLine: string) => {
  const candidates = [',', '\t', ';'];
  return candidates.reduce((best, delimiter) => {
    return countDelimiter(headerLine, delimiter) >
      countDelimiter(headerLine, best)
      ? delimiter
      : best;
  }, '\t');
};

const parseDelimitedLine = (line: string, delimiter: string) => {
  const values: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
};

export const parseResultTable = (text: string): ParsedResultTable => {
  const lines = text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0);

  if (lines.length === 0) return { columns: [], data: [] };

  const delimiter = detectDelimiter(lines[0]!);
  const headers = parseDelimitedLine(lines[0]!, delimiter);
  const columns = headers.map((header) => ({
    title: header,
    dataIndex: header,
    key: header,
    ellipsis: true,
  }));

  const data = lines.slice(1).map((line, index) => {
    const values = parseDelimitedLine(line, delimiter);
    const row: Record<string, number | string> = { key: index };

    headers.forEach((header, columnIndex) => {
      row[header] = values[columnIndex] ?? '';
    });

    return row;
  });

  return { columns, data };
};
