import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: combine(
    colorize({ error: true, warn: true, info: true, debug: true }),
    timestamp({
      format: 'YYYY-MM-DD hh:mm:ss.SSS',
    }),
    printf((info) => `[${info.timestamp}] [${info.level}] ${info.message}`)
  ),
  transports: [new winston.transports.Console()], // print to console
});

export default logger;
