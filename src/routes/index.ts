import { Router } from 'express';
import authRoutes from './auth.routes';
import tenantRoutes from './tenant.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import dashboardRoutes from './dashboard.routes';
import widgetRoutes from './widget.routes';
import analyticsRoutes from './analytics.routes';
import settingsRoutes from './settings.routes';
import teamRoutes from './team.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/dashboards', dashboardRoutes);
router.use('/widgets', widgetRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/team', teamRoutes);

export { router as routes };
