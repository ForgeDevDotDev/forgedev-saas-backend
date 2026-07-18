import { Router } from 'express';
import { prisma } from '../models';
import { authMiddleware, requirePermission, getTenantId } from '../middleware';
import { exportToCSV } from '../utils';

const router = Router();

router.use(authMiddleware);

// GET /api/analytics/events — list analytics events for current tenant
router.get('/events', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    
    const { page = '1', limit = '20', eventType } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = { tenantId };
    if (eventType) {
      where.eventType = eventType as string;
    }
    
    const events = await prisma.analyticsEvent.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    });
    
    const total = await prisma.analyticsEvent.count({ where });
    
    res.json({
      data: events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/analytics/aggregate — aggregate query for dashboards
// FIXME: This endpoint has an N+1 query problem that causes timeouts with large datasets
router.get('/aggregate', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    
    const { startDate, endDate, groupBy = 'eventType' } = req.query;
    
    // BUG: This query loads ALL events into memory and then aggregates in JS
    // With large datasets this will timeout or OOM
    // TODO: Replace with proper Prisma groupBy or raw SQL
    const events = await prisma.analyticsEvent.findMany({
      where: {
        tenantId,
        ...(startDate && { createdAt: { gte: new Date(startDate as string) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate as string) } }),
      },
    });
    
    // N+1 problem: for each unique label, we do another query
    const labels = [...new Set(events.map(e => e.label))];
    
    const aggregated: any = {};
    for (const label of labels) {
      // FIXME: This is the N+1 — fetching per label
      const labelEvents = await prisma.analyticsEvent.findMany({
        where: { tenantId, label },
      });
      
      const grouped: any = {};
      for (const event of labelEvents) {
        const key = event[groupBy as string] || 'unknown';
        if (!grouped[key]) {
          grouped[key] = { count: 0, sum: 0 };
        }
        grouped[key].count++;
        grouped[key].sum += event.value;
      }
      
      aggregated[label] = grouped;
    }
    
    res.json({ data: aggregated });
  } catch (err) {
    console.error('Aggregate error:', err);
    // FIXME: Should return 408 or 503 on timeout, not 500
    res.status(500).json({ error: 'Aggregate query failed — may timeout with large datasets' });
  }
});

// GET /api/analytics/summary — quick summary stats
router.get('/summary', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    
    const totalEvents = await prisma.analyticsEvent.count({
      where: { tenantId },
    });
    
    const eventTypes = await prisma.analyticsEvent.findMany({
      where: { tenantId },
      select: { eventType: true, value: true },
    });
    
    // Group by eventType in memory
    // FIXME: Should use Prisma groupBy instead
    const summary: any = {};
    for (const e of eventTypes) {
      if (!summary[e.eventType]) {
        summary[e.eventType] = { count: 0, total: 0 };
      }
      summary[e.eventType].count++;
      summary[e.eventType].total += e.value;
    }
    
    res.json({
      data: {
        totalEvents,
        byType: summary,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

// POST /api/analytics/events — create an analytics event
router.post('/events', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { eventType, value, label } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }
    
    const event = await prisma.analyticsEvent.create({
      data: {
        tenantId,
        eventType,
        value: value || 0,
        label: label || 'unknown',
      },
    });
    
    res.status(201).json({ data: event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// GET /api/analytics/export — export analytics data
// TODO: This feature was never completed — dead code
router.get('/export', requirePermission('analytics:export'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { format = 'csv' } = req.query;
    
    // FIXME: This loads ALL events into memory
    const events = await prisma.analyticsEvent.findMany({
      where: { tenantId },
    });
    
    if (format === 'csv') {
      const csv = exportToCSV(events);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
      return res.send(csv);
    }
    
    // TODO: Support xlsx and json formats
    res.json({ data: events });
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
