import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import bcrypt from 'bcrypt';
import * as xlsx from 'xlsx';
import { uploadToS3 } from '../utils/s3Uploader';
import logger from '../utils/logger';
import { upload } from '../middleware/uploadMiddleware';
import { validateEventType } from '../utils/eventValidation';

// Static education options (these don't change)
const educationOptions = [
  { label: 'High School', value: 'high_school', classes: ['6th', '7th', '8th'] },
  { label: 'Senior Secondary', value: 'senior_secondary', classes: ['9th', '10th', '11th', '12th'] },
  { label: 'College', value: 'college', classes: ['UG', 'PG', 'PhD', 'Working', 'Others'] },
];

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const totalStudentsPromise = prisma.user.count({ where: { role: 'student' } });
        const totalDistrictsPromise = prisma.district.count();
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeStudentsPromise = prisma.user.count({
            where: {
                role: 'student',
                lastActiveAt: { gte: oneDayAgo },
            },
        });

        const totalCourseCountPromise = prisma.course.count();

        const avgScorePromise = prisma.examAttempt.aggregate({
            _avg: { score: true },
        });

        const [
            totalStudents,
            totalDistricts,
            activeStudents,
            totalCourseCount,
            avgScoreResult,
        ] = await Promise.all([
            totalStudentsPromise,
            totalDistrictsPromise,
            activeStudentsPromise,
            totalCourseCountPromise,
            avgScorePromise,
        ]);

        let courseCompleted = 0;
        if (totalCourseCount > 0) {
            const studentsWhoCompletedAll = await prisma.studentProgress.groupBy({
                by: ['studentId'],
                where: {
                    status: 'completed',
                    qualified: true,
                },
                _count: { studentId: true },
                having: {
                    studentId: { _count: { equals: totalCourseCount } },
                },
            });
            courseCompleted = studentsWhoCompletedAll.length;
        }

        const avgScore = avgScoreResult._avg.score || 0;

        res.status(200).json({
            totalStudents,
            totalDistricts,
            activeStudents,
            courseCompleted,
            avgScore: Math.round(avgScore),
        });

    } catch (error) {
        console.error("Error fetching master admin dashboard stats:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getDistrictPerformance = async (req: Request, res: Response) => {
    try {
        // Get all courses grouped by class level to determine completion requirements per class
        const courses = await prisma.course.findMany({
            select: {
                id: true,
                classLevel: true,
                level: true
            },
            orderBy: {
                level: 'asc'
            }
        });

        // Group courses by class level to determine how many courses each class needs to complete
        const coursesByClass: Record<string, string[]> = {};
        courses.forEach(course => {
            // Only process courses with a valid classLevel
            if (course.classLevel) {
                const classLevel = course.classLevel; // Store in a local variable to satisfy TypeScript
                // Initialize the array for this class level if it doesn't exist
                if (!coursesByClass[classLevel]) {
                    coursesByClass[classLevel] = [];
                }
                // Now we can safely push to the array
                coursesByClass[classLevel].push(course.id);
            }
        });

        // 1. Get all districts with their students and exam attempts
        const districts = await prisma.district.findMany({
            include: {
                users: {
                    where: { role: 'student' },
                    include: {
                        examAttempts: {
                            where: { score: { not: null } },
                            select: { score: true },
                        },
                        studentProgress: {
                            where: { status: 'completed', qualified: true },
                            include: {
                                course: {
                                    select: {
                                        id: true,
                                        classLevel: true,
                                        level: true
                                    }
                                }
                            }
                        }
                    },
                },
            },
        });

        // 2. Process the data for each district
        const performanceData = districts.map(district => {
            const districtUsers = district.users || [];
            const studentCount = districtUsers.length;
            if (studentCount === 0) {
                return {
                    id: district.id,
                    name: district.name,
                    studentCount: 0,
                    completionPercentage: 0,
                    avgScore: 0,
                    completedCount: 0,
                    enrolledCount: 0
                };
            }

            let totalScore = 0;
            let attemptCount = 0;
            let completedCount = 0;
            let enrolledCount = 0;

            // Track students who have completed all courses for their class level
            districtUsers.forEach(student => {
                // Calculate avg score
                const studentTotalScore = student.examAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
                totalScore += studentTotalScore;
                attemptCount += student.examAttempts.length;

                // Count as enrolled if they have any exam attempts or progress
                if (student.examAttempts.length > 0 || student.studentProgress.length > 0) {
                    enrolledCount++;
                }

                // Check for full course completion based on student's class level
                const classLevel = student.classLevel;
                if (classLevel && coursesByClass[classLevel]) {
                    const requiredCourseIds = coursesByClass[classLevel];
                    const completedCourseIds = student.studentProgress.map(progress => progress.course.id);
                    
                    // Check if student has completed all courses for their class level
                    const hasCompletedAllRequired = requiredCourseIds.every(courseId => 
                        completedCourseIds.includes(courseId)
                    );
                    
                    if (hasCompletedAllRequired) {
                        completedCount++;
                    }
                }
            });

            const avgScore = attemptCount > 0 ? Math.round(totalScore / attemptCount) : 0;
            const completionPercentage = enrolledCount > 0 ? (completedCount / enrolledCount) * 100 : 0;

            return {
                id: district.id,
                name: district.name,
                studentCount,
                enrolledCount,
                completionPercentage: Math.round(completionPercentage),
                avgScore,
                completedCount,
            };
        });

        // Sort by name for consistent order
        performanceData.sort((a, b) => a.name.localeCompare(b.name));

        res.status(200).json(performanceData);

    } catch (error) {
        console.error("Error fetching district performance:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Retrieves a paginated and searchable list of all students across all districts.
 * Supports filtering by district, level, and a general search for name/school.
 */
export const getAllStudents = async (req: Request, res: Response) => {
    const { search, level, districtId, page = '1', pageSize = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const size = parseInt(pageSize as string, 10);

    try {
        const where: any = {
            role: 'student',
        };

        // Add district filter if provided
        if (districtId) {
            where.districtId = districtId as string;
        }

        // Handle the dedicated level filter
        if (level) {
            where.studentProgress = {
                some: {
                    course: { level: level as string },
                },
            };
        }

        // Handle the free-text search for name or school
        if (search) {
            const searchString = search as string;
            where.OR = [
                { name: { contains: searchString, mode: 'insensitive' } },
                { school: { contains: searchString, mode: 'insensitive' } },
            ];
        }

        const students = await prisma.user.findMany({
            where,
            include: {
                district: {
                    select: { name: true }
                },
                studentProgress: {
                    orderBy: { course: { level: 'desc' } },
                    take: 1,
                    include: { course: true },
                },
                examAttempts: {
                    orderBy: { completedAt: 'desc' },
                    take: 1,
                },
            },
            skip: (pageNum - 1) * size,
            take: size,
            orderBy: { createdAt: 'desc' },
        });

        const totalStudents = await prisma.user.count({ where });

        const formattedStudents = students.map(student => {
            const currentProgress = student.studentProgress[0];
            const lastAttempt = student.examAttempts[0];
            return {
                id: student.id,
                name: student.name,
                age: student.dob ? new Date().getFullYear() - new Date(student.dob).getFullYear() : null,
                district: student.district?.name || 'N/A',
                school: student.school,
                currentLevel: currentProgress?.course.level || 'N/A',
                progress: '1/4', // Placeholder
                score: lastAttempt?.score || 0,
                status: student.lastActiveAt && new Date(student.lastActiveAt) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) ? 'Active' : 'Inactive',
            };
        });

        res.status(200).json({
            students: formattedStudents,
            totalPages: Math.ceil(totalStudents / size),
            currentPage: pageNum,
        });

    } catch (error) {
        console.error("Error fetching all students:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Fetches a list of all district admins with their associated data.
 */
export const getDistrictAdmins = async (req: Request, res: Response) => {
    try {
        const admins = await prisma.user.findMany({
            where: { role: 'district_admin' },
            include: {
                district: {
                    select: {
                        name: true,
                        _count: {
                            select: { users: { where: { role: 'student' } } },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const formattedAdmins = admins.map(admin => ({
            id: admin.id,
            name: admin.name,
            email: admin.email,
            districtName: admin.district?.name || 'N/A',
            studentCount: admin.district?._count.users || 0,
            lastLogin: admin.lastActiveAt,
        }));

        res.status(200).json(formattedAdmins);
    } catch (error) {
        console.error("Error fetching district admins:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Creates a new district admin user.
 */
export const createDistrictAdmin = async (req: Request, res: Response) => {
    const { name, email, password, districtId } = req.body;

    if (!name || !email || !password || !districtId) {
        return res.status(400).json({ message: 'Name, email, password, and district are required.' });
    }

    try {
        // Check if an admin with this email already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'An admin with this email already exists.' });
        }

        // Check if the district exists and is not already assigned
        const district = await prisma.district.findUnique({
            where: { id: districtId },
            include: { users: { where: { role: 'district_admin' } } },
        });

        if (!district) {
            return res.status(404).json({ message: 'The specified district does not exist.' });
        }
        if (district.users.length > 0) {
            return res.status(409).json({ message: 'This district already has an admin assigned to it.' });
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10);

        const newAdmin = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                districtId,
                role: 'district_admin',
                // The mobile field is required and unique. Using a placeholder.
                mobile: `temp_${Date.now()}@admin.com`, 
            },
        });

        res.status(201).json({
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
            districtName: district.name,
            studentCount: 0,
            lastLogin: null,
        });

    } catch (error) {
        console.error("Error creating district admin:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Updates an existing district admin user.
 */
export const updateDistrictAdmin = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, districtId } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Admin ID is required.' });
    }

    try {
        // Check if the admin exists and is a district admin
        const existingAdmin = await prisma.user.findUnique({
            where: { id },
            include: { district: true }
        });

        if (!existingAdmin) {
            return res.status(404).json({ message: 'District admin not found.' });
        }

        if (existingAdmin.role !== 'district_admin') {
            return res.status(400).json({ message: 'The specified user is not a district admin.' });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== existingAdmin.email) {
            const emailExists = await prisma.user.findUnique({ where: { email } });
            if (emailExists) {
                return res.status(409).json({ message: 'An admin with this email already exists.' });
            }
        }

        // Check if district is being changed and if it's already assigned
        if (districtId && districtId !== existingAdmin.districtId) {
            const district = await prisma.district.findUnique({
                where: { id: districtId },
                include: { users: { where: { role: 'district_admin' } } },
            });

            if (!district) {
                return res.status(404).json({ message: 'The specified district does not exist.' });
            }
            if (district.users.length > 0) {
                return res.status(409).json({ message: 'This district already has an admin assigned to it.' });
            }
        }

        // Prepare update data
        const updateData: { name?: string; email?: string; districtId?: string } = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (districtId) updateData.districtId = districtId;

        // Update the admin
        const updatedAdmin = await prisma.user.update({
            where: { id },
            data: updateData,
            include: {
                district: {
                    select: {
                        name: true,
                        _count: {
                            select: { users: { where: { role: 'student' } } },
                        },
                    },
                },
            },
        });

        res.status(200).json({
            id: updatedAdmin.id,
            name: updatedAdmin.name,
            email: updatedAdmin.email,
            districtName: updatedAdmin.district?.name || 'N/A',
            studentCount: updatedAdmin.district?._count.users || 0,
            lastLogin: updatedAdmin.lastActiveAt,
        });

    } catch (error) {
        console.error("Error updating district admin:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Deletes a district admin user.
 */
export const deleteDistrictAdmin = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'Admin ID is required.' });
    }

    try {
        // Check if the admin exists and is a district admin
        const existingAdmin = await prisma.user.findUnique({
            where: { id },
            include: { district: true }
        });

        if (!existingAdmin) {
            return res.status(404).json({ message: 'District admin not found.' });
        }

        if (existingAdmin.role !== 'district_admin') {
            return res.status(400).json({ message: 'The specified user is not a district admin.' });
        }

        // Check if there are any associated records that might prevent deletion
        // For example, check if they have created any events or notifications
        const hasEvents = await prisma.event.findFirst({
            where: { creatorId: id }
        });

        const hasNotifications = await prisma.notification.findFirst({
            where: { senderId: id }
        });

        if (hasEvents || hasNotifications) {
            return res.status(400).json({ 
                message: 'Cannot delete district admin. They have created events or notifications that must be handled first.' 
            });
        }

        // Delete the admin
        await prisma.user.delete({
            where: { id }
        });

        res.status(200).json({ 
            message: 'District admin deleted successfully.',
            deletedAdmin: {
                id: existingAdmin.id,
                name: existingAdmin.name,
                email: existingAdmin.email,
                districtName: existingAdmin.district?.name || 'N/A'
            }
        });

    } catch (error) {
        console.error("Error deleting district admin:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Creates a new global event.
 */
export const createGlobalEvent = async (req: Request, res: Response) => {
    const { title, type, description, location, date, time, ctaName, ctaLink } = req.body;
    const adminUser = req.user;

    if (!adminUser) {
        return res.status(403).json({ message: 'Authentication error: User not found.' });
    }

    if (!title || !type || !description || !location || !date || !time) {
        return res.status(400).json({ message: 'All event fields are required.' });
    }

    // Validate event type
    const typeValidationError = validateEventType(type);
    if (typeValidationError) {
        return res.status(400).json({ message: typeValidationError });
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
                ctaName,
                ctaLink,
                creatorId: adminUser!.id,
                // districtId is omitted to mark it as a global event
            },
        });

        res.status(201).json(newEvent);
    } catch (error) {
        console.error("Error creating global event:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Fetches all global and district-specific events for the master admin view.
 */
export const getAllEvents = async (req: Request, res: Response) => {
    try {
        const events = await prisma.event.findMany({
            // No 'where' clause to fetch all events
            include: {
                district: {
                    select: { name: true }
                },
                participants: {
                    select: {
                        user: {
                            select: {
                                districtId: true,
                            },
                        },
                    },
                },
            },
            orderBy: { date: 'desc' },
        });

        const formattedEvents = events.map(event => {
            const participantCount = event.participants.length;
            let districtInfo;

            if (event.districtId && event.district) {
                // District-specific event
                districtInfo = {
                    districtName: event.district.name,
                    districtCount: 1
                };
            } else {
                // Global event
                const distinctDistricts = new Set(event.participants.map(p => p.user.districtId).filter(Boolean));
                districtInfo = {
                    districtName: 'Global',
                    districtCount: distinctDistricts.size
                };
            }

            return {
                id: event.id,
                title: event.title,
                type: event.type,
                date: event.date,
                participantCount,
                ctaName: event.ctaName,
                ctaLink: event.ctaLink,
                ...districtInfo,
            };
        });

        res.status(200).json(formattedEvents);
    } catch (error) {
        console.error("Error fetching all events:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Updates an existing event. Can be used by a master admin for any event.
 */
export const updateEvent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, type, description, location, date, time, ctaName, ctaLink } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Event ID is required in the URL.' });
    }

    try {
        const eventId = parseInt(id, 10);
        if (isNaN(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID.' });
        }
        
        // Ensure the event exists before trying to update
        const existingEvent = await prisma.event.findUnique({ where: { id: eventId } });
        if (!existingEvent) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        const dataToUpdate: any = {};
        if (title) dataToUpdate.title = title;
        if (type) {
            // Validate event type
            const typeValidationError = validateEventType(type);
            if (typeValidationError) {
                return res.status(400).json({ message: typeValidationError });
            }
            dataToUpdate.type = type;
        }
        if (description) dataToUpdate.description = description;
        if (location) dataToUpdate.location = location;
        if (ctaName !== undefined) dataToUpdate.ctaName = ctaName;
        if (ctaLink !== undefined) dataToUpdate.ctaLink = ctaLink;
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
        console.error("Error updating event:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Sends a notification to a targeted group of students across the entire system.
 */
export const sendGlobalNotification = async (req: Request, res: Response) => {
    const { targetType, targetValue, message, title } = req.body;
    const adminUser = req.user;

    if (!message || !title) {
        return res.status(400).json({ message: 'Title and message are required.' });
    }

    try {
        let studentIds: string[] = [];
        const where: any = { role: 'student' };

        switch (targetType) {
            case 'ALL_STUDENTS':
                // No additional filter needed
                break;
            case 'BY_LEVEL':
                if (!targetValue) return res.status(400).json({ message: 'Level value is required for this target type.' });
                where.studentProgress = { some: { course: { level: targetValue as string } } };
                break;
            case 'BY_DISTRICT':
                if (!targetValue) return res.status(400).json({ message: 'District ID is required for this target type.' });
                where.districtId = targetValue;
                break;
            case 'COMPLETED_ALL_COURSES': {
                const totalCourseCount = await prisma.course.count();
                if (totalCourseCount > 0) {
                    const completedStudents = await prisma.studentProgress.groupBy({
                        by: ['studentId'],
                        where: { status: 'completed', qualified: true },
                        _count: { studentId: true },
                        having: { studentId: { _count: { equals: totalCourseCount } } },
                    });
                    studentIds = completedStudents.map(s => s.studentId);
                }
                break;
            }
            case 'ACTIVE': {
                const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
                where.lastActiveAt = { gte: threeDaysAgo };
                break;
            }
            case 'INACTIVE': {
                const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
                where.OR = [{ lastActiveAt: { lt: threeDaysAgo } }, { lastActiveAt: null }];
                break;
            }
            default:
                return res.status(400).json({ message: 'Invalid target type specified.' });
        }
        
        // If studentIds were determined by a special query (like course completion), use them.
        // Otherwise, fetch users based on the constructed 'where' clause.
        if (studentIds.length === 0 && targetType === 'COMPLETED_ALL_COURSES') {
             // No students completed all courses, so do nothing.
        } else if (studentIds.length > 0) {
            where.id = { in: studentIds };
        }
        
        const targetStudents = await prisma.user.findMany({
            where,
            select: { id: true },
        });

        if (targetStudents.length === 0) {
            return res.status(404).json({ message: 'No students found matching the target criteria.' });
        }

        const newNotification = await prisma.notification.create({
            data: {
                title,
                content: message,
                type: 'admin_announcement',
                senderId: adminUser!.id,
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
        console.error("Error sending global notification:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Retrieves aggregated analytics data for the master admin dashboard.
 * Includes statewide progress, engagement metrics, and district performance.
 */
export const getAnalyticsData = async (req: Request, res: Response) => {
    try {
        // --- Concurrent Data Fetching ---
        const totalStudentsPromise = prisma.user.count({ where: { role: 'student' } });
        const coursesPromise = prisma.course.findMany({ orderBy: { level: 'asc' } });
        const distinctCompletedProgressPromise = prisma.studentProgress.findMany({
            where: { status: 'completed', qualified: true },
            select: { courseId: true, studentId: true },
            distinct: ['courseId', 'studentId'],
        });

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeStudentsPromise = prisma.user.count({
            where: { role: 'student', lastActiveAt: { gte: oneDayAgo } },
        });

        const startedCourseStudentsPromise = prisma.studentProgress.groupBy({
            by: ['studentId'],
        });

        const avgScorePromise = prisma.examAttempt.aggregate({
            _avg: { score: true },
        });

        const totalCourseCountPromise = prisma.course.count();

        const districtsPromise = prisma.district.findMany({
            include: {
                users: {
                    where: { role: 'student' },
                    include: {
                        examAttempts: { where: { score: { not: null } }, select: { score: true } },
                        studentProgress: { where: { status: 'completed', qualified: true } },
                    },
                },
            },
        });

        const [
            totalStudents,
            courses,
            distinctCompletedProgress,
            activeStudents,
            startedCourseStudents,
            avgScoreResult,
            totalCourseCount,
            districts,
        ] = await Promise.all([
            totalStudentsPromise,
            coursesPromise,
            distinctCompletedProgressPromise,
            activeStudentsPromise,
            startedCourseStudentsPromise,
            avgScorePromise,
            totalCourseCountPromise,
            districtsPromise,
        ]);

        // --- 1. Process Statewide Progress ---
        const completionCountsByCourse = distinctCompletedProgress.reduce((acc, p) => {
            acc[p.courseId] = (acc[p.courseId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const statewideProgress = courses.map(course => {
            const completedCount = completionCountsByCourse[course.id] || 0;
            return {
                level: course.level,
                title: `Level ${course.level} Completion`,
                completed: completedCount,
                total: totalStudents,
                percentage: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0,
            };
        });

        // --- 2. Process Engagement Metrics ---
        const startedCourseCount = startedCourseStudents.length;
        let courseCompletedCount = 0;
        if (totalCourseCount > 0) {
            const studentsWhoCompletedAll = await prisma.studentProgress.groupBy({
                by: ['studentId'],
                where: { status: 'completed', qualified: true },
                _count: { studentId: true },
                having: { studentId: { _count: { equals: totalCourseCount } } },
            });
            courseCompletedCount = studentsWhoCompletedAll.length;
        }

        const engagementMetrics = {
            dailyActive: totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0,
            startedCourse: totalStudents > 0 ? Math.round((startedCourseCount / totalStudents) * 100) : 0,
            completed: totalStudents > 0 ? Math.round((courseCompletedCount / totalStudents) * 100) : 0,
            avgScore: Math.round(avgScoreResult._avg.score || 0),
        };

        // --- 3. Process District Performance ---
        const districtPerformance = districts.map(district => {
            const studentCount = district.users.length;
            if (studentCount === 0) {
                return { id: district.id, name: district.name, studentCount: 0, completion: 0, avgScore: 0, graduated: 0 };
            }

            let totalScore = 0;
            let attemptCount = 0;
            let graduatedCount = 0;

            district.users.forEach(student => {
                totalScore += student.examAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
                attemptCount += student.examAttempts.length;
                if (totalCourseCount > 0 && student.studentProgress.length === totalCourseCount) {
                    graduatedCount++;
                }
            });

            const avgScore = attemptCount > 0 ? Math.round(totalScore / attemptCount) : 0;
            const completion = studentCount > 0 ? (graduatedCount / studentCount) * 100 : 0;

            return { id: district.id, name: district.name, studentCount, completion: Math.round(completion), avgScore, graduated: graduatedCount };
        }).sort((a, b) => {
            if (b.completion !== a.completion) return b.completion - a.completion;
            return b.avgScore - a.avgScore;
        });

        res.status(200).json({
            statewideProgress,
            engagementMetrics,
            districtPerformance,
        });

    } catch (error) {
        console.error("Error fetching master admin analytics data:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Ensures a course exists for a given class and level, creating it if it doesn't.
 */
const findOrCreateCourse = async (classLevel: string, level: string) => {
    if (!level || typeof level !== 'string') {
        throw new Error('Level must be a non-empty string');
    }
    
    if (!classLevel || typeof classLevel !== 'string') {
        throw new Error('Class level must be a non-empty string');
    }

    try {
        const course = await prisma.course.findFirst({
            where: { 
                classLevel, 
                level 
            },
        });

        if (course) {
            return course;
        }

        return await prisma.course.create({
            data: {
                classLevel,
                level,
                title: `Class ${classLevel} - ${level}`,
                description: `Course materials for Class ${classLevel}, Level ${level}.`,
            },
        });
    } catch (error) {
        console.error('Error in findOrCreateCourse:', error);
        throw new Error(`Failed to find or create course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Adds a video to a course.
 */
export const addVideo = async (req: Request, res: Response) => {
    const { class: classLevel, level, title, iframeSnippet } = req.body;

    if (!classLevel || !level || !title || !iframeSnippet) {
        return res.status(400).json({ message: 'Class, level, title, and iframeSnippet are required.' });
    }

    try {
        const course = await findOrCreateCourse(classLevel, level);

        const newVideo = await prisma.courseVideo.create({
            data: {
                courseId: course.id,
                title,
                iframeSnippet,
            },
        });

        res.status(201).json(newVideo);
    } catch (error) {
        console.error("Error adding video:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Adds a note to a course.
 */
export const addNote = async (req: Request, res: Response) => {
    const { class: classLevel, level, title, url } = req.body;

    if (!classLevel || !level) {
        return res.status(400).json({ message: 'Class and level are required.' });
    }

    if (!title) {
        return res.status(400).json({ message: 'Title is required.' });
    }

    if (!url) {
        return res.status(400).json({ message: 'URL is required.' });
    }

    try {
        const course = await findOrCreateCourse(classLevel, level);

        const newNote = await prisma.coursePDF.create({
            data: {
                courseId: course.id,
                title,
                url,
            },
        });

        res.status(201).json({
            message: 'Note created successfully.',
            note: newNote,
        });
    } catch (error) {
        console.error("Error adding note:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Creates a quiz by parsing an uploaded Excel file.
 */
// Enhanced interface for formatted quiz content
interface FormattedQuizContent {
    text: string;
    formatting?: {
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        backgroundColor?: string;
        alignment?: 'left' | 'center' | 'right';
        listType?: 'bullet' | 'numbered' | 'none';
        indentation?: number;
    };
    images?: Array<{
        url: string;
        alt: string;
        position: 'inline' | 'block';
        width?: number;
        height?: number;
    }>;
    tables?: Array<{
        headers: string[];
        rows: string[][];
        styling?: {
            headerBackground?: string;
            borderColor?: string;
            cellPadding?: number;
        };
    }>;
}

interface EnhancedQuestionInput {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: string;
    questionFormatted?: string;
    optionAFormatted?: string;
    optionBFormatted?: string;
    optionCFormatted?: string;
    optionDFormatted?: string;
    explanationFormatted?: string;
    difficulty?: string;
    points?: number;
    timeLimit?: number;
}

export const addQuiz = async (req: Request, res: Response) => {
    const { class: classLevel, level } = req.body;
    const file = req.file;

    if (!classLevel || !level || !file) {
        return res.status(400).json({ message: 'Class, level, and a file are required.' });
    }

    try {
        const course = await findOrCreateCourse(classLevel, level);

        // --- Enhanced Excel Parsing Logic with Formatting Preservation ---
        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            return res.status(400).json({ message: 'Excel file contains no sheets.' });
        }

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            return res.status(400).json({ message: `Sheet '${sheetName}' not found in the Excel file.` });
        }
        
        const quizData: (string | number)[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');

        if (quizData.length < 1) {
            return res.status(400).json({ message: 'Excel file must contain at least one question.' });
        }

        const questionsToCreate: EnhancedQuestionInput[] = [];
        
        // Process each row with formatting extraction
        for (let i = 0; i < quizData.length; i++) {
            const row = quizData[i];

            if (!row || row.length < 6 || row.slice(0, 6).some(cell => cell === null || cell === undefined)) {
                // Skip incomplete or empty rows
                continue;
            }
            
            const [q, oA, oB, oC, oD, cO, explanation] = row;

            const question = String(q).trim();
            const optionA = String(oA).trim();
            const optionB = String(oB).trim();
            const optionC = String(oC).trim();
            const optionD = String(oD).trim();
            const correctOption = String(cO).trim();
            const explanationText = explanation ? String(explanation).trim() : '';

            if (!question || !optionA || !optionB || !optionC || !optionD || !correctOption) {
                // Skip rows where essential data is empty after trimming
                continue;
            }

            // Extract formatted content for each field
            const questionFormatted = extractFormattedContent(worksheet, i, 0);
            const optionAFormatted = extractFormattedContent(worksheet, i, 1);
            const optionBFormatted = extractFormattedContent(worksheet, i, 2);
            const optionCFormatted = extractFormattedContent(worksheet, i, 3);
            const optionDFormatted = extractFormattedContent(worksheet, i, 4);
            const explanationFormatted = explanation ? extractFormattedContent(worksheet, i, 6) : null;

            // Determine difficulty based on question content or other criteria
            const difficulty = determineDifficulty(question, [optionA, optionB, optionC, optionD]);
            
            questionsToCreate.push({
                question,
                optionA,
                optionB,
                optionC,
                optionD,
                correctOption,
                questionFormatted: JSON.stringify(questionFormatted),
                optionAFormatted: JSON.stringify(optionAFormatted),
                optionBFormatted: JSON.stringify(optionBFormatted),
                optionCFormatted: JSON.stringify(optionCFormatted),
                optionDFormatted: JSON.stringify(optionDFormatted),
                explanationFormatted: explanationFormatted ? JSON.stringify(explanationFormatted) : undefined,
                difficulty,
                points: 1,
                timeLimit: 60
            });
        }

        if (questionsToCreate.length === 0) {
            return res.status(400).json({ message: 'No valid questions could be parsed from the file. Please check the format.' });
        }
        // --- End of Enhanced Parsing Logic ---

        const newQuiz = await prisma.$transaction(async (tx) => {
            const questionBank = await tx.questionBank.create({
                data: {
                    questions: { create: questionsToCreate },
                },
            });

            return tx.quiz.create({
                data: {
                    courseId: course.id,
                    classLevel: classLevel,
                    numQuestions: questionsToCreate.length,
                    passPercentage: 70, // Default pass percentage
                    questionBankId: questionBank.id,
                },
            });
        });

        res.status(201).json({
            message: `Quiz with ${questionsToCreate.length} questions created successfully with formatting preserved.`,
            quiz: newQuiz,
            formattingInfo: {
                preserved: true,
                fieldsWithFormatting: ['question', 'options', 'explanation'],
                totalQuestions: questionsToCreate.length
            }
        });

    } catch (error) {
        console.error("Error adding quiz:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Helper function to extract formatted content from Excel cells
function extractFormattedContent(worksheet: xlsx.WorkSheet, row: number, col: number): FormattedQuizContent {
    const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
    const cell = worksheet[cellAddress];
    
    if (!cell) {
        return { text: '' };
    }

    const content: FormattedQuizContent = {
        text: cell.v || '',
        formatting: {}
    };

    // Extract cell formatting if available
    if (cell.s) {
        const style = cell.s;
        
        if (style.font) {
            content.formatting!.bold = style.font.bold;
            content.formatting!.italic = style.font.italic;
            content.formatting!.underline = style.font.underline;
            content.formatting!.fontSize = style.font.sz;
            content.formatting!.fontFamily = style.font.name;
            content.formatting!.color = style.font.color?.rgb;
        }

        if (style.fill) {
            content.formatting!.backgroundColor = style.fill.fgColor?.rgb;
        }

        if (style.alignment) {
            content.formatting!.alignment = style.alignment.horizontal as 'left' | 'center' | 'right';
            content.formatting!.indentation = style.alignment.indent;
        }
    }

    // Check for rich text formatting
    if (cell.richText) {
        // Handle rich text formatting
        content.text = cell.richText.map((rt: any) => rt.text).join('');
        // You can extract individual formatting for each rich text segment
    }

    return content;
}

// Helper function to determine question difficulty
function determineDifficulty(question: string, options: string[]): string {
    const questionLength = question.length;
    const avgOptionLength = options.reduce((sum, opt) => sum + opt.length, 0) / options.length;
    
    // Simple heuristic based on content length and complexity
    if (questionLength > 200 || avgOptionLength > 100) {
        return 'hard';
    } else if (questionLength > 100 || avgOptionLength > 50) {
        return 'medium';
    } else {
        return 'easy';
    }
}

/**
 * Retrieves a list of all courses, with optional filtering by class and level.
 * Includes counts of associated videos, notes, and quizzes for each course.
 */
export const getAllCourses = async (req: Request, res: Response) => {
    const { classLevel, level } = req.query;

    const where: any = {};
    if (classLevel) {
        where.classLevel = classLevel as string;
    }
    if (level) {
        where.level = level as string;
    }
    try {
        const courses = await prisma.course.findMany({
            where,
            include: {
                videos: true,
                pdfs: true,
                quizzes: {
                    include: {
                        questionBank: {
                            include: {
                                questions: true
                            }
                        }
                    }
                },
            },
            orderBy: [
                { classLevel: 'asc' },
                { level: 'asc' },
            ],
        });

        // Group by classLevel and level
        const grouped: Record<string, Record<string, any>> = {};
        for (const course of courses) {
            // Defensive: skip if classLevel or level is missing
            if (!course.classLevel || !course.level) continue;
            
            const classKey = course.classLevel;
            const classGroup = grouped[classKey] ?? (grouped[classKey] = {});
            
            classGroup[course.level] = {
                title: course.title,
                videos: course.videos.map(v => ({
                    id: v.id,
                    title: v.title,
                    youtubeId: v.youtubeId,
                    thumbnail: v.thumbnail,
                    iframeSnippet: v.iframeSnippet
                })),
                notes: course.pdfs.map(n => ({
                    id: n.id,
                    title: n.title,
                    url: n.url
                })),
                quizzes: course.quizzes.map(q => ({
                    id: q.id,
                    classLevel: q.classLevel,
                    numQuestions: q.numQuestions,
                    passPercentage: q.passPercentage,
                    questions: q.questionBank?.questions?.map(qq => ({
                        id: qq.id,
                        question: qq.question,
                        optionA: qq.optionA,
                        optionB: qq.optionB,
                        optionC: qq.optionC,
                        optionD: qq.optionD,
                        correctOption: qq.correctOption
                    })) || []
                }))
            };
        }
        res.status(200).json(grouped);
    } catch (error) {
        console.error("Error fetching all courses:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Passing Marks Endpoints
export const setPassingMarks = async (req: Request, res: Response) => {
  const data = req.body; // expects { "6th": { "level1": 80, ... }, ... }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ message: 'Invalid payload format.' });
  }
  try {
    const upserts: Promise<any>[] = [];
    
    for (const classIdRaw in data) {
      const classId = String(classIdRaw);
      if (!data[classIdRaw] || typeof data[classIdRaw] !== 'object') continue;
      
      for (const levelIdRaw of Object.keys(data[classIdRaw])) {
        const levelId = String(levelIdRaw);
        const passingMarks = data[classIdRaw][levelIdRaw];
        
        // Normalize level ID to match course format (e.g., "level1" -> "Level 1")
        let normalizedLevelId = levelId;
        if (levelId.startsWith('level')) {
          const levelNum = levelId.replace('level', '');
          normalizedLevelId = `Level ${levelNum}`;
        }
        
        upserts.push(
          prisma.passingMark.upsert({
            where: { classId_levelId: { classId, levelId: normalizedLevelId } },
            update: { passingMarks },
            create: { classId, levelId: normalizedLevelId, passingMarks }
          })
        );
      }
    }
    
    await Promise.all(upserts);
    res.status(200).json({ message: 'Passing marks saved successfully.' });
  } catch (error) {
    console.error('Error setting passing marks:', error);
    res.status(500).json({ message: 'Failed to save passing marks', error: 'Internal server error' });
  }
};

export const getPassingMarks = async (req: Request, res: Response) => {
  const { classId, levelId } = req.query;
  try {
    let where: any = {};
    if (classId) where.classId = String(classId);
    if (levelId) where.levelId = String(levelId);
    const passingMarks = await prisma.passingMark.findMany({ where });
    // Transform to { classId: { levelId: passingMarks, ... }, ... }
    const result: Record<string, Record<string, number>> = {};
    for (const mark of passingMarks) {
      if (!result[mark.classId]) result[mark.classId] = {};
      result[mark.classId]![mark.levelId] = mark.passingMarks;
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch passing marks', error });
  }
};

export const getCourseLevels = async (req: Request, res: Response) => {
  try {
    // Fetch course levels from database
    const courseLevels = await prisma.courseLevel.findMany();
    
    // Transform database data to the expected format
    const classLevels = courseLevels.reduce((acc, cl) => {
      acc[cl.classId] = cl.levels;
      return acc;
    }, {} as Record<string, string[]>);
    
    // Get unique class levels from existing courses
    const existingCourses = await prisma.course.findMany({
      select: { classLevel: true },
      distinct: ['classLevel']
    });
    
    const availableClasses = existingCourses.map(course => course.classLevel);
    
    // Static education options (these don't change)
    const educationOptions = [
      { label: 'High School', value: 'high_school', classes: ['6th', '7th', '8th'] },
      { label: 'Senior Secondary', value: 'senior_secondary', classes: ['9th', '10th', '11th', '12th'] },
      { label: 'College', value: 'college', classes: ['UG', 'PG', 'PhD', 'Working', 'Others'] },
    ];
    
    res.json({ 
      educationOptions, 
      classLevels,
      availableClasses 
    });
  } catch (error) {
    logger.error('Error fetching course levels: %o', error);
    res.status(500).json({ message: 'Failed to fetch course levels', error });
  }
};

export const setCourseLevels = async (req: Request, res: Response) => {
  const { classId, levels } = req.body;
  if (!classId || !Array.isArray(levels)) {
    return res.status(400).json({ message: 'classId and levels[] are required.' });
  }
  
  try {
    // Update or create course level configuration
    const courseLevel = await prisma.courseLevel.upsert({
      where: { classId },
      update: { levels },
      create: { classId, levels },
    });

    // Create courses for each level if they don't exist
    const createdCourses: Array<{
      classLevel: string;
      level: string;
      title: string;
      id: string;
    }> = [];
    for (const level of levels) {
      try {
        const course = await findOrCreateCourse(classId, level);
        createdCourses.push({
          classLevel: course.classLevel,
          level: course.level,
          title: course.title,
          id: course.id
        });
      } catch (courseError) {
        logger.error(`Error creating course for ${classId} - ${level}:`, courseError);
        // Continue with other levels even if one fails
      }
    }
    
    res.json({ 
      message: 'Levels set successfully and courses created.', 
      classId: courseLevel.classId, 
      levels: courseLevel.levels,
      createdCourses
    });
  } catch (error) {
    logger.error('Error setting course levels: %o', error);
    res.status(500).json({ message: 'Failed to set course levels', error });
  }
};

export const updateVideo = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, url } = req.body;
    if (!id) {
        return res.status(400).json({ message: 'Video ID is required.' });
    }
    if (!title && !url) {
        return res.status(400).json({ message: 'At least one of title or url is required.' });
    }
    try {
        const data: { title?: string; iframeSnippet?: string } = {};
        if (title) data.title = title;
        if (url) data.iframeSnippet = url;
        const updated = await prisma.courseVideo.update({
            where: { id },
            data
        });
        res.status(200).json(updated);
    } catch (error) {
        console.error("Error updating video:", error);
        res.status(500).json({ message: 'Failed to update video' });
    }
};

/**
 * Deletes a specific video from a course.
 */
export const deleteVideo = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'Video ID is required.' });
    }

    try {
        // Check if video exists
        const video = await prisma.courseVideo.findUnique({
            where: { id },
            include: {
                videoProgresses: true
            }
        });

        if (!video) {
            return res.status(404).json({ message: 'Video not found.' });
        }

        // Begin a transaction to ensure all related data is deleted properly
        await prisma.$transaction(async (prismaClient) => {
            // Delete video progress records if they exist
            if (video.videoProgresses.length > 0) {
                await prismaClient.videoProgress.deleteMany({
                    where: { videoId: id }
                });
            }

            // Delete the video
            await prismaClient.courseVideo.delete({
                where: { id }
            });
        });

        res.status(200).json({
            message: 'Video deleted successfully.',
            deletedVideo: {
                id: video.id,
                title: video.title,
                courseId: video.courseId
            }
        });

    } catch (error) {
        console.error("Error deleting video:", error);
        res.status(500).json({ message: 'Internal server error while deleting video' });
    }
};

export const updateNote = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { class: classLevel, level, title, url } = req.body;
    
    if (!id) {
        return res.status(400).json({ message: 'Note ID is required.' });
    }
    if (!title && !url) {
        return res.status(400).json({ message: 'At least one of title or url is required.' });
    }
    
    try {
        // First, find the note to verify it exists
        const existingNote = await prisma.coursePDF.findUnique({
            where: { id },
            include: { course: true }
        });

        if (!existingNote) {
            return res.status(404).json({ message: 'Note not found.' });
        }

        // If class and level are provided, verify they match the note's course
        if (classLevel && level) {
            const course = await findOrCreateCourse(classLevel, level);
            if (existingNote.courseId !== course.id) {
                return res.status(400).json({ message: 'Note does not belong to the specified class and level.' });
            }
        }

        const data: { title?: string; url?: string } = {};
        if (title) data.title = title;
        if (url) data.url = url;
        
        const updated = await prisma.coursePDF.update({
            where: { id },
            data
        });
        
        res.status(200).json({
            message: 'Note updated successfully.',
            note: updated
        });
    } catch (error) {
        console.error("Error updating note:", error);
        res.status(500).json({ message: 'Failed to update note' });
    }
};

/**
 * Deletes a specific note from a course.
 */
export const deleteNote = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({ message: 'Note ID is required.' });
    }
    
    try {
        // Check if note exists
        const note = await prisma.courseNote.findUnique({
            where: { id }
        });

        if (!note) {
            return res.status(404).json({ message: 'Note not found.' });
        }

        // Delete the note
        await prisma.courseNote.delete({
            where: { id }
        });
        
        res.status(200).json({
            message: 'Note deleted successfully.',
        });
    } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * =================================================================
 *                  TOP STUDENTS MANAGEMENT
 * =================================================================
 */

export const getTopStudents = async (req: Request, res: Response) => {
    try {
        const { class: className, level, district, topCount } = req.query;

        // Validate required parameters
        if (!className || !level || !topCount) {
            return res.status(400).json({
                success: false,
                message: 'class, level, and topCount are required parameters'
            });
        }

        const limit = Math.min(parseInt(topCount as string) || 10, 100); // Max 100 students

        // Build where conditions for students
        const whereConditions: any = {
            role: 'student',
            classLevel: className as string,
            examAttempts: {
                some: {
                    score: { not: null },
                    completedAt: { not: null },
                    quiz: {
                        course: {
                            classLevel: className as string,
                            ...(level && { level: level as string })
                        }
                    }
                }
            }
        };

        // Add district filter if specified and not "all"
        if (district && district !== 'all') {
            whereConditions.districtId = district as string;
        }

        // Get students with their exam attempts and related data
        const students = await prisma.user.findMany({
            where: whereConditions,
            select: {
                id: true,
                name: true,
                mobile: true,
                email: true,
                classLevel: true,
                institution: true,
                district: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                examAttempts: {
                    where: {
                        score: { not: null },
                        completedAt: { not: null },
                        quiz: {
                            course: {
                                classLevel: className as string,
                                ...(level && { level: level as string })
                            }
                        }
                    },
                    select: {
                        id: true,
                        score: true,
                        completedAt: true,
                        quiz: {
                            select: {
                                course: {
                                    select: {
                                        level: true,
                                        classLevel: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        score: 'desc'
                    }
                }
            }
        });

        // Process and rank students
        const processedStudents = students
            .map(student => {
                if (student.examAttempts.length === 0) return null;

                // Get the highest score attempt for this specific class and level
                const highestScoreAttempt = student.examAttempts[0];
                if (!highestScoreAttempt) return null;
                
                // Calculate average score across all attempts for this class and level
                const totalScore = student.examAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
                const averageScore = totalScore / student.examAttempts.length;

                // Determine category - UG, PG, PhD, Working/Other are considered as one category
                let category = 'Other';
                if (student.institution === 'high_school' || student.institution === 'senior_secondary') {
                    category = student.classLevel || 'Other';
                } else if (student.institution === 'college' || student.institution === 'working') {
                    category = 'UG/PG/PhD/Working';
                }

                return {
                    id: student.id,
                    name: student.name,
                    phone: student.mobile,
                    email: student.email,
                    districtName: student.district?.name || 'Unknown',
                    className: student.classLevel || 'Unknown',
                    category,
                    levelName: `Level ${level}`,
                    score: highestScoreAttempt.score,
                    rank: 0, // Will be set after sorting
                    completedAt: highestScoreAttempt.completedAt,
                    totalLevelsCompleted: student.examAttempts.length,
                    averageScore: Math.round(averageScore * 10) / 10
                };
            })
            .filter(student => student !== null)
            .sort((a, b) => (b?.score || 0) - (a?.score || 0))
            .slice(0, limit)
            .map((student, index) => ({
                ...student,
                rank: index + 1
            }));

        // Calculate summary statistics
        const allScores = processedStudents.map(s => s?.score || 0);
        const summary = {
            totalStudents: processedStudents.length,
            averageScore: allScores.length > 0 ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10 : 0,
            districtsCount: new Set(processedStudents.map(s => s?.districtName)).size,
            classesCount: 1, // Since we're filtering by specific class
            topScore: allScores.length > 0 ? Math.max(...allScores) : 0,
            lowestScore: allScores.length > 0 ? Math.min(...allScores) : 0,
            filterApplied: {
                class: className,
                level: `Level ${level}`,
                district: district === 'all' ? 'All Districts' : district,
                topCount: parseInt(topCount as string)
            }
        };

        res.status(200).json({
            success: true,
            data: {
                students: processedStudents,
                summary
            }
        });

    } catch (error) {
        logger.error('Error fetching top students:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const updateQuiz = async (req: Request, res: Response) => {
    const { id } = req.params;
    // Accept numQuestions and passingMarks (passPercentage)
    const numQuestions = req.body.numQuestions ? Number(req.body.numQuestions) : undefined;
    const passPercentage = req.body.passingMarks && req.body.passingMarks !== 'undefined' ? Number(req.body.passingMarks) : undefined;
    if (!id) {
        return res.status(400).json({ message: 'Quiz ID is required.' });
    }
    if (numQuestions === undefined && passPercentage === undefined) {
        return res.status(400).json({ message: 'At least one of numQuestions or passingMarks is required.' });
    }
    try {
        const data: { numQuestions?: number; passPercentage?: number } = {};
        if (numQuestions !== undefined) data.numQuestions = numQuestions;
        if (passPercentage !== undefined) data.passPercentage = passPercentage;
        const updated = await prisma.quiz.update({
            where: { id },
            data
        });
        res.status(200).json(updated);
    } catch (error) {
        console.error("Error updating quiz:", error);
        res.status(500).json({ message: 'Failed to update quiz' });
    }
};

/**
 * Deletes quizzes for a specific class and level.
 */
export const deleteQuiz = async (req: Request, res: Response) => {
    const { class: classLevel, level } = req.query;

    if (!classLevel || !level) {
        return res.status(400).json({ message: 'Class and level are required.' });
    }

    try {
        // Find the course for the specified class and level
        const course = await prisma.course.findFirst({
            where: {
                classLevel: classLevel as string,
                ...(level && { level: level as string })
            },
            include: {
                quizzes: {
                    include: {
                        questionBank: {
                            include: {
                                questions: true
                            }
                        },
                        examAttempts: true
                    }
                }
            }
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found for the specified class and level.' });
        }

        if (course.quizzes.length === 0) {
            return res.status(404).json({ message: 'No quizzes found for the specified class and level.' });
        }

        // Begin a transaction to ensure all related data is deleted properly
        const result = await prisma.$transaction(async (prismaClient) => {
            let deletedCount = 0;

            for (const quiz of course.quizzes) {
                // Delete exam attempts related to this quiz
                if (quiz.examAttempts.length > 0) {
                    await prismaClient.examAttempt.deleteMany({
                        where: { quizId: quiz.id }
                    });
                }

                // Delete questions in the question bank
                if (quiz.questionBank.questions.length > 0) {
                    await prismaClient.question.deleteMany({
                        where: { questionBankId: quiz.questionBankId }
                    });
                }

                // Delete the quiz first (to remove foreign key constraint)
                await prismaClient.quiz.delete({
                    where: { id: quiz.id }
                });

                // Then delete the question bank
                await prismaClient.questionBank.delete({
                    where: { id: quiz.questionBankId }
                });

                deletedCount++;
            }

            return deletedCount;
        });

        res.status(200).json({
            message: `Successfully deleted ${result} quizzes for class ${classLevel}, level ${level}`,
            deletedQuizzes: result
        });

    } catch (error) {
        console.error("Error deleting quizzes:", error);
        res.status(500).json({ message: 'Internal server error while deleting quizzes' });
    }
};

/**
 * Updates the title of a course for a specific class and level.
 */
export const updateCourseTitle = async (req: Request, res: Response) => {
    const { class: classId, level: levelId, title: newTitle } = req.body;

    if (!classId || !levelId || !newTitle) {
        return res.status(400).json({ message: 'Class, level, and title are required.' });
    }

    try {
        // Find the course for the specified class and level
        const course = await prisma.course.findFirst({
            where: {
                classLevel: classId,
                level: levelId
            }
        });

        if (!course) {
            return res.status(404).json({ message: 'Course not found for the specified class and level.' });
        }

        // Update the course title
        const updatedCourse = await prisma.course.update({
            where: { id: course.id },
            data: { title: newTitle }
        });

        res.status(200).json({
            message: 'Course title updated successfully.',
            course: {
                id: updatedCourse.id,
                classLevel: updatedCourse.classLevel,
                level: updatedCourse.level,
                title: updatedCourse.title
            }
        });

    } catch (error) {
        console.error("Error updating course title:", error);
        res.status(500).json({ message: 'Internal server error while updating course title' });
    }
};

/**
 * Deletes all courses for a specific class and level, and updates course levels.
 * This is used when restructuring the curriculum.
 */
export const deleteCourseLevel = async (req: Request, res: Response) => {
    const { classLevel, level } = req.params;

    if (!classLevel || !level) {
        return res.status(400).json({ message: 'Class level and level are required.' });
    }

    try {
        // Find all courses matching the class and level
        const coursesToDelete = await prisma.course.findMany({
            where: {
                classLevel,
                level
            },
            include: {
                videos: true,
                pdfs: true,
                quizzes: true,
                studentProgress: true
            }
        });

        // Also check if there's a course level configuration to delete
        const courseLevelConfig = await prisma.courseLevel.findUnique({
            where: { classId: classLevel }
        });

        // If no courses exist and no configuration exists, return 404
        if (coursesToDelete.length === 0 && !courseLevelConfig) {
            return res.status(404).json({ message: 'No courses or course level configuration found for the specified class and level.' });
        }

        // Begin a transaction to ensure all related data is deleted properly
        const result = await prisma.$transaction(async (prismaClient) => {
            let deletedCount = 0;

            // Delete actual courses if they exist
            if (coursesToDelete.length > 0) {
                // For each course, delete related content
                for (const course of coursesToDelete) {
                    // Delete student progress records
                    if (course.studentProgress.length > 0) {
                        await prismaClient.studentProgress.deleteMany({
                            where: { courseId: course.id }
                        });
                    }

                    // Delete videos
                    if (course.videos.length > 0) {
                        await prismaClient.courseVideo.deleteMany({
                            where: { courseId: course.id }
                        });
                    }

                    // Delete PDFs
                    if (course.pdfs.length > 0) {
                        await prismaClient.coursePDF.deleteMany({
                            where: { courseId: course.id }
                        });
                    }

                    // Delete quizzes and related questions
                    if (course.quizzes.length > 0) {
                        for (const quiz of course.quizzes) {
                            // Delete exam attempts related to this quiz
                            await prismaClient.examAttempt.deleteMany({
                                where: { quizId: quiz.id }
                            });
                            
                            // Delete the quiz
                            await prismaClient.quiz.delete({
                                where: { id: quiz.id }
                            });
                        }
                    }

                    // Delete the course
                    await prismaClient.course.delete({
                        where: { id: course.id }
                    });
                }
                deletedCount = coursesToDelete.length;
            }

            // Delete course level configuration if it exists
            if (courseLevelConfig) {
                // Remove the specific level from the levels array
                const updatedLevels = courseLevelConfig.levels.filter(l => l !== level);
                
                if (updatedLevels.length === 0) {
                    // If no levels left, delete the entire course level configuration
                    await prismaClient.courseLevel.delete({
                        where: { classId: classLevel }
                    });
                } else {
                    // Update the course level configuration with remaining levels
                    await prismaClient.courseLevel.update({
                        where: { classId: classLevel },
                        data: { levels: updatedLevels }
                    });
                }
            }

            return { deletedCourses: deletedCount, configUpdated: !!courseLevelConfig };
        });

        res.status(200).json({
            message: `Successfully deleted ${result.deletedCourses} courses and updated course level configuration for class ${classLevel}, level ${level}`,
            deletedCourses: result.deletedCourses,
            configUpdated: result.configUpdated
        });

    } catch (error) {
        console.error("Error deleting course level:", error);
        res.status(500).json({ message: 'Internal server error while deleting course level' });
    }
};

// =================================================================
//                  LEVEL SCHEDULES MANAGEMENT
// =================================================================

export const getLevelSchedules = async (req: Request, res: Response) => {
    try {
        const schedules = await prisma.levelSchedule.findMany({
            orderBy: [
                { classId: 'asc' },
                { level: 'asc' }
            ]
        });

        res.status(200).json({
            success: true,
            data: schedules
        });

    } catch (error) {
        logger.error('Error fetching level schedules:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const createLevelSchedule = async (req: Request, res: Response) => {
    try {
        const { classId, level, unlockDate, unlockTime } = req.body;

        // Validate required fields
        if (!classId || !level || !unlockDate || !unlockTime) {
            return res.status(400).json({
                success: false,
                message: 'classId, level, unlockDate, and unlockTime are required'
            });
        }

        // Validate date format
        const parsedDate = new Date(unlockDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid unlockDate format. Use YYYY-MM-DD'
            });
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(unlockTime)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid unlockTime format. Use HH:MM (24-hour format)'
            });
        }

        // Create unlockDateTime by combining date and time (local time)
        const [hours, minutes] = unlockTime.split(':');
        const unlockDateTime = new Date(parsedDate);
        unlockDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Store as local time string to preserve timezone
        const localDateTimeString = unlockDateTime.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');

        // Check if schedule already exists for this class and level
        const existingSchedule = await prisma.levelSchedule.findUnique({
            where: {
                classId_level: {
                    classId: classId,
                    level: level
                }
            }
        });

        if (existingSchedule) {
            return res.status(409).json({
                success: false,
                message: `Schedule already exists for ${classId} - ${level}`
            });
        }

        // Create new schedule
        const schedule = await prisma.levelSchedule.create({
            data: {
                classId,
                level,
                unlockDate: parsedDate,
                unlockTime,
                unlockDateTime: localDateTimeString
            }
        });

        logger.info(`Created level schedule: ${classId} - ${level}`);
        res.status(201).json({
            success: true,
            data: schedule,
            message: 'Level schedule created successfully'
        });

    } catch (error) {
        logger.error('Error creating level schedule:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const updateLevelSchedule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { classId, level, unlockDate, unlockTime } = req.body;

        // Validate required fields
        if (!classId || !level || !unlockDate || !unlockTime) {
            return res.status(400).json({
                success: false,
                message: 'classId, level, unlockDate, and unlockTime are required'
            });
        }

        // Validate date format
        const parsedDate = new Date(unlockDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid unlockDate format. Use YYYY-MM-DD'
            });
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(unlockTime)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid unlockTime format. Use HH:MM (24-hour format)'
            });
        }

        // Create unlockDateTime by combining date and time (local time)
        const [hours, minutes] = unlockTime.split(':');
        const unlockDateTime = new Date(parsedDate);
        unlockDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Store as local time string to preserve timezone
        const localDateTimeString = unlockDateTime.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');

        // Check if schedule exists
        const existingSchedule = await prisma.levelSchedule.findUnique({
            where: { id }
        });

        if (!existingSchedule) {
            return res.status(404).json({
                success: false,
                message: 'Level schedule not found'
            });
        }

        // Check if another schedule exists with the same classId and level (excluding current)
        const conflictingSchedule = await prisma.levelSchedule.findFirst({
            where: {
                classId,
                level,
                id: { not: id }
            }
        });

        if (conflictingSchedule) {
            return res.status(409).json({
                success: false,
                message: `Schedule already exists for ${classId} - ${level}`
            });
        }

        // Update schedule
        const updatedSchedule = await prisma.levelSchedule.update({
            where: { id },
            data: {
                classId,
                level,
                unlockDate: parsedDate,
                unlockTime,
                unlockDateTime: localDateTimeString
            }
        });

        logger.info(`Updated level schedule: ${id}`);
        res.status(200).json({
            success: true,
            data: updatedSchedule,
            message: 'Level schedule updated successfully'
        });

    } catch (error) {
        logger.error('Error updating level schedule:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const deleteLevelSchedule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if schedule exists
        const existingSchedule = await prisma.levelSchedule.findUnique({
            where: { id }
        });

        if (!existingSchedule) {
            return res.status(404).json({
                success: false,
                message: 'Level schedule not found'
            });
        }

        // Delete schedule
        await prisma.levelSchedule.delete({
            where: { id }
        });

        logger.info(`Deleted level schedule: ${id}`);
        res.status(200).json({
            success: true,
            message: 'Level schedule deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting level schedule:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

// =================================================================
//                  QUIZ VALIDITY MANAGEMENT
// =================================================================

export const getQuizValidity = async (req: Request, res: Response) => {
    try {
        const validityPeriods = await prisma.quizValidity.findMany({
            orderBy: [
                { classId: 'asc' },
                { level: 'asc' }
            ]
        });

        res.status(200).json({
            success: true,
            data: validityPeriods
        });

    } catch (error) {
        logger.error('Error fetching quiz validity periods:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const createQuizValidity = async (req: Request, res: Response) => {
    try {
        const { classId, level, validUntilDate, validUntilTime } = req.body;

        // Validate required fields
        if (!classId || !level || !validUntilDate || !validUntilTime) {
            return res.status(400).json({
                success: false,
                message: 'classId, level, validUntilDate, and validUntilTime are required'
            });
        }

        // Validate date format
        const parsedDate = new Date(validUntilDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid validUntilDate format. Use YYYY-MM-DD'
            });
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(validUntilTime)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid validUntilTime format. Use HH:MM (24-hour format)'
            });
        }

        // Create validUntilDateTime by combining date and time (local time)
        const [hours, minutes] = validUntilTime.split(':');
        const validUntilDateTime = new Date(parsedDate);
        validUntilDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Store as local time string to preserve timezone
        const localDateTimeString = validUntilDateTime.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');

        // Check if validity period already exists for this class and level
        const existingValidity = await prisma.quizValidity.findUnique({
            where: {
                classId_level: {
                    classId: classId,
                    level: level
                }
            }
        });

        if (existingValidity) {
            return res.status(409).json({
                success: false,
                message: `Quiz validity period already exists for ${classId} - ${level}`
            });
        }

        // Create new validity period
        const validityPeriod = await prisma.quizValidity.create({
            data: {
                classId,
                level,
                validUntilDate: parsedDate,
                validUntilTime,
                validUntilDateTime: localDateTimeString
            }
        });

        logger.info(`Created quiz validity period: ${classId} - ${level}`);
        res.status(201).json({
            success: true,
            data: validityPeriod,
            message: 'Quiz validity period created successfully'
        });

    } catch (error) {
        logger.error('Error creating quiz validity period:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const updateQuizValidity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { classId, level, validUntilDate, validUntilTime } = req.body;

        // Validate required fields
        if (!classId || !level || !validUntilDate || !validUntilTime) {
            return res.status(400).json({
                success: false,
                message: 'classId, level, validUntilDate, and validUntilTime are required'
            });
        }

        // Validate date format
        const parsedDate = new Date(validUntilDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid validUntilDate format. Use YYYY-MM-DD'
            });
        }

        // Validate time format (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(validUntilTime)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid validUntilTime format. Use HH:MM (24-hour format)'
            });
        }

        // Create validUntilDateTime by combining date and time (local time)
        const [hours, minutes] = validUntilTime.split(':');
        const validUntilDateTime = new Date(parsedDate);
        validUntilDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Store as local time string to preserve timezone
        const localDateTimeString = validUntilDateTime.toLocaleString('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');

        // Check if validity period exists
        const existingValidity = await prisma.quizValidity.findUnique({
            where: { id }
        });

        if (!existingValidity) {
            return res.status(404).json({
                success: false,
                message: 'Quiz validity period not found'
            });
        }

        // Check if another validity period exists with the same classId and level (excluding current)
        const conflictingValidity = await prisma.quizValidity.findFirst({
            where: {
                classId,
                level,
                id: { not: id }
            }
        });

        if (conflictingValidity) {
            return res.status(409).json({
                success: false,
                message: `Quiz validity period already exists for ${classId} - ${level}`
            });
        }

        // Update validity period
        const updatedValidity = await prisma.quizValidity.update({
            where: { id },
            data: {
                classId,
                level,
                validUntilDate: parsedDate,
                validUntilTime,
                validUntilDateTime: localDateTimeString
            }
        });

        logger.info(`Updated quiz validity period: ${id}`);
        res.status(200).json({
            success: true,
            data: updatedValidity,
            message: 'Quiz validity period updated successfully'
        });

    } catch (error) {
        logger.error('Error updating quiz validity period:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const deleteQuizValidity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if validity period exists
        const existingValidity = await prisma.quizValidity.findUnique({
            where: { id }
        });

        if (!existingValidity) {
            return res.status(404).json({
                success: false,
                message: 'Quiz validity period not found'
            });
        }

        // Delete validity period
        await prisma.quizValidity.delete({
            where: { id }
        });

        logger.info(`Deleted quiz validity period: ${id}`);
        res.status(200).json({
            success: true,
            message: 'Quiz validity period deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting quiz validity period:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const getRandomLevelQuestions = async (req: Request, res: Response) => {
    try {
        const { classLevel, level } = req.query;

        if (!classLevel || !level) {
            return res.status(400).json({ 
                message: 'classLevel and level are required query parameters' 
            });
        }

        // Find the course for the specified classLevel and level
        const course = await prisma.course.findFirst({
            where: {
                classLevel: classLevel as string,
                ...(level && { level: level as string })
            },
            include: {
                quizzes: {
                    include: {
                        questionBank: {
                            include: {
                                questions: true
                            }
                        }
                    }
                }
            }
        });

        if (!course) {
            return res.status(404).json({ 
                message: `No course found for classLevel: ${classLevel} and level: ${level}` 
            });
        }

        // Collect all questions from all quizzes in this course
        const allQuestions = course.quizzes.flatMap(quiz => 
            quiz.questionBank.questions.map(question => ({
                id: question.id,
                question: question.question,
                optionA: question.optionA,
                optionB: question.optionB,
                optionC: question.optionC,
                optionD: question.optionD,
                correctOption: question.correctOption
            }))
        );

        if (allQuestions.length === 0) {
            return res.status(404).json({ 
                message: `No questions found for classLevel: ${classLevel} and level: ${level}` 
            });
        }

        // Shuffle the questions and take 25 (or all if less than 25)
        const shuffledQuestions = allQuestions
            .sort(() => Math.random() - 0.5)
            .slice(0, 25);

        res.status(200).json({
            success: true,
            data: {
                classLevel,
                level,
                courseId: course.id,
                courseTitle: course.title,
                totalQuestionsAvailable: allQuestions.length,
                questionsReturned: shuffledQuestions.length,
                questions: shuffledQuestions
            }
        });

    } catch (error) {
        logger.error('Error fetching random level questions:', error);
        res.status(500).json({ 
            message: 'Internal server error while fetching random questions',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// =================================================================
//                  COMPLETION MESSAGES MANAGEMENT
// =================================================================

export const getAllCompletionMessages = async (req: Request, res: Response) => {
    try {
        const completionMessages = await prisma.completionMessage.findMany({
            orderBy: [
                { classId: 'asc' },
                { levelId: 'asc' }
            ]
        });

        logger.info('Fetched all completion messages');
        res.status(200).json({
            success: true,
            data: completionMessages
        });

    } catch (error) {
        logger.error('Error fetching completion messages:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const createCompletionMessage = async (req: Request, res: Response) => {
    try {
        const { classId, levelId, message } = req.body;
        const userId = req.user?.id;

        if (!classId || !levelId || !message) {
            return res.status(400).json({
                success: false,
                message: 'classId, levelId, and message are required'
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Check if a completion message already exists for this class and level
        const existingMessage = await prisma.completionMessage.findUnique({
            where: {
                classId_levelId: {
                    classId,
                    levelId
                }
            }
        });

        if (existingMessage) {
            return res.status(409).json({
                success: false,
                message: 'A completion message already exists for this class and level'
            });
        }

        const completionMessage = await prisma.completionMessage.create({
            data: {
                classId,
                levelId,
                message,
                createdBy: userId,
                updatedBy: userId
            }
        });

        logger.info(`Created completion message for ${classId} - ${levelId}`);
        res.status(201).json({
            success: true,
            data: completionMessage
        });

    } catch (error) {
        logger.error('Error creating completion message:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const updateCompletionMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { classId, levelId, message } = req.body;
        const userId = req.user?.id;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'message is required'
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Check if the completion message exists
        const existingMessage = await prisma.completionMessage.findUnique({
            where: { id }
        });

        if (!existingMessage) {
            return res.status(404).json({
                success: false,
                message: 'Completion message not found'
            });
        }

        const updatedMessage = await prisma.completionMessage.update({
            where: { id },
            data: {
                message,
                updatedBy: userId,
                updatedAt: new Date()
            }
        });

        logger.info(`Updated completion message: ${id}`);
        res.status(200).json({
            success: true,
            data: updatedMessage
        });

    } catch (error) {
        logger.error('Error updating completion message:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const deleteCompletionMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if the completion message exists
        const existingMessage = await prisma.completionMessage.findUnique({
            where: { id }
        });

        if (!existingMessage) {
            return res.status(404).json({
                success: false,
                message: 'Completion message not found'
            });
        }

        await prisma.completionMessage.delete({
            where: { id }
        });

        logger.info(`Deleted completion message: ${id}`);
        res.status(200).json({
            success: true,
            message: 'Completion message deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting completion message:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};



export const getTopStudentsByClass = async (req: Request, res: Response) => {
    try {
        const { level, district, topCount = 10 } = req.query;
        const limit = Math.min(parseInt(topCount as string) || 10, 100);

        // Validate required parameters
        if (!level) {
            return res.status(400).json({
                success: false,
                message: 'level is required parameter'
            });
        }

        // Type assertion after validation
        const levelString = level as string;

        // Get all classes that have students for this level
        const classLevels = await prisma.user.groupBy({
            by: ['classLevel'],
            where: {
                role: 'student',
                classLevel: { not: null },
                examAttempts: {
                    some: {
                        score: { not: null },
                        completedAt: { not: null },
                        quiz: {
                            course: {
                                level: levelString
                            }
                        }
                    }
                },
                ...(district && district !== 'all' && { districtId: district as string })
            }
        });

        // Get top students for each class
        const classesWithStudents = await Promise.all(
            classLevels.map(async (classLevel) => {
                const students = await prisma.user.findMany({
                    where: {
                        role: 'student',
                        classLevel: classLevel.classLevel,
                        examAttempts: {
                            some: {
                                score: { not: null },
                                completedAt: { not: null },
                                quiz: {
                                    course: {
                                        classLevel: classLevel.classLevel,
                                        ...(levelString ? { level: levelString } : {})
                                    }
                                }
                            }
                        },
                        ...(district && district !== 'all' && { districtId: district as string })
                    },
                    select: {
                        id: true,
                        name: true,
                        mobile: true,
                        email: true,
                        classLevel: true,
                        institution: true,
                        district: {
                            select: {
                                name: true
                            }
                        },
                        examAttempts: {
                            where: {
                                score: { not: null },
                                completedAt: { not: null },
                                quiz: {
                                    course: {
                                        classLevel: classLevel.classLevel,
                                        ...(levelString ? { level: levelString } : {})
                                    }
                                }
                            },
                            select: {
                                id: true,
                                score: true,
                                completedAt: true
                            },
                            orderBy: {
                                score: 'desc'
                            }
                        }
                    }
                });

                // Process students for this class
                const processedStudents = students
                    .map(student => {
                        const examAttempts = (student as any).examAttempts || [];
                        if (examAttempts.length === 0) return null;

                        const highestScoreAttempt = examAttempts[0];
                        if (!highestScoreAttempt) return null;
                        
                        const totalScore = examAttempts.reduce((sum: number, attempt: any) => sum + (attempt.score || 0), 0);
                        const averageScore = totalScore / examAttempts.length;

                        // Determine category
                        let category = 'Other';
                        if (student.institution === 'high_school' || student.institution === 'senior_secondary') {
                            category = student.classLevel || 'Other';
                        } else if (student.institution === 'college' || student.institution === 'working') {
                            category = 'UG/PG/PhD/Working';
                        }

                        return {
                            id: student.id,
                            name: student.name,
                            phone: student.mobile,
                            email: student.email,
                            districtName: (student as any).district?.name || 'Unknown',
                            className: student.classLevel || 'Unknown',
                            category,
                            levelName: `Level ${levelString}`,
                            score: highestScoreAttempt.score,
                            rank: 0, // Will be set after sorting
                            completedAt: highestScoreAttempt.completedAt,
                            totalLevelsCompleted: examAttempts.length,
                            averageScore: Math.round(averageScore * 10) / 10
                        };
                    })
                    .filter(student => student !== null)
                    .sort((a, b) => (b?.score || 0) - (a?.score || 0))
                    .slice(0, limit)
                    .map((student, index) => ({
                        ...student,
                        rank: index + 1
                    }));

                // Calculate class summary
                const classScores = processedStudents.map(s => s?.score || 0);
                const summary = {
                    totalStudents: processedStudents.length,
                    averageScore: classScores.length > 0 ? Math.round((classScores.reduce((a, b) => a + b, 0) / classScores.length) * 10) / 10 : 0,
                    topScore: classScores.length > 0 ? Math.max(...classScores) : 0,
                    lowestScore: classScores.length > 0 ? Math.min(...classScores) : 0
                };

                return {
                    className: classLevel.classLevel,
                    students: processedStudents,
                    summary
                };
            })
        );

        // Calculate overall summary
        const allStudents = classesWithStudents.flatMap(c => c.students);
        const allScores = allStudents.map(s => s?.score || 0);
        const overallSummary = {
            totalClasses: classesWithStudents.length,
            totalStudents: allStudents.length,
            overallAverageScore: allScores.length > 0 ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10 : 0,
            filterApplied: {
                level: `Level ${levelString}`,
                district: district === 'all' ? 'All Districts' : district,
                topCount: parseInt(topCount as string)
            }
        };

        res.status(200).json({
            success: true,
            data: {
                classes: classesWithStudents,
                summary: overallSummary
            }
        });

    } catch (error) {
        logger.error('Error fetching top students by class:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getCourses = async (req: Request, res: Response) => {
    try {
        const courses = await prisma.course.findMany({
            select: {
                id: true,
                level: true,
                title: true,
                description: true,
                classLevel: true,
                isPublished: true,
                createdAt: true,
                _count: {
                    select: {
                        studentProgress: {
                            where: {
                                status: 'completed'
                            }
                        }
                    }
                }
            },
            orderBy: [
                { classLevel: 'asc' },
                { level: 'asc' }
            ]
        });

        // Group courses by class level
        const coursesByClassLevel = courses.reduce((acc, course) => {
            const classLevel = course.classLevel;
            
            if (!acc[classLevel]) {
                acc[classLevel] = [];
            }
            
            acc[classLevel].push(course);
            return acc;
        }, {} as Record<string, typeof courses>);

        // Process each class level
        const classLevelsWithStats = await Promise.all(
            Object.entries(coursesByClassLevel).map(async ([classLevel, classCourses]) => {
                // Calculate stats for this class level
                let totalStudents = 0;
                let totalScore = 0;
                let totalAttempts = 0;

                for (const course of classCourses) {
                    const examAttempts = await prisma.examAttempt.findMany({
                        where: {
                            quiz: {
                                courseId: course.id
                            },
                            score: { not: null }
                        },
                        select: {
                            score: true
                        }
                    });

                    totalStudents += course._count.studentProgress;
                    totalAttempts += examAttempts.length;
                    totalScore += examAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
                }

                const averageScore = totalAttempts > 0 
                    ? Math.round((totalScore / totalAttempts) * 10) / 10 
                    : 0;

                // Determine if this class level should be categorized as "UG/PG/PhD/Working"
                const isHigherEducation = ['ug', 'pg', 'phd', 'working', 'other'].includes(classLevel.toLowerCase());
                
                return {
                    id: classLevel,
                    name: isHigherEducation ? 'UG/PG/PhD/Working' : classLevel,
                    description: isHigherEducation 
                        ? 'Higher Education and Working Professionals' 
                        : `${classLevel} Class Level`,
                    orderIndex: isHigherEducation ? 999 : parseInt(classLevel.replace(/\D/g, '')) || 0,
                    isActive: classCourses.some(course => course.isPublished),
                    studentCount: totalStudents,
                    averageScore,
                    courseCount: classCourses.length
                };
            })
        );

        // Sort by orderIndex
        classLevelsWithStats.sort((a, b) => a.orderIndex - b.orderIndex);

        res.status(200).json({
            success: true,
            data: classLevelsWithStats
        });

    } catch (error) {
        logger.error('Error fetching courses:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getTopStudentsAnalytics = async (req: Request, res: Response) => {
    try {
        const { districtId, courseLevel, timeRange = 'month' } = req.query;

        // Build where conditions for exam attempts
        const attemptWhereConditions: any = {
            score: { not: null },
            completedAt: { not: null }
        };

        if (courseLevel) {
            attemptWhereConditions.quiz = {
                course: {
                    level: courseLevel as string
                }
            };
        }

        // Add time range filter
        const now = new Date();
        let startDate: Date;
        switch (timeRange) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'quarter':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        attemptWhereConditions.completedAt = { gte: startDate };

        // Get all exam attempts with student and district info
        const examAttempts = await prisma.examAttempt.findMany({
            where: attemptWhereConditions,
            select: {
                score: true,
                completedAt: true,
                student: {
                    select: {
                        id: true,
                        institution: true,
                        classLevel: true,
                        district: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                quiz: {
                    select: {
                        course: {
                            select: {
                                level: true,
                                classLevel: true
                            }
                        }
                    }
                }
            }
        });

        // Filter by district if specified
        const filteredAttempts = districtId 
            ? examAttempts.filter(attempt => attempt.student.district?.name === districtId)
            : examAttempts;

        // Calculate score distribution
        const scoreDistribution = {
            '90-100': 0,
            '80-89': 0,
            '70-79': 0,
            '60-69': 0,
            '50-59': 0
        };

        filteredAttempts.forEach(attempt => {
            const score = attempt.score || 0;
            if (score >= 90) scoreDistribution['90-100']++;
            else if (score >= 80) scoreDistribution['80-89']++;
            else if (score >= 70) scoreDistribution['70-79']++;
            else if (score >= 60) scoreDistribution['60-69']++;
            else if (score >= 50) scoreDistribution['50-59']++;
        });

        // Calculate category breakdown
        const categoryBreakdown: Record<string, number> = {};
        filteredAttempts.forEach(attempt => {
            let category = 'Other';
            if (attempt.student.institution === 'high_school' || attempt.student.institution === 'senior_secondary') {
                category = attempt.student.classLevel || 'Other';
            } else if (attempt.student.institution === 'college' || attempt.student.institution === 'working') {
                category = 'UG/PG/PhD/Working';
            }
            
            categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
        });

        // Calculate district performance
        const districtStats = new Map<string, { scores: number[], count: number }>();
        filteredAttempts.forEach(attempt => {
            const districtName = attempt.student.district?.name || 'Unknown';
            if (!districtStats.has(districtName)) {
                districtStats.set(districtName, { scores: [], count: 0 });
            }
            const stats = districtStats.get(districtName)!;
            stats.scores.push(attempt.score || 0);
            stats.count++;
        });

        const districtPerformance = Array.from(districtStats.entries()).map(([districtName, stats]) => ({
            districtName,
            averageScore: Math.round((stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) * 10) / 10,
            topStudentsCount: stats.count
        }));

        // Calculate class performance
        const classStats = new Map<string, { scores: number[], count: number }>();
        filteredAttempts.forEach(attempt => {
            const className = attempt.student.classLevel || 'Unknown';
            if (!classStats.has(className)) {
                classStats.set(className, { scores: [], count: 0 });
            }
            const stats = classStats.get(className)!;
            stats.scores.push(attempt.score || 0);
            stats.count++;
        });

        const classPerformance = Array.from(classStats.entries()).map(([className, stats]) => ({
            className,
            averageScore: Math.round((stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) * 10) / 10,
            topStudentsCount: stats.count
        }));

        // Calculate weekly trends (simplified - last 4 weeks)
        const trends = {
            weekly: [] as Array<{ week: string; averageScore: number; topStudentsCount: number }>
        };

        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
            const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            const weekAttempts = filteredAttempts.filter(attempt => 
                attempt.completedAt && attempt.completedAt >= weekStart && attempt.completedAt < weekEnd
            );

            const weekScores = weekAttempts.map(attempt => attempt.score || 0);
            const averageScore = weekScores.length > 0 
                ? Math.round((weekScores.reduce((a, b) => a + b, 0) / weekScores.length) * 10) / 10 
                : 0;

            trends.weekly.push({
                week: `Week ${4 - i}`,
                averageScore,
                topStudentsCount: weekAttempts.length
            });
        }

        res.status(200).json({
            success: true,
            data: {
                scoreDistribution,
                categoryBreakdown,
                districtPerformance,
                classPerformance,
                trends
            }
        });

    } catch (error) {
        logger.error('Error fetching top students analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getLevelsByClass = async (req: Request, res: Response) => {
    try {
        const { class: className } = req.query;

        // Validate required parameters
        if (!className) {
            return res.status(400).json({
                success: false,
                message: 'class parameter is required'
            });
        }

        // Handle the special case for UG/PG/PhD/Working
        let classFilter: string | string[];
        if (className === 'UG/PG/PhD/Working') {
            classFilter = ['UG', 'PG', 'PhD', 'Working', 'Other'];
        } else {
            // Try different variations of the class name
            const classVariations = [
                className as string,
                (className as string).toUpperCase(),
                (className as string).toLowerCase(),
                (className as string).charAt(0).toUpperCase() + (className as string).slice(1).toLowerCase()
            ];
            classFilter = classVariations;
        }

        // First, let's check what classes are available in the database
        const availableClasses = await prisma.course.groupBy({
            by: ['classLevel'],
            _count: {
                classLevel: true
            }
        });

        logger.info(`Available classes in database: ${JSON.stringify(availableClasses)}`);
        logger.info(`Requested class: ${className}`);
        logger.info(`Class filter: ${JSON.stringify(classFilter)}`);

        // Get courses for the specified class(es)
        const courses = await prisma.course.findMany({
            where: {
                classLevel: {
                    in: Array.isArray(classFilter) ? classFilter : [classFilter]
                }
            },
            select: {
                id: true,
                level: true,
                title: true,
                description: true,
                classLevel: true,
                isPublished: true,
                createdAt: true,
                _count: {
                    select: {
                        studentProgress: {
                            where: {
                                status: 'completed'
                            }
                        }
                    }
                }
            },
            orderBy: {
                level: 'asc'
            }
        });

        logger.info(`Found ${courses.length} courses for class ${className}`);

        // Calculate stats for each level
        const levelsWithStats = await Promise.all(
            courses.map(async (course) => {
                const examAttempts = await prisma.examAttempt.findMany({
                    where: {
                        quiz: {
                            courseId: course.id
                        },
                        score: { not: null }
                    },
                    select: {
                        score: true
                    }
                });

                const averageScore = examAttempts.length > 0
                    ? Math.round((examAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / examAttempts.length) * 10) / 10
                    : 0;

                return {
                    id: parseInt((course.level || '').replace(/\D/g, '')) || 0,
                    name: `Level ${course.level || 'Unknown'}`,
                    description: course.title || `Level ${course.level || 'Unknown'} for ${course.classLevel || 'Unknown'}`,
                    orderIndex: parseInt((course.level || '').replace(/\D/g, '')) || 0,
                    isActive: course.isPublished,
                    studentCount: course._count.studentProgress,
                    averageScore
                };
            })
        );

        // Sort by orderIndex
        levelsWithStats.sort((a, b) => a.orderIndex - b.orderIndex);

        logger.info(`Returning ${levelsWithStats.length} levels for class ${className}`);

        res.status(200).json({
            success: true,
            data: levelsWithStats
        });

    } catch (error) {
        logger.error('Error fetching levels by class:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

