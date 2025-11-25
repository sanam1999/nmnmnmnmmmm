import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const emails = [
    "billuvaai@gmail.com"
  ];

  for (const email of emails) {
    const passwordHash = await bcrypt.hash("Admin@123", 10);

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash
      } 
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
