CREATE TABLE "AuthorizedEmail" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" UUID NOT NULL,
    "organizationId" UUID,
    "registeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorizedEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthorizedEmail_email_key" ON "AuthorizedEmail"("email");
CREATE INDEX "AuthorizedEmail_roleId_idx" ON "AuthorizedEmail"("roleId");
CREATE INDEX "AuthorizedEmail_organizationId_idx" ON "AuthorizedEmail"("organizationId");
CREATE INDEX "AuthorizedEmail_registeredAt_idx" ON "AuthorizedEmail"("registeredAt");

ALTER TABLE "AuthorizedEmail" ADD CONSTRAINT "AuthorizedEmail_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuthorizedEmail" ADD CONSTRAINT "AuthorizedEmail_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
