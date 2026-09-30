-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "firebaseUid" TEXT;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "firebaseUid" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "firebaseUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_firebaseUid_key" ON "Admin"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_firebaseUid_key" ON "Staff"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "Student_firebaseUid_key" ON "Student"("firebaseUid");

