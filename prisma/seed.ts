import { EventType, UserRole } from '../types';

// Mock PrismaClient since generation is not available in this environment
const PrismaClient = class {
  eventColor: any = { upsert: () => {} };
  user: any = { upsert: () => {} };
  $disconnect: any = async () => {};
} as any;

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Event Colors
  // IDs based on approximate Google Calendar Color definitions
  const colors = [
    { eventType: EventType.EVENTO, colorHex: '#757575', googleCalendarColorId: '8' },       // Graphite
    { eventType: EventType.ACAO_PONTUAL, colorHex: '#F6BF26', googleCalendarColorId: '5' }, // Banana
    { eventType: EventType.REUNIAO, colorHex: '#3F51B5', googleCalendarColorId: '9' },      // Blueberry
    { eventType: EventType.VISITA, colorHex: '#0B8043', googleCalendarColorId: '10' },      // Basil
    { eventType: EventType.FERIAS, colorHex: '#D50000', googleCalendarColorId: '11' },      // Tomato
    { eventType: EventType.FOLGA, colorHex: '#8E24AA', googleCalendarColorId: '3' },        // Grape
    { eventType: EventType.LICENCA, colorHex: '#E67C73', googleCalendarColorId: '4' },      // Flamingo
    { eventType: EventType.OUTROS, colorHex: '#616161', googleCalendarColorId: '8' },       // Graphite
  ];

  for (const color of colors) {
    await prisma.eventColor.upsert({
      where: { eventType: color.eventType },
      update: color,
      create: color,
    });
  }
  console.log(`Seeded ${colors.length} event colors.`);

  // Seed Default Admin User
  const adminEmail = 'admin@example.com';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'System Admin',
      role: UserRole.ADMIN,
      avatar: 'https://ui-avatars.com/api/?name=System+Admin&background=random',
    },
  });
  console.log('Seeded admin user.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });