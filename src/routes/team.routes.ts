import { Router } from 'express';
import { prisma } from '../models';
import { authMiddleware, requirePermission, getTenantId } from '../middleware';
import { validateEmail } from '../utils';

const router = Router();

router.use(authMiddleware);

// GET /api/team — list team members for current tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    
    const members = await prisma.teamMember.findMany({
      where: { tenantId },
      orderBy: { invitedAt: 'desc' },
    });
    
    res.json({ data: members });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// POST /api/team/invite — invite a new team member
// TODO: Should send an actual email invitation
router.post('/invite', requirePermission('team:manage'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { email, role } = req.body;
    
    // FIXME: Missing validation on user invite
    // Should validate email format, check role is valid, check if already invited
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // TODO: Actually validate email format
    // if (!validateEmail(email)) { ... }
    
    const validRoles = ['admin', 'editor', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Check if already invited
    const existing = await prisma.teamMember.findFirst({
      where: { tenantId, email },
    });
    
    if (existing) {
      return res.status(409).json({ error: 'Member already invited' });
    }
    
    const member = await prisma.teamMember.create({
      data: {
        tenantId,
        email,
        role: role || 'viewer',
        status: 'pending',
      },
    });
    
    // TODO: Send invitation email here
    // await sendInvitationEmail(email, tenant.name)
    
    res.status(201).json({ data: member });
  } catch (err) {
    res.status(500).json({ error: 'Failed to invite team member' });
  }
});

// DELETE /api/team/:id — remove team member
router.delete('/:id', requirePermission('team:manage'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    
    const member = await prisma.teamMember.findUnique({
      where: { id: req.params.id },
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    if (member.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Soft delete — mark as removed
    await prisma.teamMember.update({
      where: { id: req.params.id },
      data: { status: 'removed' },
    });
    
    res.json({ message: 'Team member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// PUT /api/team/:id/role — update team member role
router.put('/:id/role', requirePermission('team:manage'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { role } = req.body;
    
    const validRoles = ['admin', 'editor', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const member = await prisma.teamMember.findUnique({
      where: { id: req.params.id },
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    if (member.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updated = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: { role },
    });
    
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update team member role' });
  }
});

export default router;
