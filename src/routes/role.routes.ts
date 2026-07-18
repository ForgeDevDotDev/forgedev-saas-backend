import { Router } from 'express';
import { prisma } from '../models';
import { authMiddleware, requirePermission } from '../middleware';

const router = Router();

router.use(authMiddleware);

// GET /api/roles — list all roles
router.get('/', async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: true },
    });
    
    res.json({ data: roles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /api/roles/:id
router.get('/:id', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { permissions: true, userRoles: true },
    });
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json({ data: role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// POST /api/roles — create new role (admin only)
router.post('/', requirePermission('users:manage'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    
    const role = await prisma.role.create({
      data: { name, description },
    });
    
    res.status(201).json({ data: role });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Role already exists' });
    }
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// PUT /api/roles/:id
router.put('/:id', requirePermission('users:manage'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
      },
    });
    
    res.json({ data: role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/roles/:id
router.delete('/:id', requirePermission('users:manage'), async (req, res) => {
  try {
    // FIXME: Should check if any users still have this role before deleting
    await prisma.role.delete({ where: { id: req.params.id } });
    res.json({ message: 'Role deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// POST /api/roles/:id/permissions — add permission to role
router.post('/:id/permissions', requirePermission('users:manage'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Permission name required' });
    }
    
    const permission = await prisma.permission.create({
      data: { name, roleId: req.params.id },
    });
    
    res.status(201).json({ data: permission });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add permission' });
  }
});

export default router;
