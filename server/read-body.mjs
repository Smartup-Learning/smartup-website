const tooLarge = () => Object.assign(new Error('Request is too large.'), { status: 413 });

/** Reads a request body up to `limit` bytes. A larger body rejects with status 413 and is drained, not stored. */
export function readBuffer(req, limit) {
  return new Promise((resolve, reject) => {
    if (Number(req.headers['content-length']) > limit) return reject(tooLarge());
    const chunks = [];
    let length = 0;
    const onData = chunk => {
      length += chunk.length;
      if (length <= limit) return chunks.push(chunk);
      req.off('data', onData);
      req.resume();
      reject(tooLarge());
    };
    req.on('data', onData);
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
