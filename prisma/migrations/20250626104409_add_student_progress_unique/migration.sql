/*
  Warnings:

  - A unique constraint covering the columns `[studentId,courseId]` on the table `StudentProgress` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StudentProgress_studentId_courseId_key" ON "StudentProgress"("studentId", "courseId");
