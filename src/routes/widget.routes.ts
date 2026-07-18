import { Router } from 'express';
import { prisma } from '../models';
import { authMiddleware, requirePermission, getTenantId } from '../middleware';

const router = Router();

router.use(authMiddleware);

// GET /api/widgets?dashboardId=xxx
router.get('/', async (req, res) => {
  try {
    const { dashboardId } = req.query;
    const tenantId = getTenantId(req);
    
    if (!dashboardId) {
      return res.status(400).json({ error: 'dashboardId is required' });
    }
    
    // Verify dashboard belongs to tenant
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId as string },
    });
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    if (dashboard.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const widgets = await prisma.widget.findMany({
      where: { dashboardId: dashboardId as string },
    });
    
    res.json({ data: widgets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// GET /api/widgets/:id
router.get('/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    
    const widget = await prisma.widget.findUnique({
      where: { id: req.params.id },
      include: { dashboard: true },
    });
    
    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }
    
    // Check tenant isolation via dashboard
    if (widget.dashboard.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ data: widget });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch widget' });
  }
});

// POST /api/widgets
router.post('/', requirePermission('widget:create'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { dashboardId, type, title, dataSource, config, position, width, height } = req.body;
    
    if (!dashboardId || !type || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify dashboard belongs to tenant
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
    });
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    if (dashboard.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const widget = await prisma.widget.create({
      data: {
        dashboardId,
        type,
        title,
        dataSource: dataSource || 'analytics_events',
        config: config || '{}',
        position: position || 0,
        width: width || 6,
        height: height || 4,
      },
    });
    
    res.status(201).json({ data: widget });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create widget' });
  }
});

// PUT /api/widgets/:id
router.put('/:id', requirePermission('widget:edit'), async (req, res) => {
  try {
    const { type, title, dataSource, config, position, width, height } = req.body;
    
    const widget = await prisma.widget.update({
      where: { id: req.params.id },
      data: {
        ...(type && { type }),
        ...(title && { title }),
        ...(dataSource && { dataSource }),
        ...(config && { config }),
        ...(position !== undefined && { position }),
        ...(width && { width }),
        ...(height && { height }),
      },
    });
    
    res.json({ data: widget });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

// DELETE /api/widgets/:id
router.delete('/:id', requirePermission('widget:delete'), async (req, res) => {
  try {
    // FIXME: Should check tenant isolation here too
    await prisma.widget.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete widget' });
  }
});

export default router;
