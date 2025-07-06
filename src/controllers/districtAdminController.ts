import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Gets the key performance indicators for the district admin dashboard.
 * - Total number of students in the district.
 * - Number of students active in the last 24 hours.
 * - Number of students who have completed level 1.
 * - Number of unique students who have completed all available courses.
 */
export const getDashboardStats = async (req: Request, res: Response) => {
    const districtId = req.user?.districtId;

    if (!districtId) {
        return res.status(403).json({ message: 'Admin user is not associated with a district.' });
    }

    try {
        const totalStudentsPromise = prisma.user.count({
            where: { role: 'student', districtId },
        });

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeStudentsPromise = prisma.user.count({
            where: {
                role: 'student',
                districtId,
                lastActiveAt: { gte: oneDayAgo },
            },
        });

        // Counts the number of unique students who have successfully completed Level 1
        const completedLevel1Promise = prisma.studentProgress.aggregate({
            _count: { studentId: true },
            where: {
                student: { districtId },
                course: { level: '1' } as any,
                status: 'completed',
                qualified: true,
            },
        });

        // Logic to count students who have completed ALL courses
        const totalCourseCountPromise = prisma.course.count();
        
        const [totalStudents, activeStudents, completedLevel1Result, totalCourseCount] = await Promise.all([
            totalStudentsPromise,
            activeStudentsPromise,
            completedLevel1Promise,
            totalCourseCountPromise,
        ]);

        // Fix for _count possibly being 'true' or object
        let completedLevel1 = 0;
        if (completedLevel1Result && typeof completedLevel1Result._count === 'object' && completedLevel1Result._count.studentId !== undefined) {
            completedLevel1 = completedLevel1Result._count.studentId;
        }

        let courseCompleted = 0;
        if (totalCourseCount > 0) {
            const studentsWhoCompletedAll = await prisma.studentProgress.groupBy({
                by: ['studentId'],
                where: {
                    student: { districtId: districtId },
                    status: 'completed',
                    qualified: true,
                },
                _count: {
                    studentId: true,
                },
                having: {
                    studentId: {
                        _count: { equals: totalCourseCount },
                    },
                },
            });
            courseCompleted = studentsWhoCompletedAll.length;
        }

        res.status(200).json({
            totalStudents,
            activeStudents,
            completedLevel1,
            courseCompleted
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Retrieves a paginated and searchable list of students for the district.
 * Supports searching by name/school and filtering by level.
 */
export const getStudentList = async (req: Request, res: Response) => {
    const districtId = req.user?.districtId;
    if (!districtId) {
        return res.status(403).json({ message: 'Admin user is not associated with a district.' });
    }

    const { search, level, page = '1', pageSize = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);

    try {
        const where: any = {
            role: 'student',
            districtId: districtId,
        };

        // Handle the dedicated level filter dropdown
        if (level) {
            where.studentProgress = {
                some: {
                    course: { level: level as string },
                    status: 'in_progress', // Assuming "Current Level" means in progress
                }
            }
        }

        // Handle the free-text search box for name, school, or level
        if (search) {
            const searchString = search as string;
            const searchConditions: any[] = [
                { name: { contains: searchString, mode: 'insensitive' } },
                { school: { contains: searchString, mode: 'insensitive' } },
            ];
            
            // Check if the search string is "level X" or just a number
            const levelRegex = /level\s*(\d+)/i;
            const match = searchString.match(levelRegex);
            const searchAsInt = parseInt(searchString, 10);

            if (match && match[1]) {
                const levelFromSearch = parseInt(match[1], 10);
                searchConditions.push({ studentProgress: { some: { course: { level: levelFromSearch.toString() }, status: 'in_progress' } } });
            } else if (!isNaN(searchAsInt)) {
                searchConditions.push({ studentProgress: { some: { course: { level: searchAsInt.toString() }, status: 'in_progress' } } });
            }
            
            where.OR = searchConditions;
        }

        const students = await prisma.user.findMany({
            where,
            skip: (pageNum - 1) * size,
            take: size,
            include: {
                studentProgress: {
                    orderBy: { course: { level: 'desc' } },
                    take: 1,
                    include: { course: true }
                },
                examAttempts: {
                    orderBy: { completedAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { lastActiveAt: 'desc' }
        });

        const totalStudents = await prisma.user.count({ where });

        const formattedStudents = students.map(student => {
            const currentProgress = student.studentProgress[0];
            const lastAttempt = student.examAttempts[0];
            return {
                id: student.id,
                name: student.name,
                age: student.dob ? new Date().getFullYear() - new Date(student.dob).getFullYear() : null,
                school: student.school,
                currentLevel: currentProgress?.course.level || 'N/A',
                progress: '1/4', // Placeholder: Progress within a level is not yet modeled
                score: lastAttempt?.score || 0,
                lastActive: student.lastActiveAt,
            };
        });

        res.status(200).json({
            students: formattedStudents,
            totalPages: Math.ceil(totalStudents / size),
            currentPage: pageNum,
        });

    } catch (error) {
        console.error("Error fetching student list:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * Retrieves analytics data for the district, including completion rates, engagement, and top schools.
 */
export const getAnalyticsData = async (req: Request, res: Response) => {
    const districtId = req.user?.districtId;

    if (!districtId) {
        return res.status(403).json({ message: 'Admin user is not associated with a district.' });
    }

    try {
        // 1. Level Completion Rate
        const totalStudentsInDistrict = await prisma.user.count({ where: { districtId, role: 'student' } });
        const courses = await prisma.course.findMany({ distinct: ['level'], orderBy: { level: 'asc' } });
        
        const levelCompletionRate = await Promise.all(
            courses.map(async (course) => {
                // Using aggregate to fix the TSError with `distinct` in `count`
                const completedResult = await prisma.studentProgress.aggregate({
                    _count: { studentId: true },
                    where: {
                        student: { districtId },
                        course: { level: course.level },
                        status: 'completed',
                        qualified: true,
                    },
                });
                const completedCount = completedResult._count.studentId;

                return {
                    level: course.level,
                    completed: completedCount,
                    total: totalStudentsInDistrict,
                    percentage: totalStudentsInDistrict > 0 ? (completedCount / totalStudentsInDistrict) * 100 : 0,
                };
            })
        );

        // 2. Student Engagement
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

        const highlyActive = await prisma.user.count({ where: { districtId, role: 'student', lastActiveAt: { gte: oneDayAgo } } });
        const moderatelyActive = await prisma.user.count({ where: { districtId, role: 'student', lastActiveAt: { lt: oneDayAgo, gte: threeDaysAgo } } });
        const inactive = await prisma.user.count({ where: { districtId, role: 'student', OR: [{ lastActiveAt: { lt: threeDaysAgo } }, { lastActiveAt: null }] } });
        
        const studentEngagement = { highlyActive, moderatelyActive, inactive };

        // 3. Top Performing School - This logic finds the single top school for the dashboard card.
        // The full, sortable list is available at the /school-performance endpoint.
        const schoolScores = await prisma.user.findMany({
            where: {
                districtId,
                role: 'student',
                school: { not: null },
                examAttempts: { some: {} }
            },
            select: {
                school: true,
                examAttempts: {
                    select: { score: true },
                    where: { score: { not: null } }
                }
            }
        });

        const schoolAverageScores: { [key: string]: { totalScore: number; attemptCount: number } } = {};
        
        schoolScores.forEach(student => {
            if (student.school) {
                if (!schoolAverageScores[student.school]) {
                    schoolAverageScores[student.school] = { totalScore: 0, attemptCount: 0 };
                }
                
                const schoolData = schoolAverageScores[student.school]!;
                
                const studentTotalScore = student.examAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
                schoolData.totalScore += studentTotalScore;
                schoolData.attemptCount += student.examAttempts.length;
            }
        });

        const schoolPerformance = Object.entries(schoolAverageScores)
            .map(([school, data]) => ({
                school,
                avgScore: data.attemptCount > 0 ? Math.round(data.totalScore / data.attemptCount) : 0,
            }))
            .sort((a, b) => b.avgScore - a.avgScore);

        const topSchool = schoolPerformance.length > 0 ? schoolPerformance[0] : null;

        const topPerformingSchool = topSchool ? { name: topSchool.school } : null;

        res.status(200).json({
            levelCompletionRate,
            studentEngagement,
            topPerformingSchool // Simplified for main dashboard
        });

    } catch (error) {
        console.error("Error fetching analytics data:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * Retrieves a filterable and sortable list of school performance data for the district.
 */
export const getSchoolPerformance = async (req: Request, res: Response) => {
    const districtId = req.user?.districtId;
    const { sortBy = 'avgScore', order = 'desc', search = '' } = req.query;

    if (!districtId) {
        return res.status(403).json({ message: 'Admin user is not associated with a district.' });
    }

    try {
        const schoolScores = await prisma.user.findMany({
            where: {
                districtId,
                role: 'student',
                school: { 
                    not: null,
                    contains: search as string,
                    mode: 'insensitive'
                },
                examAttempts: { some: {} }
            },
            select: {
                school: true,
                examAttempts: {
                    select: { score: true },
                    where: { score: { not: null } }
                }
            }
        });

        const schoolAverageScores: { [key: string]: { totalScore: number; attemptCount: number; studentCount: number } } = {};
        
        schoolScores.forEach(student => {
            if (student.school) {
                if (!schoolAverageScores[student.school]) {
                    schoolAverageScores[student.school] = { totalScore: 0, attemptCount: 0, studentCount: 0 };
                }
                
                const schoolData = schoolAverageScores[student.school]!;
                
                const studentTotalScore = student.examAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
                schoolData.totalScore += studentTotalScore;
                schoolData.attemptCount += student.examAttempts.length;
                schoolData.studentCount++;
            }
        });

        let schoolPerformance = Object.entries(schoolAverageScores)
            .map(([school, data]) => ({
                school,
                avgScore: data.attemptCount > 0 ? Math.round(data.totalScore / data.attemptCount) : 0,
                studentCount: data.studentCount,
            }));

        schoolPerformance.sort((a, b) => {
            const key = sortBy as keyof typeof a;
            let comparison = 0;

            if (key === 'school') {
                comparison = a.school.localeCompare(b.school);
            } else if (key === 'studentCount' || key === 'avgScore') {
                const valA = a[key] as number;
                const valB = b[key] as number;
                comparison = valA - valB;
            }

            return order === 'asc' ? comparison : -comparison;
        });

        res.status(200).json(schoolPerformance);

    } catch (error) {
        console.error("Error fetching school performance:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Sends a notification to a targeted group of students within the admin's district.
 * Target audience can be 'ALL', 'LEVEL', or 'SCHOOL'.
 */
export const sendNotification = async (req: Request, res: Response) => {
    const { targetType, targetValue, message, title } = req.body; // e.g., targetType: 'LEVEL', targetValue: '2'
    const adminUser = req.user;

    if (!adminUser || !adminUser.districtId) {
        return res.status(403).json({ message: 'Admin user is not associated with a district.' });
    }
    if (!message || !title) {
        return res.status(400).json({ message: 'Title and message are required.'});
    }

    try {
        // 1. Determine the target students
        const where: any = {
            role: 'student',
            districtId: adminUser.districtId,
        };

        switch (targetType) {
            case 'LEVEL':
                if (!targetValue) return res.status(400).json({ message: 'Level value is required for this target type.' });
                where.studentProgress = { some: { course: { level: targetValue } } };
                break;
            case 'SCHOOL':
                if (!targetValue) return res.status(400).json({ message: 'School value is required for this target type.' });
                where.school = targetValue;
                break;
            case 'ALL':
                // No additional filtering needed
                break;
            default:
                return res.status(400).json({ message: 'Invalid target type specified.' });
        }

        const targetStudents = await prisma.user.findMany({
            where,
            select: { id: true },
        });

        if (targetStudents.length === 0) {
            return res.status(404).json({ message: 'No students found matching the target criteria.' });
        }

        // 2. Create the notification and the recipient records
        const newNotification = await prisma.notification.create({
            data: {
                title: title,
                content: message,
                type: 'admin_announcement', // Or another relevant type
                senderId: adminUser.id,
                districtId: adminUser.districtId,
            }
        });

        const recipientData = targetStudents.map(student => ({
            notificationId: newNotification.id,
            userId: student.id,
        }));

        await prisma.notificationRecipient.createMany({
            data: recipientData,
        });

        res.status(201).json({ message: `Notification sent to ${targetStudents.length} students successfully.` });

    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Fetches all unique schools in the district admin's district.
 * This is useful for populating school filter dropdowns and other district-specific operations.
 */
export const getDistrictSchools = async (req: Request, res: Response) => {
    const districtId = req.user?.districtId;

    if (!districtId) {
        return res.status(403).json({ message: 'Admin user is not associated with a district.' });
    }

    try {
        const schools = await prisma.user.findMany({
            where: {
                role: 'student',
                districtId: districtId,
                school: { not: null }, // Only include students with a school
            },
            select: {
                school: true,
            },
            distinct: ['school'],
            orderBy: {
                school: 'asc',
            },
        });

        // Extract and return just the school names
        const schoolNames = schools
            .map(s => s.school)
            .filter((school): school is string => school !== null); // TypeScript guard to remove nulls

        res.status(200).json(schoolNames);
    } catch (error) {
        console.error("Error fetching district schools:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Creates a new event for the district.
 */
export const createEvent = async (req: Request, res: Response) => {
    const { title, type, description, location, date, time } = req.body;
    const adminUser = req.user;

    if (!adminUser || !adminUser.districtId) {
        return res.status(403).json({ message: 'Admin user is not associated with a district.' });
    }

    if (!title || !type || !description || !location || !date || !time) {
        return res.status(400).json({ message: 'All event fields are required.' });
    }

    try {
        const eventDateTime = new Date(`${date}T${time}`);
        if (isNaN(eventDateTime.getTime())) {
            return res.status(400).json({ message: 'Invalid date or time format provided.' });
        }

        const newEvent = await prisma.event.create({
            data: {
                title,
                type,
                description,
                location,
                date: eventDateTime,
                creatorId: adminUser.id,
                districtId: adminUser.districtId,
            },
        });

        res.status(201).json(newEvent);
    } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Retrieves upcoming events for the district within the next 45 days.
 */
export const getUpcomingEvents = async (req: Request, res: Response) => {
    const adminUser = req.user;

    if (!adminUser || !adminUser.districtId) {
        return res.status(403).json({ message: 'Admin user is not associated with a district.' });
    }

    try {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 45);

        // Set the start of the date range to the beginning of the current day in UTC
        // to avoid timezone issues where an event for later today might be missed.
        const startOfTodayUTC = new Date();
        startOfTodayUTC.setUTCHours(0, 0, 0, 0);

        const events = await prisma.event.findMany({
            where: {
                districtId: adminUser.districtId,
                // Fetch all events from the start of today onwards
                date: {
                    gte: startOfTodayUTC,
                },
            },
            include: {
                _count: {
                    select: { participants: true },
                },
            },
            orderBy: {
                date: 'asc',
            },
        });

        const formattedEvents = events.map(event => ({
            id: event.id,
            title: event.title,
            type: event.type,
            date: event.date.toISOString().split('T')[0],
            participants: event._count.participants,
            status: event.date > new Date() ? 'Active' : 'Past',
        }));

        res.status(200).json(formattedEvents);
    } catch (error) {
        console.error("Error fetching upcoming events:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Updates an event for the district.
 * Ensures the admin can only update events within their own district.
 */
export const updateDistrictEvent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, type, description, location, date, time } = req.body;
    const adminUser = req.user;

    if (!id) {
        return res.status(400).json({ message: 'Event ID is required in the URL.' });
    }

    try {
        const eventId = parseInt(id, 10);
        if (isNaN(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID.' });
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        // Security check: ensure the event belongs to the admin's district
        if (event.districtId !== adminUser?.districtId) {
            return res.status(403).json({ message: 'Forbidden: You can only edit events in your own district.' });
        }

        const dataToUpdate: any = {};
        if (title) dataToUpdate.title = title;
        if (type) dataToUpdate.type = type;
        if (description) dataToUpdate.description = description;
        if (location) dataToUpdate.location = location;
        if (date && time) {
            const eventDateTime = new Date(`${date}T${time}`);
            if (isNaN(eventDateTime.getTime())) {
                return res.status(400).json({ message: 'Invalid date or time format.' });
            }
            dataToUpdate.date = eventDateTime;
        }

        const updatedEvent = await prisma.event.update({
            where: { id: eventId },
            data: dataToUpdate,
        });

        res.status(200).json(updatedEvent);
    } catch (error) {
        console.error("Error updating district event:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
}; 