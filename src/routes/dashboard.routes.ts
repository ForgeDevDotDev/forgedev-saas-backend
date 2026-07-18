import { Router } from 'express';
import { prisma } from '../models';
import { authMiddleware, requirePermission, getTenantId } from '../middleware';

const router = Router();

router.use(authMiddleware);

// GET /api/dashboards — list dashboards for current tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    
    const dashboards = await prisma.dashboard.findMany({
      where: { tenantId },
      include: { widgets: true },
    });
    
    res.json({ data: dashboards });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboards' });
  }
});

// GET /api/dashboards/:id
router.get('/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: req.params.id },
      include: { widgets: true },
    });
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    // Tenant isolation check
    if (dashboard.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ data: dashboard });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// POST /api/dashboards — create dashboard
router.post('/', requirePermission('dashboard:create'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Dashboard name is required' });
    }
    
    const dashboard = await prisma.dashboard.create({
      data: { name, tenantId },
    });
    
    res.status(201).json({ data: dashboard });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

// PUT /api/dashboards/:id
router.put('/:id', requirePermission('dashboard:edit'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name } = req.body;
    
    // Check tenant isolation
    const existing = await prisma.dashboard.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    if (existing.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const dashboard = await prisma.dashboard.update({
      where: { id: req.params.id },
      data: { ...(name && { name }) },
    });
    
    res.json({ data: dashboard });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
});

// DELETE /api/dashboards/:id
router.delete('/:id', requirePermission('dashboard:delete'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    
    const existing = await prisma.dashboard.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    if (existing.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await prisma.dashboard.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

export default router;
