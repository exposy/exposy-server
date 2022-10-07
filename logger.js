const winston = require('winston');
require('winston-daily-rotate-file');

const combinedTransport = new winston.transports.DailyRotateFile({
  filename: 'combined.log',
  zippedArchive: true,
  maxSize: '20m',
  // need to re-think about the time-span
  maxFiles: '14d',
  dirname: `./logs`,
});

const errorTransport = new winston.transports.DailyRotateFile({
  level: 'error',
  filename: 'error.log',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  dirname: `./logs`,
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [combinedTransport, errorTransport],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = logger;
