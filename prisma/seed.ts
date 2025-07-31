import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin exists
    const adminExists = await prisma.user.findFirst({
      where: { 
        email: process.env.SYSTEM_EMAIL 
      }
    });

    if (!adminExists) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(process.env.SYSTEM_PASSWORD, 10);

      // Create admin user
      await prisma.user.create({
        data: {
          name: process.env.SYSTEM_USERNAME,
          email: process.env.SYSTEM_EMAIL,
          password: hashedPassword,
          type: 'admin',
          status: 1,
          email_verified_at: new Date(), // This will store the exact timestamp
          created_at: new Date(),
          updated_at: new Date()
        },
      });
      console.log('✅ Admin user created successfully');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

async function main() {
  console.log('🌱 Starting database seed...');
  await createAdminUser();
  console.log('✅ Seed completed');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });