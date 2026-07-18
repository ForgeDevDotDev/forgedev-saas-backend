import { PrismaClient, Role, Permission } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create tenant — Spanish SaaS company (HR analytics tool like Factorial)
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-recursos' },
    update: {},
    create: {
      id: 'tenant-recursos',
      name: 'RecursosHR Analytics',
      plan: 'pro',
    },
  });

  // Second tenant for testing isolation
  const tenant2 = await prisma.tenant.upsert({
    where: { id: 'tenant-nomina' },
    update: {},
    create: {
      id: 'tenant-nomina',
      name: 'NóminaPro',
      plan: 'enterprise',
    },
  });

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Full access to all features and settings',
    },
  });

  const editorRole = await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: {
      name: 'editor',
      description: 'Can edit dashboards and widgets, cannot manage users',
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: {
      name: 'viewer',
      description: 'Read-only access to dashboards and analytics',
    },
  });

  // Create permissions
  const permissions = [
    { name: 'dashboard:create', roleId: adminRole.id },
    { name: 'dashboard:edit', roleId: adminRole.id },
    { name: 'dashboard:delete', roleId: adminRole.id },
    { name: 'dashboard:view', roleId: adminRole.id },
    { name: 'widget:create', roleId: adminRole.id },
    { name: 'widget:edit', roleId: adminRole.id },
    { name: 'widget:delete', roleId: adminRole.id },
    { name: 'analytics:view', roleId: adminRole.id },
    { name: 'analytics:export', roleId: adminRole.id },
    { name: 'team:manage', roleId: adminRole.id },
    { name: 'settings:manage', roleId: adminRole.id },
    { name: 'users:manage', roleId: adminRole.id },
    // editor permissions
    { name: 'dashboard:create', roleId: editorRole.id },
    { name: 'dashboard:edit', roleId: editorRole.id },
    { name: 'dashboard:view', roleId: editorRole.id },
    { name: 'widget:create', roleId: editorRole.id },
    { name: 'widget:edit', roleId: editorRole.id },
    { name: 'analytics:view', roleId: editorRole.id },
    { name: 'analytics:export', roleId: editorRole.id },
    // viewer permissions
    { name: 'dashboard:view', roleId: viewerRole.id },
    { name: 'analytics:view', roleId: viewerRole.id },
  ];

  for (const perm of permissions) {
    const existing = await prisma.permission.findFirst({
      where: { name: perm.name, roleId: perm.roleId },
    });
    if (!existing) {
      await prisma.permission.create({ data: perm });
    }
  }

  // Create users
  // TODO: Hash passwords before storing — currently plain text (security issue)
  const users = [
    { email: 'admin@recursoshr.com', password: 'admin123', name: 'Carlos Rodríguez', tenantId: tenant.id, roleName: 'admin' },
    { email: 'editor@recursoshr.com', password: 'editor123', name: 'María García', tenantId: tenant.id, roleName: 'editor' },
    { email: 'viewer@recursoshr.com', password: 'viewer123', name: 'Juan Martínez', tenantId: tenant.id, roleName: 'viewer' },
    { email: 'admin@nominapro.com', password: 'admin456', name: 'Ana López', tenantId: tenant2.id, roleName: 'admin' },
  ];

  for (const u of users) {
    const role = await prisma.role.findUnique({ where: { name: u.roleName } });
    const existingUser = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existingUser && role) {
      const user = await prisma.user.create({
        data: {
          email: u.email,
          password: u.password,
          name: u.name,
          tenantId: u.tenantId,
        },
      });
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });
    }
  }

  // Create settings for tenant
  await prisma.settings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      theme: 'light',
      language: 'es',
      timezone: 'Europe/Madrid',
      notificationsEnabled: true,
      exportFormat: 'csv',
      retentionDays: 90,
    },
  });

  await prisma.settings.upsert({
    where: { tenantId: tenant2.id },
    update: {},
    create: {
      tenantId: tenant2.id,
      theme: 'dark',
      language: 'es',
      timezone: 'Europe/Madrid',
      notificationsEnabled: false,
      exportFormat: 'xlsx',
      retentionDays: 365,
    },
  });

  // Create dashboards
  const dashboard1 = await prisma.dashboard.create({
    data: {
      name: 'Resumen de RRHH',
      tenantId: tenant.id,
    },
  });

  const dashboard2 = await prisma.dashboard.create({
    data: {
      name: 'Métricas de Empleados',
      tenantId: tenant.id,
    },
  });

  const dashboard3 = await prisma.dashboard.create({
    data: {
      name: 'Panel de Nóminas',
      tenantId: tenant2.id,
    },
  });

  // Create widgets
  const widgets = [
    { dashboardId: dashboard1.id, type: 'line', title: 'Contrataciones por mes', dataSource: 'analytics_events', config: '{"metric":"hires","period":"monthly"}', position: 0, width: 6, height: 4 },
    { dashboardId: dashboard1.id, type: 'bar', title: 'Distribución por departamento', dataSource: 'analytics_events', config: '{"metric":"dept_distribution"}', position: 1, width: 6, height: 4 },
    { dashboardId: dashboard1.id, type: 'metric', title: 'Total empleados', dataSource: 'analytics_events', config: '{"metric":"total_employees"}', position: 2, width: 3, height: 2 },
    { dashboardId: dashboard2.id, type: 'line', title: 'Rotación de personal', dataSource: 'analytics_events', config: '{"metric":"turnover","period":"monthly"}', position: 0, width: 12, height: 4 },
    { dashboardId: dashboard3.id, type: 'bar', title: 'Coste de nóminas', dataSource: 'analytics_events', config: '{"metric":"payroll_cost"}', position: 0, width: 6, height: 4 },
  ];

  for (const w of widgets) {
    await prisma.widget.create({ data: w });
  }

  // Create analytics events — generating enough for the aggregate query bug to surface
  const eventTypes = ['hires', 'departures', 'training_completed', 'performance_review', 'payroll_processed'];
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
  
  for (let i = 0; i < 200; i++) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - Math.floor(Math.random() * 90));
    
    await prisma.analyticsEvent.create({
      data: {
        tenantId: tenant.id,
        eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        value: Math.random() * 1000,
        label: departments[Math.floor(Math.random() * departments.length)],
      },
    });
  }

  // Events for second tenant
  for (let i = 0; i < 50; i++) {
    await prisma.analyticsEvent.create({
      data: {
        tenantId: tenant2.id,
        eventType: 'payroll_processed',
        value: Math.random() * 5000,
        label: 'Finance',
      },
    });
  }

  // Create team members
  await prisma.teamMember.create({
    data: {
      tenantId: tenant.id,
      email: 'carlos@recursoshr.com',
      role: 'admin',
      status: 'active',
      joinedAt: new Date(),
    },
  });

  await prisma.teamMember.create({
    data: {
      tenantId: tenant.id,
      email: 'maria@recursoshr.com',
      role: 'editor',
      status: 'active',
      joinedAt: new Date(),
    },
  });

  await prisma.teamMember.create({
    data: {
      tenantId: tenant.id,
      email: 'pending@recursoshr.com',
      role: 'viewer',
      status: 'pending',
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
