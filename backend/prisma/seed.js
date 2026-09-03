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

  const existingAdministrator = await prisma.user.findFirst({
    where: { roleId: createdRoles.platform_admin.id },
    select: { id: true }
  });

  if (!existingAdministrator) {
    const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (!email || !email.includes("@")) {
      throw new Error("INITIAL_ADMIN_EMAIL is required to create the first administrator");
    }
    if (!password || password.length < 12 || password.length > 72) {
      throw new Error("INITIAL_ADMIN_PASSWORD must contain between 12 and 72 characters");
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        firstName: "Platform",
        lastName: "Administrator",
        roleId: createdRoles.platform_admin.id
      }
    });
    console.log(`Initial administrator created: ${email}`);
  } else {
    console.log("An existing platform administrator was preserved");
  }

  console.log("Seed complete");
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
