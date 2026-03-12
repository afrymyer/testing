/**
 * Structured Logger (Pino)
 *
 * Replaces scattered console.log/warn/error with structured, leveled logging.
 * In production, outputs JSON. In dev, outputs pretty-printed.
 */
const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } }
    : undefined,
});

module.exports = logger;
