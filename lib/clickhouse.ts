import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'analytics'
});

export const initClickhouse = async () => {
  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS events (
        id UUID DEFAULT generateUUIDv4(),
        visitorId String,
        sessionId String,
        name String,
        customData String,
        type String,
        websiteId String,
        domain String,
        referrer String,
        href String,
        userAgent String,
        country String,
        region String,
        city String,
        latitude Nullable(Float64),
        longitude Nullable(Float64),
        timezone String,
        ip String,
        createdAt DateTime DEFAULT now(),
        sessionStart DateTime,
        performance String,
        engagementTime Nullable(Int32),
        scrollDepth Nullable(Int32),
        exitType Nullable(String)
      )
      ENGINE = MergeTree()
      ORDER BY (websiteId, createdAt);
    `
  });

  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID DEFAULT generateUUIDv4(),
        sessionId String,
        visitorId String,
        websiteId String,
        startTime DateTime,
        lastActivity DateTime,
        engagementTime Int32 DEFAULT 0,
        pageviews Int32 DEFAULT 0,
        bounced Boolean DEFAULT true,
        device String,
        browser String,
        os String,
        createdAt DateTime DEFAULT now(),
        updatedAt DateTime DEFAULT now()
      )
      ENGINE = MergeTree()
      ORDER BY (websiteId, startTime);
    `
  });

  await clickhouse.exec({
    query: `
      CREATE TABLE IF NOT EXISTS visitors (
        id UUID DEFAULT generateUUIDv4(),
        visitorId String,
        websiteId String,
        domain String,
        firstVisit DateTime DEFAULT now(),
        lastVisit DateTime DEFAULT now(),
        totalVisits Int32 DEFAULT 1,
        totalSessions Int32 DEFAULT 1,
        devices Array(String),
        referrer String,
        href String,
        userAgent String,
        country String,
        region String,
        city String,
        latitude Nullable(Float64),
        longitude Nullable(Float64),
        timezone String,
        ip String,
        createdAt DateTime DEFAULT now(),
        updatedAt DateTime DEFAULT now()
      )
      ENGINE = MergeTree()
      ORDER BY (websiteId, visitorId);
    `
  });
};

export default clickhouse;