import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Users, Clock, MousePointer } from "lucide-react";
import clickhouse from "@/lib/clickhouse";

async function getAnalytics(websiteId: string, period: string = '24h') {
  const visitors = await clickhouse.query({
    query: `
      SELECT count(DISTINCT visitorId) as total
      FROM events
      WHERE websiteId = {websiteId:String}
      AND createdAt >= now() - INTERVAL ${period}
    `,
    values: { websiteId },
  });

  const pageviews = await clickhouse.query({
    query: `
      SELECT count(*) as total
      FROM events
      WHERE websiteId = {websiteId:String}
      AND type = 'page'
      AND createdAt >= now() - INTERVAL ${period}
    `,
    values: { websiteId },
  });

  const avgEngagementTime = await clickhouse.query({
    query: `
      SELECT avg(engagementTime) as average
      FROM events
      WHERE websiteId = {websiteId:String}
      AND type = 'engagement'
      AND createdAt >= now() - INTERVAL ${period}
    `,
    values: { websiteId },
  });

  const bounceRate = await clickhouse.query({
    query: `
      SELECT (COUNT(IF(pageviews = 1, 1, NULL)) * 100.0 / COUNT(*)) as rate
      FROM sessions
      WHERE websiteId = {websiteId:String}
      AND startTime >= now() - INTERVAL ${period}
    `,
    values: { websiteId },
  });

  return {
    visitors: await visitors.json(),
    pageviews: await pageviews.json(),
    avgEngagementTime: await avgEngagementTime.json(),
    bounceRate: await bounceRate.json(),
  };
}

export default async function Dashboard() {
  const websiteId = "your-website-id"; // In production, get this from auth context
  const analytics = await getAnalytics(websiteId);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>
      
      <Tabs defaultValue="24h" className="mb-8">
        <TabsList>
          <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Unique Visitors</p>
              <h3 className="text-2xl font-bold">{analytics.visitors.total}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Activity className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Page Views</p>
              <h3 className="text-2xl font-bold">{analytics.pageviews.total}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Clock className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Avg. Engagement Time</p>
              <h3 className="text-2xl font-bold">
                {Math.round(analytics.avgEngagementTime.average)}s
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <MousePointer className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Bounce Rate</p>
              <h3 className="text-2xl font-bold">
                {Math.round(analytics.bounceRate.rate)}%
              </h3>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}