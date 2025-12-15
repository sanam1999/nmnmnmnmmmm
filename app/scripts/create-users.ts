import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Email → Password mapping
  const users = [
    { email: "it@pearlgrouphotels.com", password: "pearlgrouphotels@65" },
    { email: "moneyexchange@pearlgrouphotels.com", password: "moneyexchange@34" },
    { email: "accounts@pearlgrouphotels.com", password: "accounts@54" },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: { passwordHash },
      create: {
        email: user.email,
        passwordHash,
      },
    });

    console.log(`User synced: ${user.email}`);
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




