const formatPayload = (payload) => {
    if (!payload || Object.keys(payload).length === 0) {
        return null;
    }

    try {
        return JSON.stringify(payload, null, 2);
    } catch (error) {
        return '[unserializable payload]';
    }
};

const requestLogger = (req, res, next) => {
    const start = process.hrtime();
    const { method, originalUrl, query, body } = req;
    const pathOnly = originalUrl.split('?')[0];
    const skipLogPaths = new Set(['/api/leads/followup/needed']);

    if (skipLogPaths.has(pathOnly)) {
        next();
        return;
    }
    const formattedQuery = formatPayload(query);
    const formattedBody = formatPayload(body);

    console.log(`[Request] ${method} ${originalUrl}`);
    if (formattedQuery) {
        console.log(`[Request Query] ${formattedQuery}`);
    }
    if (formattedBody) {
        console.log(`[Request Body] ${formattedBody}`);
    }

    res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const durationMs = (seconds * 1000 + nanoseconds / 1_000_000).toFixed(2);
        console.log(
            `[Response] ${method} ${originalUrl} → ${res.statusCode} (${durationMs} ms)`
        );
    });

    next();
};

module.exports = requestLogger;
