import { Router } from 'express';
import { prisma } from '../models';
import { authMiddleware, getTenantId } from '../middleware';

const router = Router();

router.use(authMiddleware);

// GET /api/settings — get settings for current tenant
// BUG: Missing RBAC check — any authenticated user can view and change settings
// TODO: Add requirePermission('settings:manage') to PUT route
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    
    let settings = await prisma.settings.findUnique({
      where: { tenantId },
    });
    
    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.settings.create({
        data: { tenantId },
      });
    }
    
    res.json({ data: settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings — update settings
// FIXME: No permission check here! Any user (even viewers) can change tenant settings
// Should be: router.put('/', requirePermission('settings:manage'), ...)
router.put('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    
    const { theme, language, timezone, notificationsEnabled, exportFormat, retentionDays } = req.body;
    
    let settings = await prisma.settings.findUnique({
      where: { tenantId },
    });
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: { tenantId },
      });
    }
    
    settings = await prisma.settings.update({
      where: { tenantId },
      data: {
        ...(theme && { theme }),
        ...(language && { language }),
        ...(timezone && { timezone }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled }),
        ...(exportFormat && { exportFormat }),
        ...(retentionDays !== undefined && { retentionDays }),
      },
    });
    
    res.json({ data: settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
