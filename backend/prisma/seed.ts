import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@college.edu.in';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  console.log(`Seeding master admin user: ${adminEmail}`);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'System Admin',
      password_hash: passwordHash,
      role: 'ADMIN'
    },
    create: {
      name: 'System Admin',
      email: adminEmail,
      password_hash: passwordHash,
      role: 'ADMIN'
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
