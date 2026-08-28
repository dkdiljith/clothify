import winston from 'winston';
const { createLogger, format, transports } = winston;
import 'winston-daily-rotate-file'; // Imports the rotation module

// Base format for files (clean text, no weird color codes)
const baseFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
);

// Configuration for daily rotating log files
const fileRotateTransport = new transports.DailyRotateFile({
  filename: 'logs/app-%DATE%.log', // Files will be named like logs/app-2026-08-12.log
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,             // Compresses old logs into .gz files to save space
  maxSize: '20m',                  // Splits the file if it exceeds 20 Megabytes
  maxFiles: '14d'                  // Automatically deletes files older than 14 days
});

const logger = createLogger({
  level: "info",
  format: baseFormat,
  transports: [
    // 1. Colorful logs in your terminal window
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }), 
        baseFormat
      )
    }),
    // Automated rotating logs saved to your disk
    fileRotateTransport
  ],
});

// Catch global unexpected app crashes automatically
logger.exceptions.handle(
  new transports.DailyRotateFile({
    filename: 'logs/exceptions-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d'
  })
);

module.exports = logger;
