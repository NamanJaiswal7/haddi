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
  "Pandhurna - पंधुरना",
  "Panna - पन्ना",
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

    console.log("✅ Database seeding completed successfully!");
    console.log('\n🔑 Master Admin credentials:');
    console.log('Email: master@haddi.com');
    console.log('Password: admin123');
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