import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roles = [
  ["platform_admin", "Platform administrator"],
  ["government_admin", "Government administrator"],
  ["organization_admin", "Organization administrator"],
  ["instructor", "Instructor"],
  ["student", "Student"]
];

async function main() {
  const createdRoles = {};
  for (const [name, displayName] of roles) {
    createdRoles[name] = await prisma.role.upsert({
      where: { name },
      update: { displayName },
      create: { name, displayName }
    });
  }

  await prisma.user.upsert({
    where: { email: "admin@example.gov" },
    update: {
      passwordHash: await bcrypt.hash("Admin123!", 12),
      roleId: createdRoles.platform_admin.id,
      isActive: true
    },
    create: {
      email: "admin@example.gov",
      passwordHash: await bcrypt.hash("Admin123!", 12),
      firstName: "Platform",
      lastName: "Administrator",
      roleId: createdRoles.platform_admin.id
    }
  });

  console.log("Seed complete");
  console.log("Administrator: admin@example.gov / Admin123!");
  console.log("No demo organizations, courses, enrollments, grades, or certificates are seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
