interface ExampleDownloadSource {
  name?: string;
  url?: string;
}

type HeaderLike =
  | Headers
  | Map<string, string>
  | Record<string, string | undefined>
  | undefined;

const getHeader = (headers: HeaderLike, key: string): string | undefined => {
  if (!headers) return undefined;

  const getter = (headers as { get?: (name: string) => null | string }).get;
  if (typeof getter === 'function') {
    return (
      getter.call(headers, key) ??
      getter.call(headers, key.toLowerCase()) ??
      undefined
    );
  }

  const record = headers as Record<string, string | undefined>;
  return (
    record[key] ??
    record[key.toLowerCase()] ??
    Object.entries(record).find(
      ([headerKey]) => headerKey.toLowerCase() === key.toLowerCase(),
    )?.[1]
  );
};

const decodeFilename = (value: string): string => {
  const trimmed = value.trim().replace(/^"|"$/g, '');

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
};

export const filenameFromContentDisposition = (
  contentDisposition?: string,
): string | undefined => {
  if (!contentDisposition) return undefined;

  const encodedFilename = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(
    contentDisposition,
  )?.[1];
  if (encodedFilename) return decodeFilename(encodedFilename);

  const filename = /filename\s*=\s*([^;]+)/i.exec(contentDisposition)?.[1];
  return filename ? decodeFilename(filename) : undefined;
};

const filenameFromUrl = (url?: string): string | undefined => {
  if (!url) return undefined;

  const pathname = url.split(/[?#]/)[0] ?? '';
  const basename = pathname.split('/').filter(Boolean).pop();
  return basename ? decodeFilename(basename) : undefined;
};

export const getExampleDownloadFilename = (
  example: ExampleDownloadSource,
  headers?: HeaderLike,
): string => {
  return (
    filenameFromContentDisposition(getHeader(headers, 'content-disposition')) ??
    filenameFromUrl(example.url) ??
    example.name ??
    'example_data.csv'
  );
};
