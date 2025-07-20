import { prisma } from '../src/prisma/client';

async function unlockLevel1ForAllStudents() {
  const students = await prisma.user.findMany({ where: { role: 'student' } });
  for (const student of students) {
    if (!student.classLevel) continue;
    const level1Courses = await prisma.course.findMany({
      where: {
        classLevel: student.classLevel,
        OR: [
          { level: '1' },
          { level: { equals: 'Level 1' } },
          { level: { contains: '1' } },
          { level: { startsWith: 'Level 1' } }
        ]
      }
    });
    for (const course of level1Courses) {
      await prisma.studentProgress.upsert({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId: course.id
          }
        },
        update: {},
        create: {
          studentId: student.id,
          courseId: course.id,
          status: 'in_progress'
        }
      });
      console.log(`Unlocked level 1 for student ${student.email} in course ${course.title}`);
    }
  }
  await prisma.$disconnect();
  console.log('Done unlocking level 1 for all students.');
}

unlockLevel1ForAllStudents().catch(e => {
  console.error(e);
  process.exit(1);
}); 