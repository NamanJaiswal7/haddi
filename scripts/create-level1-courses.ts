import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Configuration
const UNLOCK_DATE = new Date('2025-01-15T00:00:00Z'); // Level 1 unlocks on January 15, 2025
const QUIZ_VALID_UNTIL = new Date('2025-12-31T23:59:59Z'); // Quiz valid until end of 2025
const PASS_PERCENTAGE = 70.0; // 70% passing requirement

// Helper function to create question bank with questions
async function createQuestionBank(classLevel: string, level: string) {
  try {
    // Create question bank
    const questionBank = await prisma.questionBank.create({
      data: {}
    });

    // Create questions based on class level
    const questions = getQuestionsForClass(classLevel, level);
    
    for (const questionData of questions) {
      await prisma.question.create({
        data: {
          ...questionData,
          questionBankId: questionBank.id
        }
      });
    }

    console.log(`✅ Created question bank for ${classLevel} ${level} with ${questions.length} questions`);
    return questionBank;
  } catch (error: any) {
    console.error(`❌ Error creating question bank for ${classLevel} ${level}:`, error.message);
    throw error;
  }
}

// Helper function to get questions based on class level
function getQuestionsForClass(classLevel: string, level: string) {
  const baseQuestions = [
    {
      question: "भगवद् गीता में कितने अध्याय हैं?",
      optionA: "16",
      optionB: "18",
      optionC: "20",
      optionD: "22",
      correctOption: "B",
      difficulty: "easy",
      points: 1,
      timeLimit: 60
    },
    {
      question: "भगवद् गीता का मुख्य संदेश क्या है?",
      optionA: "केवल कर्म करो",
      optionB: "कर्म के फल की चिंता मत करो",
      optionC: "दोनों A और B",
      optionD: "कुछ भी नहीं",
      correctOption: "C",
      difficulty: "medium",
      points: 2,
      timeLimit: 90
    },
    {
      question: "अर्जुन को किस युद्ध में संदेह हुआ?",
      optionA: "कुरुक्षेत्र युद्ध",
      optionB: "रामायण युद्ध",
      optionC: "महाभारत युद्ध",
      optionD: "कुरुक्षेत्र युद्ध",
      correctOption: "D",
      difficulty: "easy",
      points: 1,
      timeLimit: 60
    }
  ];

  // Add more advanced questions for higher classes
  if (['9th', '10th', '11th', '12th', 'college', 'UG', 'PG', 'PhD'].includes(classLevel)) {
    baseQuestions.push(
      {
        question: "कर्म योग का सिद्धांत क्या सिखाता है?",
        optionA: "केवल भक्ति",
        optionB: "कर्म के साथ निष्काम भाव",
        optionC: "केवल ज्ञान",
        optionD: "केवल ध्यान",
        correctOption: "B",
        difficulty: "hard",
        points: 3,
        timeLimit: 120
      },
      {
        question: "भगवद् गीता में 'योग' शब्द का क्या अर्थ है?",
        optionA: "शारीरिक व्यायाम",
        optionB: "मन और कर्म का संयोग",
        optionC: "ध्यान",
        optionD: "प्राणायाम",
        correctOption: "B",
        difficulty: "hard",
        points: 3,
        timeLimit: 120
      }
    );
  }

  // Add even more advanced questions for college level
  if (['college', 'UG', 'PG', 'PhD'].includes(classLevel)) {
    baseQuestions.push(
      {
        question: "निष्काम कर्म का अर्थ क्या है?",
        optionA: "कर्म न करना",
        optionB: "फल की इच्छा के बिना कर्म करना",
        optionC: "केवल फल की इच्छा से कर्म करना",
        optionD: "कर्म का त्याग",
        correctOption: "B",
        difficulty: "hard",
        points: 3,
        timeLimit: 120
      }
    );
  }

  return baseQuestions;
}

// Helper function to create course
async function createCourse(classLevel: string, level: string) {
  try {
    const course = await prisma.course.create({
      data: {
        classLevel,
        level,
        title: `भगवद् गीता प्रतियोगिता - ${level}`,
        description: `${classLevel} के लिए ${level} स्तर का भगवद् गीता कोर्स`,
        isPublished: true
      }
    });
    console.log(`✅ Created course: ${course.title}`);
    return course;
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Course already exists, fetch it
      const existingCourse = await prisma.course.findUnique({
        where: { classLevel_level: { classLevel, level } }
      });
      console.log(`ℹ️  Course already exists: ${existingCourse?.title}`);
      return existingCourse;
    }
    console.error(`❌ Error creating course for ${classLevel} ${level}:`, error.message);
    throw error;
  }
}

// Helper function to add video
async function addVideo(courseId: string, title: string, iframeSnippet: string) {
  try {
    const video = await prisma.courseVideo.create({
      data: {
        courseId,
        title,
        iframeSnippet
      }
    });
    console.log(`✅ Added video: ${title}`);
    return video;
  } catch (error: any) {
    console.error(`❌ Error adding video ${title}:`, error.message);
    throw error;
  }
}

// Helper function to add note
async function addNote(courseId: string, title: string, url: string) {
  try {
    const note = await prisma.courseNote.create({
      data: {
        courseId,
        title,
        content: `नोट्स के लिए यह लिंक देखें: ${url}`
      }
    });
    console.log(`✅ Added note: ${title}`);
    return note;
  } catch (error: any) {
    console.error(`❌ Error adding note ${title}:`, error.message);
    throw error;
  }
}

// Helper function to create quiz
async function createQuiz(courseId: string, classLevel: string, questionBankId: string) {
  try {
    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        classLevel,
        numQuestions: 5, // Show 5 questions out of total
        passPercentage: PASS_PERCENTAGE,
        questionBankId
      }
    });
    console.log(`✅ Created quiz for ${classLevel} with ${PASS_PERCENTAGE}% passing requirement`);
    return quiz;
  } catch (error: any) {
    console.error(`❌ Error creating quiz for ${classLevel}:`, error.message);
    throw error;
  }
}

// Helper function to create level schedule
async function createLevelSchedule(classLevel: string, level: string) {
  try {
    const schedule = await prisma.levelSchedule.create({
      data: {
        classId: classLevel,
        level,
        unlockDate: UNLOCK_DATE,
        unlockTime: UNLOCK_DATE.toTimeString().split(' ')[0] || '00:00:00',
        unlockDateTime: UNLOCK_DATE.toISOString()
      }
    });
    console.log(`✅ Created schedule: ${classLevel} ${level} unlocks on ${UNLOCK_DATE.toLocaleDateString()}`);
    return schedule;
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Schedule already exists, update it
      const updatedSchedule = await prisma.levelSchedule.update({
        where: { classId_level: { classId: classLevel, level } },
        data: {
          unlockDate: UNLOCK_DATE,
          unlockTime: UNLOCK_DATE.toTimeString().split(' ')[0] || '00:00:00',
          unlockDateTime: UNLOCK_DATE.toISOString()
        }
      });
      console.log(`ℹ️  Updated existing schedule: ${classLevel} ${level}`);
      return updatedSchedule;
    }
    console.error(`❌ Error creating schedule for ${classLevel} ${level}:`, error.message);
    throw error;
  }
}

// Helper function to create quiz validity
async function createQuizValidity(classLevel: string, level: string) {
  try {
    const validity = await prisma.quizValidity.create({
      data: {
        classId: classLevel,
        level,
        validUntilDate: QUIZ_VALID_UNTIL,
        validUntilTime: QUIZ_VALID_UNTIL.toTimeString().split(' ')[0] || '23:59:59',
        validUntilDateTime: QUIZ_VALID_UNTIL.toISOString()
      }
    });
    console.log(`✅ Created quiz validity: ${classLevel} ${level} valid until ${QUIZ_VALID_UNTIL.toLocaleDateString()}`);
    return validity;
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Validity already exists, update it
      const updatedValidity = await prisma.quizValidity.update({
        where: { classId_level: { classId: classLevel, level } },
        data: {
          validUntilDate: QUIZ_VALID_UNTIL,
          validUntilTime: QUIZ_VALID_UNTIL.toTimeString().split(' ')[0] || '23:59:59',
          validUntilDateTime: QUIZ_VALID_UNTIL.toISOString()
        }
      });
      console.log(`ℹ️  Updated existing quiz validity: ${classLevel} ${level}`);
      return updatedValidity;
    }
    console.error(`❌ Error creating quiz validity for ${classLevel} ${level}:`, error.message);
    throw error;
  }
}

// Main function to create Level 1 courses
async function createLevel1Courses() {
  try {
    console.log('🚀 Starting to create Level 1 courses for all classes...');
    console.log(`📅 Level 1 will unlock on: ${UNLOCK_DATE.toLocaleDateString()}`);
    console.log(`⏰ Quiz will be valid until: ${QUIZ_VALID_UNTIL.toLocaleDateString()}`);
    console.log(`🎯 Passing requirement: ${PASS_PERCENTAGE}%\n`);

    // Class 6, 7, 8 - Same content
    const classes6to8 = ['6th', '7th', '8th'];
    const videos6to8 = [
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8 Part 1',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/f_JMJS2N3gc?si=DWb0hESIv-Al7THS" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      },
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8 Part 2',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/rl7xYT5xwzI?si=DbtBVEARprfUUTJN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      }
    ];

    const note6to8 = {
      title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8',
      url: 'https://drive.google.com/drive/folders/1XDpnW4UXz0Ci7VIgNuy73UbjfZPqYR9w?usp=drive_link'
    };

    for (const classLevel of classes6to8) {
      console.log(`\n📚 Creating content for Class ${classLevel}...`);
      
      // Create course
      const course = await createCourse(classLevel, 'Level 1');
      if (!course) {
        throw new Error(`Failed to create course for ${classLevel}`);
      }
      
      // Create question bank and quiz
      const questionBank = await createQuestionBank(classLevel, 'Level 1');
      const quiz = await createQuiz(course.id, classLevel, questionBank.id);
      
      // Add videos
      for (const video of videos6to8) {
        await addVideo(course.id, video.title, video.iframeSnippet);
      }
      
      // Add note
      await addNote(course.id, note6to8.title, note6to8.url);
      
      // Create schedule and quiz validity
      await createLevelSchedule(classLevel, 'Level 1');
      await createQuizValidity(classLevel, 'Level 1');
      
      console.log(`✅ Completed Class ${classLevel}`);
    }

    // Class 9, 10, 11, 12 - Same content
    const classes9to12 = ['9th', '10th', '11th', '12th'];
    const videos9to12 = [
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 1',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/8rrbGtEzIQQ?si=UHjqtvqkCNATDepT" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      },
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 2',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/6yD3vcxma3Q?si=OlGykwu4W0Y4NQu_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      },
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 3',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/bMrhtnYw71s?si=P7U9P5CtuAfSEXI9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      }
    ];

    const note9to12 = {
      title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12',
      url: 'https://drive.google.com/drive/folders/1zjI9orSf_uRjxJKx4HgdgjIZlvxcogwx?usp=drive_link'
    };

    for (const classLevel of classes9to12) {
      console.log(`\n📚 Creating content for Class ${classLevel}...`);
      
      // Create course
      const course = await createCourse(classLevel, 'Level 1');
      if (!course) {
        throw new Error(`Failed to create course for ${classLevel}`);
      }
      
      // Create question bank and quiz
      const questionBank = await createQuestionBank(classLevel, 'Level 1');
      const quiz = await createQuiz(course.id, classLevel, questionBank.id);
      
      // Add videos
      for (const video of videos9to12) {
        await addVideo(course.id, video.title, video.iframeSnippet);
      }
      
      // Add note
      await addNote(course.id, note9to12.title, note9to12.url);
      
      // Create schedule and quiz validity
      await createLevelSchedule(classLevel, 'Level 1');
      await createQuizValidity(classLevel, 'Level 1');
      
      console.log(`✅ Completed Class ${classLevel}`);
    }

    // College, UG, PG, PhD, Working, Others - Same content
    const collegeClasses = ['college', 'UG', 'PG', 'PhD', 'working', 'others'];
    const collegeVideos = [
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 1',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/wUSzhuWDdDc?si=Rq1wV3TL2fsYHXgw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      },
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 2',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/KmxTsHAuZpM?si=-wLE1AZAaufug0Vx" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      }
    ];

    const collegeNote = {
      title: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
      url: 'https://drive.google.com/drive/folders/1NYm2vEGIAVYBGpU3tubdd8VxMgV70F7-?usp=drive_link'
    };

    for (const classLevel of collegeClasses) {
      console.log(`\n📚 Creating content for ${classLevel}...`);
      
      // Create course
      const course = await createCourse(classLevel, 'Level 1');
      if (!course) {
        throw new Error(`Failed to create course for ${classLevel}`);
      }
      
      // Create question bank and quiz
      const questionBank = await createQuestionBank(classLevel, 'Level 1');
      const quiz = await createQuiz(course.id, classLevel, questionBank.id);
      
      // Add videos
      for (const video of collegeVideos) {
        await addVideo(course.id, video.title, video.iframeSnippet);
      }
      
      // Add note
      await addNote(course.id, collegeNote.title, collegeNote.url);
      
      // Create schedule and quiz validity
      await createLevelSchedule(classLevel, 'Level 1');
      await createQuizValidity(classLevel, 'Level 1');
      
      console.log(`✅ Completed ${classLevel}`);
    }

    console.log('\n🎉 Successfully created Level 1 courses for all classes!');
    console.log('\n📊 Summary:');
    console.log('- Classes 6-8: 2 videos + 1 note + 3 questions');
    console.log('- Classes 9-12: 3 videos + 1 note + 5 questions');
    console.log('- College/UG/PG/PhD/Working/Others: 2 videos + 1 note + 6 questions');
    console.log(`- Level 1 unlocks on: ${UNLOCK_DATE.toLocaleDateString()}`);
    console.log(`- Quiz valid until: ${QUIZ_VALID_UNTIL.toLocaleDateString()}`);
    console.log(`- Passing requirement: ${PASS_PERCENTAGE}%`);

  } catch (error: any) {
    console.error('❌ Error creating Level 1 courses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createLevel1Courses()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { createLevel1Courses }; 