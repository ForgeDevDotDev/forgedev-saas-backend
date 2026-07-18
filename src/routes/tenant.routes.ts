import { Router } from 'express';
import { prisma } from '../models';
import { authMiddleware, requirePermission, getTenantId } from '../middleware';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/tenants — get current tenant info
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { settings: true },
    });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({ data: tenant });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

// GET /api/tenants/:id
router.get('/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const requestedId = req.params.id;
    
    // FIXME: Should check if user belongs to this tenant
    // Currently just returns whatever tenant is requested
    const tenant = await prisma.tenant.findUnique({
      where: { id: requestedId },
      include: { settings: true },
    });
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({ data: tenant });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

// PUT /api/tenants/:id
router.put('/:id', requirePermission('settings:manage'), async (req, res) => {
  try {
    const { name, plan } = req.body;
    
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(plan && { plan }),
      },
    });
    
    res.json({ data: tenant });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// DELETE /api/tenants/:id
router.delete('/:id', requirePermission('settings:manage'), async (req, res) => {
  try {
    // TODO: Add cascade delete check — this could leave orphaned records
    await prisma.tenant.delete({ where: { id: req.params.id } });
    
    // Inconsistent response — some routes return 204, some return JSON
    res.json({ message: 'Tenant deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

export default router;
