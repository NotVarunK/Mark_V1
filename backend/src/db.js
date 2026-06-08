const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function connectDb() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to PostgreSQL database via Prisma.');
  } catch (error) {
    console.error('CRITICAL ERROR: Failed to connect to PostgreSQL database!');
    console.error('Please ensure the database container is running and accessible on port 5433.');
    console.error('Error Details:', error.message);
    process.exit(1);
  }
}

module.exports = { prisma, connectDb };
