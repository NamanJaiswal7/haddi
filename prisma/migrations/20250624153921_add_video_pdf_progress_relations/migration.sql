-- CreateTable
CREATE TABLE "VideoProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "watchedAt" TIMESTAMP(3),

    CONSTRAINT "VideoProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "pdfId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "PdfProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoProgress_studentId_videoId_key" ON "VideoProgress"("studentId", "videoId");

-- CreateIndex
CREATE UNIQUE INDEX "PdfProgress_studentId_pdfId_key" ON "PdfProgress"("studentId", "pdfId");

-- AddForeignKey
ALTER TABLE "VideoProgress" ADD CONSTRAINT "VideoProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProgress" ADD CONSTRAINT "VideoProgress_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "CourseVideo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfProgress" ADD CONSTRAINT "PdfProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfProgress" ADD CONSTRAINT "PdfProgress_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "CoursePDF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
