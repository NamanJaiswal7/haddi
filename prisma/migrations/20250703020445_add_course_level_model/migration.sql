-- CreateTable
CREATE TABLE "CourseLevel" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "levels" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseLevel_classId_key" ON "CourseLevel"("classId");
