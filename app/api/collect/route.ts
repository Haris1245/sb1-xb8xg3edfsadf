import { NextResponse } from 'next/server';
import clickhouse from '@/lib/clickhouse';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Insert event
    await clickhouse.insert({
      table: 'events',
      values: [{
        ...data,
        customData: JSON.stringify(data.customData || {}),
        performance: JSON.stringify(data.performance || {}),
        createdAt: new Date(),
      }],
      format: 'JSONEachRow',
    });

    // Update session
    if (data.type === 'page') {
      const session = await clickhouse.query({
        query: `
          SELECT *
          FROM sessions
          WHERE sessionId = {sessionId:String}
          AND websiteId = {websiteId:String}
          LIMIT 1
        `,
        values: {
          sessionId: data.sessionId,
          websiteId: data.websiteId,
        },
      });

      const sessionRows = await session.json();

      if (sessionRows.length === 0) {
        // Create new session
        await clickhouse.insert({
          table: 'sessions',
          values: [{
            sessionId: data.sessionId,
            visitorId: data.visitorId,
            websiteId: data.websiteId,
            startTime: new Date(),
            lastActivity: new Date(),
            device: data.device,
            browser: data.browser,
            os: data.os,
          }],
          format: 'JSONEachRow',
        });
      } else {
        // Update existing session
        await clickhouse.exec({
          query: `
            ALTER TABLE sessions
            UPDATE 
            lastActivity = now(),
            pageviews = pageviews + 1,
            bounced = false
            WHERE sessionId = {sessionId:String}
            AND websiteId = {websiteId:String}
          `,
          values: {
            sessionId: data.sessionId,
            websiteId: data.websiteId,
          },
        });
      }
    }

    // Update visitor
    const visitor = await clickhouse.query({
      query: `
        SELECT *
        FROM visitors
        WHERE visitorId = {visitorId:String}
        AND websiteId = {websiteId:String}
        LIMIT 1
      `,
      values: {
        visitorId: data.visitorId,
        websiteId: data.websiteId,
      },
    });

    const visitorRows = await visitor.json();

    if (visitorRows.length === 0) {
      // Create new visitor
      await clickhouse.insert({
        table: 'visitors',
        values: [{
          visitorId: data.visitorId,
          websiteId: data.websiteId,
          domain: data.domain,
          referrer: data.referrer,
          href: data.href,
          userAgent: data.userAgent,
          country: data.country,
          region: data.region,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          ip: data.ip,
          devices: [data.device],
        }],
        format: 'JSONEachRow',
      });
    } else {
      // Update existing visitor
      await clickhouse.exec({
        query: `
          ALTER TABLE visitors
          UPDATE 
          lastVisit = now(),
          totalVisits = totalVisits + 1,
          devices = arrayDistinct(arrayConcat(devices, [{device:String}]))
          WHERE visitorId = {visitorId:String}
          AND websiteId = {websiteId:String}
        `,
        values: {
          visitorId: data.visitorId,
          websiteId: data.websiteId,
          device: data.device,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error collecting analytics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}