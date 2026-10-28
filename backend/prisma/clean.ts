/**
 * Clean the tenant down to a bare starting point.
 *
 * Keeps the AXA organization and exactly one CEO account (seeded by
 * `SEED_ADMIN_*` env vars, defaulting to the standard dev admin). Every
 * other row — issues, projects, docs, calendar events, org chart, account
 * requests, notifications, team members, non-CEO users — is wiped.
 *
 * Run with:
 *   cd backend && npx tsx -r dotenv/config prisma/clean.ts dotenv_config_path=.env
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const ORG_SLUG = process.env.SEED_ORG_SLUG ?? 'axa';
const ORG_NAME = process.env.SEED_ORG_NAME ?? 'AXA';
const CEO_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'ceo@axa.com';
const CEO_NAME = process.env.SEED_ADMIN_NAME ?? 'CEO';
const CEO_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'CeoAxa!2026#';

async function main() {
  if (CEO_PASSWORD.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters');
  }

  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    create: {
      slug: ORG_SLUG,
      name: ORG_NAME,
      issuePrefix: ORG_NAME.toUpperCase().slice(0, 4),
    },
    update: { name: ORG_NAME },
  });

  // Keep the CEO row stable so a re-clean doesn't invalidate their session.
  const passwordHash = await bcrypt.hash(CEO_PASSWORD, 12);
  const ceo = await prisma.user.upsert({
    where: {
      organizationId_email: { organizationId: org.id, email: CEO_EMAIL },
    },
    create: {
      organizationId: org.id,
      email: CEO_EMAIL,
      name: CEO_NAME,
      passwordHash,
    },
    update: { name: CEO_NAME, passwordHash },
  });

  // Order matters: children before parents, so each delete finds its rows
  // and no FK trips. `onDelete: Cascade` would handle most, but being
  // explicit documents what the script is doing.
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { organizationId: org.id } }),
    prisma.activityEvent.deleteMany({ where: { organizationId: org.id } }),
    prisma.dailyReportIssue.deleteMany({}),
    prisma.dailyReport.deleteMany({ where: { organizationId: org.id } }),
    prisma.issueLabel.deleteMany({}),
    prisma.issue.deleteMany({ where: { organizationId: org.id } }),
    prisma.label.deleteMany({ where: { organizationId: org.id } }),
    prisma.project.deleteMany({ where: { organizationId: org.id } }),
    prisma.workspace.deleteMany({ where: { organizationId: org.id } }),
    prisma.calendarEvent.deleteMany({ where: { organizationId: org.id } }),
    prisma.docsPage.deleteMany({ where: { organizationId: org.id } }),
    prisma.orgChart.deleteMany({ where: { organizationId: org.id } }),
    prisma.accountRequest.deleteMany({ where: { organizationId: org.id } }),
    prisma.appUsageSnapshot.deleteMany({ where: { organizationId: org.id } }),
    prisma.githubLink.deleteMany({ where: { organizationId: org.id } }),
    prisma.githubRepository.deleteMany({ where: { organizationId: org.id } }),
    prisma.devProfile.deleteMany({ where: { organizationId: org.id } }),
    prisma.appOwnership.deleteMany({ where: { organizationId: org.id } }),
    prisma.teamMember.deleteMany({ where: { organizationId: org.id } }),
    prisma.department.deleteMany({ where: { organizationId: org.id } }),
    // Any user other than the CEO goes.
    prisma.user.deleteMany({
      where: { organizationId: org.id, id: { not: ceo.id } },
    }),
    // Reset the issue counter so the first new issue is <PREFIX>-1 again.
    prisma.organization.update({
      where: { id: org.id },
      data: { issueCounter: 0 },
    }),
  ]);

  // The CEO stays on the roster as owner, so they can log in and manage.
  const member = await prisma.teamMember.upsert({
    where: { userId: ceo.id },
    create: { organizationId: org.id, userId: ceo.id, role: 'owner' },
    update: { role: 'owner' },
  });

  console.log('Clean complete.');
  console.log(`  Organization : ${org.name} (${org.slug}) id=${org.id}`);
  console.log(`  CEO user     : ${ceo.email} id=${ceo.id}`);
  console.log(`  Roster entry : ${member.id} (owner)`);
  console.log(`  Password     : ${CEO_PASSWORD}`);
  console.log();
  console.log(
    'Sign in at http://localhost:3000/login with the credentials above.',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
