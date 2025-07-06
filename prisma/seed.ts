import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const mpDistricts = [
    "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", 
    "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", 
    "Gwalior", "Harda", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", 
    "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", 
    "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", 
    "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha", "Mauganj", "Pandhurna", "Maihar"
];

async function main() {
    console.log("🌱 Starting database seeding...");

    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await prisma.$transaction([
        prisma.notificationRecipient.deleteMany(),
        prisma.notification.deleteMany(),
        prisma.eventParticipant.deleteMany(),
        prisma.event.deleteMany(),
        prisma.studentProgress.deleteMany(),
        prisma.examAttempt.deleteMany(),
        prisma.quiz.deleteMany(),
        prisma.question.deleteMany(),
        prisma.questionBank.deleteMany(),
        prisma.courseVideo.deleteMany(),
        prisma.courseNote.deleteMany(),
        prisma.coursePDF.deleteMany(),
        prisma.course.deleteMany(),
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