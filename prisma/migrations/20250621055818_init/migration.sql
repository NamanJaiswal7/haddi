-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_districtId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "dob" DROP NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "institution" DROP NOT NULL,
ALTER COLUMN "districtId" DROP NOT NULL,
ALTER COLUMN "pincode" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
