import { Router } from 'express';
import { prisma } from '../models';
import { authMiddleware, requirePermission, getTenantId } from '../middleware';
import { validateEmail } from '../utils';

const router = Router();

router.use(authMiddleware);

// GET /api/users — list users in current tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    
    const users = await prisma.user.findMany({
      where: { tenantId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });
    
    // Strip passwords from response
    const safeUsers = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
    
    res.json({ data: safeUsers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { userRoles: { include: { role: true } } },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check tenant isolation
    if (user.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { password, ...safeUser } = user;
    res.json({ data: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users — create user within tenant (admin only)
router.post('/', requirePermission('users:manage'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { email, password, name, roleName } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // TODO: Hash password
    const user = await prisma.user.create({
      data: { email, password, name, tenantId },
    });
    
    if (roleName) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (role) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId: role.id },
        });
      }
    }
    
    const { password: _, ...safeUser } = user;
    res.status(201).json({ data: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id
router.put('/:id', requirePermission('users:manage'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, email } = req.body;
    
    // Check user belongs to same tenant
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (existing.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
    });
    
    const { password, ...safeUser } = user;
    res.json({ data: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requirePermission('users:manage'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PUT /api/users/:id/role — assign role to user
router.put('/:id/role', requirePermission('users:manage'), async (req, res) => {
  try {
    const { roleName } = req.body;
    
    if (!roleName) {
      return res.status(400).json({ error: 'Role name required' });
    }
    
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Remove existing roles and assign new one
    await prisma.userRole.deleteMany({ where: { userId: req.params.id } });
    await prisma.userRole.create({
      data: { userId: req.params.id, roleId: role.id },
    });
    
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

export default router;
