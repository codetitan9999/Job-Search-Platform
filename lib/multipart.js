function readRequestBuffer(request, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    request.on("data", (chunk) => {
      totalBytes += chunk.length;

      if (totalBytes > maxBytes) {
        const error = new Error("Request body too large.");
        error.statusCode = 413;
        reject(error);
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    request.on("error", reject);
  });
}

function parseHeaders(rawHeaders) {
  const headers = {};

  rawHeaders.split("\r\n").forEach((line) => {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      return;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    headers[key] = value;
  });

  return headers;
}

function parseContentDisposition(headerValue = "") {
  const parameters = {};

  headerValue.split(";").slice(1).forEach((segment) => {
    const separatorIndex = segment.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = segment.slice(0, separatorIndex).trim();
    const value = segment
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^"|"$/g, "");

    parameters[key] = value;
  });

  return parameters;
}

async function readJsonRequest(request) {
  const buffer = await readRequestBuffer(request);

  if (!buffer.length) {
    return {};
  }

  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    const parseError = new Error("Invalid JSON body.");
    parseError.statusCode = 400;
    throw parseError;
  }
}

async function parseMultipartRequest(request) {
  const contentType = request.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    const error = new Error("Missing multipart boundary.");
    error.statusCode = 400;
    throw error;
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const rawBody = (await readRequestBuffer(request)).toString("latin1");
  const parts = rawBody.split(`--${boundary}`).slice(1, -1);
  const fields = {};
  const files = {};

  parts.forEach((part) => {
    const normalizedPart = part.replace(/^\r\n/, "").replace(/\r\n$/, "");

    if (!normalizedPart.trim()) {
      return;
    }

    const headerSeparatorIndex = normalizedPart.indexOf("\r\n\r\n");

    if (headerSeparatorIndex === -1) {
      return;
    }

    const rawHeaders = normalizedPart.slice(0, headerSeparatorIndex);
    const rawContent = normalizedPart.slice(headerSeparatorIndex + 4);
    const headers = parseHeaders(rawHeaders);
    const disposition = parseContentDisposition(headers["content-disposition"]);

    if (!disposition.name) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(disposition, "filename")) {
      files[disposition.name] = {
        filename: disposition.filename,
        contentType: headers["content-type"] || "application/octet-stream",
        data: Buffer.from(rawContent, "latin1"),
      };
      return;
    }

    fields[disposition.name] = Buffer.from(rawContent, "latin1").toString("utf8");
  });

  return { fields, files };
}

module.exports = {
  parseMultipartRequest,
  readJsonRequest,
};
