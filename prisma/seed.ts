import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const mpDistricts = [
    "Agar Malwa - आगर मालवा",
    "Alirajpur - अलीराजपुर",
    "Anuppur - अनुपपुर",
    "Ashoknagar - अशोकनगर",
    "Balaghat - बालाघाट",
    "Barwani - बड़वानी",
    "Betul - बेतुल",
    "Bhind - भिंड",
    "Bhopal - भोपाल",
    "Burhanpur - बुरहानपुर",
    "Chhatarpur - छतरपुर",
    "Chhindwara - छिंदवाड़ा",
    "Damoh - दमोह",
    "Datia - दतिया",
    "Dewas - देवास",
    "Dhar - धार",
    "Dindori - डिंडोरी",
    "Guna - गुना",
    "Gwalior - ग्वालियर",
    "Harda - हरदा",
    "Indore - इंदौर",
    "Jabalpur - जबलपुर",
    "Jhabua - झाबुआ",
    "Katni - कटनी",
    "Khandwa - खंडवा",
    "Khargone - खरगोन",
    "Maihar - मैहर",
    "Mandla - मंडला",
    "Mandsaur - मंदसौर",
    "Mauganj - मऊगंज",
    "Morena - मुरैना",
    "Narmadapuram - नर्मदापुरम",
    "Narsinghpur - नरसिंहपुर",
    "Neemuch - नीमच",
    "Niwari - निवाड़ी",
    "Panna - पन्ना",
    "Pandhurna - पंधुरना",
    "Raisen - रायसेन",
    "Rajgarh - राजगढ़",
    "Ratlam - रतलाम",
    "Rewa - रीवा",
    "Sagar - सागर",
    "Satna - सतना",
    "Sehore - सीहोर",
    "Seoni - सिवनी",
    "Shahdol - शाहडोल",
    "Shajapur - शाजापुर",
    "Sheopur - श्योपुर",
    "Shivpuri - शिवपुरी",
    "Sidhi - सीधी",
    "Singrauli - सिंगरौली",
    "Tikamgarh - टीकमगढ़",
    "Ujjain - उज्जैन",
    "Umaria - उमरिया",
    "Vidisha - विदिशा"
  ];
  

async function main() {
    console.log("🌱 Starting database seeding...");

    // Clear existing data in correct order (respecting foreign key constraints)
    console.log("🧹 Clearing existing data...");
    await prisma.$transaction([
        // Delete dependent records first (child tables)
        prisma.notificationRecipient.deleteMany(),
        prisma.notification.deleteMany(),
        prisma.eventParticipant.deleteMany(),
        prisma.event.deleteMany(),
        prisma.studentProgress.deleteMany(),
        prisma.examAttempt.deleteMany(),
        prisma.videoProgress.deleteMany(),
        prisma.pdfProgress.deleteMany(),
        
        // Delete quiz-related records
        prisma.quiz.deleteMany(),
        prisma.question.deleteMany(),
        prisma.questionBank.deleteMany(),
        
        // Delete course content
        prisma.courseVideo.deleteMany(),
        prisma.courseNote.deleteMany(),
        prisma.coursePDF.deleteMany(),
        prisma.course.deleteMany(),
        
        // Delete user and district records last
        prisma.user.deleteMany(),
        prisma.district.deleteMany(),
    ]);

    // Create Districts
    console.log("🏛️ Creating 55 districts of Madhya Pradesh...");
    const districtData = mpDistricts.map(name => ({ name }));
    await prisma.district.createMany({ data: districtData });
    console.log("✅ Created 55 districts of Madhya Pradesh");

    // Create Master Admin
    console.log("👑 Creating master admin...");
    const password = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
        data: {
            name: 'Master Administrator',
            email: 'master@haddi.com',
            mobile: '9876543210',
            passwordHash: password,
            role: Role.master_admin,
            lastActiveAt: new Date(),
        }
    });
    console.log("✅ Created master admin");

    // Create Test Student
    console.log("👨‍🎓 Creating test student...");
    const studentPassword = await bcrypt.hash('password123', 10);
    await prisma.user.create({
        data: {
            name: 'Test Student',
            email: 'student@example.com',
            mobile: '9876543211',
            passwordHash: studentPassword,
            role: Role.student,
            classLevel: '10th',
            districtId: (await prisma.district.findFirst({ where: { name: { contains: 'Ujjain' } } }))?.id,
            lastActiveAt: new Date(),
        }
    });
    console.log("✅ Created test student");

    // Create sample courses and content
    console.log("📚 Creating sample courses...");
    
    // Create question banks
    const questionBank1 = await prisma.questionBank.create({
        data: {
            questions: {
                create: [
                    {
                        question: "What is the main theme of Bhagavad Gita?",
                        optionA: "War and conflict",
                        optionB: "Spiritual wisdom and duty",
                        optionC: "Love and romance",
                        optionD: "Political power",
                        correctOption: "2"
                    },
                    {
                        question: "Who is the narrator of Bhagavad Gita?",
                        optionA: "Krishna",
                        optionB: "Arjuna",
                        optionC: "Vyasa",
                        optionD: "Sanjaya",
                        correctOption: "4"
                    }
                ]
            }
        }
    });

    // Create courses
    const course1 = await prisma.course.create({
        data: {
            classLevel: '10th',
            level: '1',
            title: 'Introduction to Bhagavad Gita',
            description: 'Learn the basics of Bhagavad Gita and its significance',
            isPublished: true
        }
    });

    const course2 = await prisma.course.create({
        data: {
            classLevel: '10th',
            level: '2',
            title: 'Advanced Gita Studies',
            description: 'Deep dive into advanced concepts and teachings',
            isPublished: true
        }
    });

    // Create videos
    await prisma.courseVideo.create({
        data: {
            courseId: course1.id,
            title: 'Introduction to Bhagavad Gita - Part 1',
            youtubeId: 'dQw4w9WgXcQ',
            iframeSnippet: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            thumbnail: 'https://example.com/thumbnails/video_1.jpg'
        }
    });

    await prisma.courseVideo.create({
        data: {
            courseId: course1.id,
            title: 'Introduction to Bhagavad Gita - Part 2',
            youtubeId: 'dQw4w9WgXcQ',
            iframeSnippet: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            thumbnail: 'https://example.com/thumbnails/video_2.jpg'
        }
    });

    // Create PDFs
    await prisma.coursePDF.create({
        data: {
            courseId: course1.id,
            title: 'Bhagavad Gita - Chapter 1 Summary',
            url: 'https://example.com/pdfs/chapter1_summary.pdf'
        }
    });

    await prisma.coursePDF.create({
        data: {
            courseId: course1.id,
            title: 'Bhagavad Gita - Chapter 2 Summary',
            url: 'https://example.com/pdfs/chapter2_summary.pdf'
        }
    });

    // Create quizzes
    await prisma.quiz.create({
        data: {
            courseId: course1.id,
            classLevel: '10th',
            numQuestions: 2,
            passPercentage: 70,
            questionBankId: questionBank1.id
        }
    });

    console.log("✅ Created sample courses and content");

    console.log("✅ Database seeding completed successfully!");
    console.log('\n🔑 Master Admin credentials:');
    console.log('Email: master@haddi.com');
    console.log('Password: admin123');
    console.log('\n👨‍🎓 Test Student credentials:');
    console.log('Email: student@example.com');
    console.log('Password: password123');
    console.log(`\n📋 Created ${mpDistricts.length} districts of Madhya Pradesh`);
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 