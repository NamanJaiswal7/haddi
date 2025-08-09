import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCourses() {
  try {
    const courses = await prisma.course.findMany({
      include: {
        videos: true,
        notes: true,
        quizzes: true
      }
    });
    
    console.log('Total courses:', courses.length);
    courses.forEach(course => {
      console.log(`- ${course.title} (${course.level}): ${course.videos.length} videos, ${course.notes.length} notes, ${course.quizzes.length} quizzes`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCourses(); 