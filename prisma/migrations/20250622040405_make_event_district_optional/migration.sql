-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_districtId_fkey";

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "districtId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
