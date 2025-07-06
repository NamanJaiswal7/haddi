-- CreateTable
CREATE TABLE "PassingMark" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "passingMarks" INTEGER NOT NULL,

    CONSTRAINT "PassingMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PassingMark_classId_levelId_key" ON "PassingMark"("classId", "levelId");
