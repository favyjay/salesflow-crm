import { Role, LeadStatus, DealStage, TaskPriority, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/database/prisma'; // Imports your configured named database adapter client

async function main() {
  console.log('Resetting database to a completely pristine, empty state...');
  
  // Clear all database tables in reverse order of dependencies
  await prisma.activity.deleteMany({});
  await prisma.emailLog.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log('SalesFlow CRM database successfully reset to a clean-slate. Ready for deployment!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });