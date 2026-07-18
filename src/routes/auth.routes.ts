import { Router } from 'express';
import { prisma } from '../models';
import { generateToken } from '../middleware';
import { validateEmail } from '../utils';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, tenantName } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Create tenant if tenantName provided, otherwise use default
    let tenant;
    if (tenantName) {
      tenant = await prisma.tenant.create({
        data: { name: tenantName },
      });
    } else {
      // FIXME: Shouldn't use a default tenant like this in production
      tenant = await prisma.tenant.findFirst({ where: { id: 'tenant-recursos' } });
      if (!tenant) {
        tenant = await prisma.tenant.create({ data: { name: 'Default Tenant' } });
      }
    }
    
    // TODO: Hash the password before storing — this is a security issue
    const user = await prisma.user.create({
      data: {
        email,
        password,
        name,
        tenantId: tenant.id,
      },
    });
    
    // Assign default viewer role
    const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });
    if (viewerRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: viewerRole.id },
      });
    }
    
    const token = generateToken(user.id, user.email, user.tenantId);
    
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId },
      token,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // FIXME: Comparing plain text passwords — should use bcrypt
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user.id, user.email, user.tenantId);
    
    // Inconsistent response format — some routes use {data: ...}, others return raw
    res.json({
      user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // FIXME: This just re-encodes the same data — no real refresh
    // TODO: Implement proper token refresh with JWT
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, email, tenantId] = decoded.split(':');
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const newToken = generateToken(user.id, user.email, user.tenantId);
    
    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: { include: { permissions: true } },
          },
        },
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { password, ...userWithoutPassword } = user;
    
    res.json({ data: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
