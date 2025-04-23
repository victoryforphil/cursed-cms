import { Elysia } from "elysia";
import { Redis } from "ioredis";
import { MinioClient } from "./clients/minio";
import { config } from "./config";
import logger from './logger';
import { assetRoutes } from './routes/asset.routes';
import { cors } from '@elysiajs/cors';
import { opentelemetry } from '@elysiajs/opentelemetry';
import { swagger } from '@elysiajs/swagger';
import { jwt } from '@elysiajs/jwt';
import { cookie } from '@elysiajs/cookie';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

// Initialize Redis client
const redis = new Redis(config.redis.url || 'redis://localhost:6379', {
  enableAutoPipelining: true, // Enable autopipelining for better performance
  showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
});

// Initialize Minio client
const storage = MinioClient.getInstance();
await storage.initialize();

// Create base app with state
const app = new Elysia();

// Apply plugins
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(swagger());

app.use(jwt({
  name: 'jwt',
  secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
}));

app.use(cookie());

app.use(opentelemetry({
  serviceName: 'skystore-server',
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: 'http://localhost:4154/v1/traces',
      })
    )
  ],
}));

// Add state and routes
app.state('redis', redis);

// Enhanced logging middleware
app.onRequest(({ request }) => {
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  const userAgent = request.headers.get('user-agent') || '-';
  
  const logData = {
    method,
    path,
    userAgent
  };
  
  logger.info(`${method} ${path}`);
});

app.use(assetRoutes);

// Start the server
app.listen(4500);

logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

// Cleanup on exit
process.on('SIGTERM', async () => {
  logger.info('Server is shutting down');
  await redis.quit();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Setup Redis event handlers
redis.on('error', (err) => {
  logger.error('Redis Error:', err);
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

export type App = typeof app 
