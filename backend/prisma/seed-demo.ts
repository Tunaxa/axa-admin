/**
 * Demo seed: fills a fresh database with sample Account Requests and
 * App Usage Snapshots so the UI has something to show.
 *
 * Run with: cd backend && npx tsx -r dotenv/config prisma/seed-demo.ts dotenv_config_path=.env
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('No organization — run the base seed first');
  const admin = await prisma.user.findFirst({ where: { organizationId: org.id } });
  if (!admin) throw new Error('No user — run the base seed first');

  console.log(`Seeding into "${org.name}" (${org.id})`);

  // ─── Account requests ────────────────────────────────────────────────
  const requestsSeed: Array<{
    app: 'axa_admin' | 'axacrm' | 'axapass' | 'website';
    requesterEmail: string;
    requesterName: string;
    note: string;
    status: 'pending' | 'approved' | 'rejected' | 'needs_more_info';
  }> = [
    {
      app: 'axacrm',
      requesterEmail: 'leila.benali@customer.com',
      requesterName: 'Leila Benali',
      note: 'We need CRM access for a sales team of 12. Starter plan should be fine for now.',
      status: 'pending',
    },
    {
      app: 'axapass',
      requesterEmail: 'omar.taleb@newco.io',
      requesterName: 'Omar Taleb',
      note: 'Enterprise rollout for 300 employees. Can we get a demo first?',
      status: 'needs_more_info',
    },
    {
      app: 'axa_admin',
      requesterEmail: 'yasmine.rahmouni@xyz.com',
      requesterName: 'Yasmine Rahmouni',
      note: 'Agency with 5 clients to onboard this month.',
      status: 'pending',
    },
    {
      app: 'website',
      requesterEmail: 'contact@startup.fr',
      requesterName: 'Imane Haddad',
      note: 'Looking at the public plan for our launch.',
      status: 'approved',
    },
    {
      app: 'axacrm',
      requesterEmail: 'test@fake.ru',
      requesterName: 'Nobody Real',
      note: 'Just curious.',
      status: 'rejected',
    },
    {
      app: 'axa_admin',
      requesterEmail: 'karim.chaoui@acme.ma',
      requesterName: 'Karim Chaoui',
      note: '',
      status: 'pending',
    },
  ];

  for (const r of requestsSeed) {
    const base = {
      organizationId: org.id,
      app: r.app,
      requesterEmail: r.requesterEmail,
      requesterName: r.requesterName,
      note: r.note || null,
      raisedById: admin.id,
      status: r.status,
      decidedById: r.status === 'approved' || r.status === 'rejected' ? admin.id : null,
      decidedAt: r.status === 'approved' || r.status === 'rejected' ? new Date() : null,
      decisionNote:
        r.status === 'approved'
          ? 'Welcome aboard — follow the Stripe link to complete setup.'
          : r.status === 'rejected'
            ? 'Request looks spurious; feel free to retry with a company domain.'
            : r.status === 'needs_more_info'
              ? 'Please share the number of seats you want and a company address.'
              : null,
      checkoutSessionId: r.status === 'approved' ? 'cs_test_demo_' + Math.random().toString(36).slice(2, 10) : null,
      checkoutUrl:
        r.status === 'approved' ? 'https://checkout.stripe.com/test/demo' : null,
    };
    // Avoid duplicates on reruns: match on (org, requesterEmail, app).
    const existing = await prisma.accountRequest.findFirst({
      where: {
        organizationId: org.id,
        requesterEmail: r.requesterEmail,
        app: r.app,
      },
    });
    if (existing) {
      await prisma.accountRequest.update({ where: { id: existing.id }, data: base });
    } else {
      await prisma.accountRequest.create({ data: base });
    }
  }
  console.log(`  → ${requestsSeed.length} account requests upserted`);

  // ─── App usage snapshots ────────────────────────────────────────────
  const APPS: Array<'axa_admin' | 'axacrm' | 'axapass' | 'website'> = [
    'axa_admin',
    'axacrm',
    'axapass',
    'website',
  ];
  const now = new Date();
  // Last 6 weekly snapshots per app.
  for (const app of APPS) {
    for (let i = 0; i < 6; i++) {
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() - i * 7);
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 7);

      const base = {
        deploys: Math.floor(2 + Math.random() * 6),
        errorRate: (0.001 + Math.random() * 0.015).toFixed(5),
        signups: Math.floor(5 + Math.random() * 40),
        mrr: (1500 + Math.random() * 5000 + (6 - i) * 300).toFixed(2),
        currency: 'EUR',
      };

      await prisma.appUsageSnapshot.upsert({
        where: {
          organizationId_app_periodStart_periodEnd: {
            organizationId: org.id,
            app,
            periodStart,
            periodEnd,
          },
        },
        create: {
          organizationId: org.id,
          app,
          periodStart,
          periodEnd,
          ...base,
        },
        update: base,
      });
    }
  }
  console.log(`  → ${APPS.length * 6} app usage snapshots upserted`);

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
