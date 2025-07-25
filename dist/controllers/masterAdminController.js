"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateQuiz = exports.updateNote = exports.updateVideo = exports.setCourseLevels = exports.getCourseLevels = exports.getPassingMarks = exports.setPassingMarks = exports.getAllCourses = exports.addQuiz = exports.addNote = exports.addVideo = exports.getAnalyticsData = exports.sendGlobalNotification = exports.updateEvent = exports.getAllEvents = exports.createGlobalEvent = exports.deleteDistrictAdmin = exports.updateDistrictAdmin = exports.createDistrictAdmin = exports.getDistrictAdmins = exports.getAllStudents = exports.getDistrictPerformance = exports.getDashboardStats = void 0;
const client_1 = require("../prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const xlsx = __importStar(require("xlsx"));
const logger_1 = __importDefault(require("../utils/logger"));
// Static education options (these don't change)
const educationOptions = [
    { label: 'High School', value: 'high_school', classes: ['6th', '7th', '8th'] },
    { label: 'Senior Secondary', value: 'senior_secondary', classes: ['9th', '10th', '11th', '12th'] },
    { label: 'College', value: 'college', classes: ['UG', 'PG', 'PhD', 'Working', 'Others'] },
];
const getDashboardStats = async (req, res) => {
    try {
        const totalStudentsPromise = client_1.prisma.user.count({ where: { role: 'student' } });
        const totalDistrictsPromise = client_1.prisma.district.count();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeStudentsPromise = client_1.prisma.user.count({
            where: {
                role: 'student',
                lastActiveAt: { gte: oneDayAgo },
            },
        });
        const totalCourseCountPromise = client_1.prisma.course.count();
        const avgScorePromise = client_1.prisma.examAttempt.aggregate({
            _avg: { score: true },
        });
        const [totalStudents, totalDistricts, activeStudents, totalCourseCount, avgScoreResult,] = await Promise.all([
            totalStudentsPromise,
            totalDistrictsPromise,
            activeStudentsPromise,
            totalCourseCountPromise,
            avgScorePromise,
        ]);
        let courseCompleted = 0;
        if (totalCourseCount > 0) {
            const studentsWhoCompletedAll = await client_1.prisma.studentProgress.groupBy({
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
    }
    catch (error) {
        console.error("Error fetching master admin dashboard stats:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getDistrictPerformance = async (req, res) => {
    try {
        const totalCourseCount = await client_1.prisma.course.count();
        // 1. Get all districts with their students and exam attempts
        const districts = await client_1.prisma.district.findMany({
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
                        },
                    },
                },
            },
        });
        // 2. Process the data for each district
        const performanceData = districts.map(district => {
            const studentCount = district.users.length;
            if (studentCount === 0) {
                return {
                    id: district.id,
                    name: district.name,
                    studentCount: 0,
                    completionPercentage: 0,
                    avgScore: 0,
                    completedCount: 0,
                };
            }
            let totalScore = 0;
            let attemptCount = 0;
            let completedCount = 0;
            district.users.forEach(student => {
                // Calculate avg score
                const studentTotalScore = student.examAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
                totalScore += studentTotalScore;
                attemptCount += student.examAttempts.length;
                // Check for full course completion
                if (totalCourseCount > 0 && student.studentProgress.length === totalCourseCount) {
                    completedCount++;
                }
            });
            const avgScore = attemptCount > 0 ? Math.round(totalScore / attemptCount) : 0;
            const completionPercentage = (completedCount / studentCount) * 100;
            return {
                id: district.id,
                name: district.name,
                studentCount,
                completionPercentage: Math.round(completionPercentage),
                avgScore,
                completedCount,
            };
        });
        // Sort by name for consistent order
        performanceData.sort((a, b) => a.name.localeCompare(b.name));
        res.status(200).json(performanceData);
    }
    catch (error) {
        console.error("Error fetching district performance:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getDistrictPerformance = getDistrictPerformance;
/**
 * Retrieves a paginated and searchable list of all students across all districts.
 * Supports filtering by district, level, and a general search for name/school.
 */
const getAllStudents = async (req, res) => {
    const { search, level, districtId, page = '1', pageSize = '10' } = req.query;
    const pageNum = parseInt(page, 10);
    const size = parseInt(pageSize, 10);
    try {
        const where = {
            role: 'student',
        };
        // Add district filter if provided
        if (districtId) {
            where.districtId = districtId;
        }
        // Handle the dedicated level filter
        if (level) {
            where.studentProgress = {
                some: {
                    course: { level: level },
                },
            };
        }
        // Handle the free-text search for name or school
        if (search) {
            const searchString = search;
            where.OR = [
                { name: { contains: searchString, mode: 'insensitive' } },
                { school: { contains: searchString, mode: 'insensitive' } },
            ];
        }
        const students = await client_1.prisma.user.findMany({
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
        const totalStudents = await client_1.prisma.user.count({ where });
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
    }
    catch (error) {
        console.error("Error fetching all students:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllStudents = getAllStudents;
/**
 * Fetches a list of all district admins with their associated data.
 */
const getDistrictAdmins = async (req, res) => {
    try {
        const admins = await client_1.prisma.user.findMany({
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
    }
    catch (error) {
        console.error("Error fetching district admins:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getDistrictAdmins = getDistrictAdmins;
/**
 * Creates a new district admin user.
 */
const createDistrictAdmin = async (req, res) => {
    const { name, email, password, districtId } = req.body;
    if (!name || !email || !password || !districtId) {
        return res.status(400).json({ message: 'Name, email, password, and district are required.' });
    }
    try {
        // Check if an admin with this email already exists
        const existingUser = await client_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'An admin with this email already exists.' });
        }
        // Check if the district exists and is not already assigned
        const district = await client_1.prisma.district.findUnique({
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
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const newAdmin = await client_1.prisma.user.create({
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
    }
    catch (error) {
        console.error("Error creating district admin:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createDistrictAdmin = createDistrictAdmin;
/**
 * Updates an existing district admin user.
 */
const updateDistrictAdmin = async (req, res) => {
    const { id } = req.params;
    const { name, email, districtId } = req.body;
    if (!id) {
        return res.status(400).json({ message: 'Admin ID is required.' });
    }
    try {
        // Check if the admin exists and is a district admin
        const existingAdmin = await client_1.prisma.user.findUnique({
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
            const emailExists = await client_1.prisma.user.findUnique({ where: { email } });
            if (emailExists) {
                return res.status(409).json({ message: 'An admin with this email already exists.' });
            }
        }
        // Check if district is being changed and if it's already assigned
        if (districtId && districtId !== existingAdmin.districtId) {
            const district = await client_1.prisma.district.findUnique({
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
        const updateData = {};
        if (name)
            updateData.name = name;
        if (email)
            updateData.email = email;
        if (districtId)
            updateData.districtId = districtId;
        // Update the admin
        const updatedAdmin = await client_1.prisma.user.update({
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
    }
    catch (error) {
        console.error("Error updating district admin:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateDistrictAdmin = updateDistrictAdmin;
/**
 * Deletes a district admin user.
 */
const deleteDistrictAdmin = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'Admin ID is required.' });
    }
    try {
        // Check if the admin exists and is a district admin
        const existingAdmin = await client_1.prisma.user.findUnique({
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
        const hasEvents = await client_1.prisma.event.findFirst({
            where: { creatorId: id }
        });
        const hasNotifications = await client_1.prisma.notification.findFirst({
            where: { senderId: id }
        });
        if (hasEvents || hasNotifications) {
            return res.status(400).json({
                message: 'Cannot delete district admin. They have created events or notifications that must be handled first.'
            });
        }
        // Delete the admin
        await client_1.prisma.user.delete({
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
    }
    catch (error) {
        console.error("Error deleting district admin:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteDistrictAdmin = deleteDistrictAdmin;
/**
 * Creates a new global event.
 */
const createGlobalEvent = async (req, res) => {
    const { title, type, description, location, date, time } = req.body;
    const adminUser = req.user;
    if (!adminUser) {
        return res.status(403).json({ message: 'Authentication error: User not found.' });
    }
    if (!title || !type || !description || !location || !date || !time) {
        return res.status(400).json({ message: 'All event fields are required.' });
    }
    try {
        const eventDateTime = new Date(`${date}T${time}`);
        if (isNaN(eventDateTime.getTime())) {
            return res.status(400).json({ message: 'Invalid date or time format provided.' });
        }
        const newEvent = await client_1.prisma.event.create({
            data: {
                title,
                type,
                description,
                location,
                date: eventDateTime,
                creatorId: adminUser.id,
                // districtId is omitted to mark it as a global event
            },
        });
        res.status(201).json(newEvent);
    }
    catch (error) {
        console.error("Error creating global event:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createGlobalEvent = createGlobalEvent;
/**
 * Fetches all global and district-specific events for the master admin view.
 */
const getAllEvents = async (req, res) => {
    try {
        const events = await client_1.prisma.event.findMany({
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
            }
            else {
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
                ...districtInfo,
            };
        });
        res.status(200).json(formattedEvents);
    }
    catch (error) {
        console.error("Error fetching all events:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllEvents = getAllEvents;
/**
 * Updates an existing event. Can be used by a master admin for any event.
 */
const updateEvent = async (req, res) => {
    const { id } = req.params;
    const { title, type, description, location, date, time } = req.body;
    if (!id) {
        return res.status(400).json({ message: 'Event ID is required in the URL.' });
    }
    try {
        const eventId = parseInt(id, 10);
        if (isNaN(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID.' });
        }
        // Ensure the event exists before trying to update
        const existingEvent = await client_1.prisma.event.findUnique({ where: { id: eventId } });
        if (!existingEvent) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        const dataToUpdate = {};
        if (title)
            dataToUpdate.title = title;
        if (type)
            dataToUpdate.type = type;
        if (description)
            dataToUpdate.description = description;
        if (location)
            dataToUpdate.location = location;
        if (date && time) {
            const eventDateTime = new Date(`${date}T${time}`);
            if (isNaN(eventDateTime.getTime())) {
                return res.status(400).json({ message: 'Invalid date or time format.' });
            }
            dataToUpdate.date = eventDateTime;
        }
        const updatedEvent = await client_1.prisma.event.update({
            where: { id: eventId },
            data: dataToUpdate,
        });
        res.status(200).json(updatedEvent);
    }
    catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateEvent = updateEvent;
/**
 * Sends a notification to a targeted group of students across the entire system.
 */
const sendGlobalNotification = async (req, res) => {
    const { targetType, targetValue, message, title } = req.body;
    const adminUser = req.user;
    if (!message || !title) {
        return res.status(400).json({ message: 'Title and message are required.' });
    }
    try {
        let studentIds = [];
        const where = { role: 'student' };
        switch (targetType) {
            case 'ALL_STUDENTS':
                // No additional filter needed
                break;
            case 'BY_LEVEL':
                if (!targetValue)
                    return res.status(400).json({ message: 'Level value is required for this target type.' });
                where.studentProgress = { some: { course: { level: targetValue } } };
                break;
            case 'BY_DISTRICT':
                if (!targetValue)
                    return res.status(400).json({ message: 'District ID is required for this target type.' });
                where.districtId = targetValue;
                break;
            case 'COMPLETED_ALL_COURSES': {
                const totalCourseCount = await client_1.prisma.course.count();
                if (totalCourseCount > 0) {
                    const completedStudents = await client_1.prisma.studentProgress.groupBy({
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
        }
        else if (studentIds.length > 0) {
            where.id = { in: studentIds };
        }
        const targetStudents = await client_1.prisma.user.findMany({
            where,
            select: { id: true },
        });
        if (targetStudents.length === 0) {
            return res.status(404).json({ message: 'No students found matching the target criteria.' });
        }
        const newNotification = await client_1.prisma.notification.create({
            data: {
                title,
                content: message,
                type: 'admin_announcement',
                senderId: adminUser.id,
            }
        });
        const recipientData = targetStudents.map(student => ({
            notificationId: newNotification.id,
            userId: student.id,
        }));
        await client_1.prisma.notificationRecipient.createMany({
            data: recipientData,
        });
        res.status(201).json({ message: `Notification sent to ${targetStudents.length} students successfully.` });
    }
    catch (error) {
        console.error("Error sending global notification:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.sendGlobalNotification = sendGlobalNotification;
/**
 * Retrieves aggregated analytics data for the master admin dashboard.
 * Includes statewide progress, engagement metrics, and district performance.
 */
const getAnalyticsData = async (req, res) => {
    try {
        // --- Concurrent Data Fetching ---
        const totalStudentsPromise = client_1.prisma.user.count({ where: { role: 'student' } });
        const coursesPromise = client_1.prisma.course.findMany({ orderBy: { level: 'asc' } });
        const distinctCompletedProgressPromise = client_1.prisma.studentProgress.findMany({
            where: { status: 'completed', qualified: true },
            select: { courseId: true, studentId: true },
            distinct: ['courseId', 'studentId'],
        });
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeStudentsPromise = client_1.prisma.user.count({
            where: { role: 'student', lastActiveAt: { gte: oneDayAgo } },
        });
        const startedCourseStudentsPromise = client_1.prisma.studentProgress.groupBy({
            by: ['studentId'],
        });
        const avgScorePromise = client_1.prisma.examAttempt.aggregate({
            _avg: { score: true },
        });
        const totalCourseCountPromise = client_1.prisma.course.count();
        const districtsPromise = client_1.prisma.district.findMany({
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
        const [totalStudents, courses, distinctCompletedProgress, activeStudents, startedCourseStudents, avgScoreResult, totalCourseCount, districts,] = await Promise.all([
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
        }, {});
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
            const studentsWhoCompletedAll = await client_1.prisma.studentProgress.groupBy({
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
            if (b.completion !== a.completion)
                return b.completion - a.completion;
            return b.avgScore - a.avgScore;
        });
        res.status(200).json({
            statewideProgress,
            engagementMetrics,
            districtPerformance,
        });
    }
    catch (error) {
        console.error("Error fetching master admin analytics data:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAnalyticsData = getAnalyticsData;
/**
 * Ensures a course exists for a given class and level, creating it if it doesn't.
 */
const findOrCreateCourse = async (classLevel, level) => {
    if (!level || typeof level !== 'string') {
        throw new Error('Level must be a non-empty string');
    }
    const course = await client_1.prisma.course.findFirst({
        where: { classLevel, level: level },
    });
    if (course) {
        return course;
    }
    return client_1.prisma.course.create({
        data: {
            classLevel,
            level: level,
            title: `Class ${classLevel} - Level ${level}`,
            description: `Course materials for Class ${classLevel}, Level ${level}.`,
        },
    });
};
/**
 * Adds a video to a course.
 */
const addVideo = async (req, res) => {
    const { class: classLevel, level, title, iframeSnippet } = req.body;
    if (!classLevel || !level || !title || !iframeSnippet) {
        return res.status(400).json({ message: 'Class, level, title, and iframeSnippet are required.' });
    }
    try {
        const course = await findOrCreateCourse(classLevel, level);
        const newVideo = await client_1.prisma.courseVideo.create({
            data: {
                courseId: course.id,
                title,
                iframeSnippet,
            },
        });
        res.status(201).json(newVideo);
    }
    catch (error) {
        console.error("Error adding video:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.addVideo = addVideo;
/**
 * Adds a PDF note to a course by uploading it to AWS S3.
 */
const addNote = async (req, res) => {
    const { class: classLevel, level, title, url } = req.body;
    if (!classLevel || !level || !title || !url) {
        return res.status(400).json({ message: 'Class, level, title, and url are required.' });
    }
    try {
        const course = await findOrCreateCourse(classLevel, level);
        const newNote = await client_1.prisma.coursePDF.create({
            data: {
                courseId: course.id,
                title,
                url,
            },
        });
        res.status(201).json(newNote);
    }
    catch (error) {
        console.error("Error adding note:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.addNote = addNote;
/**
 * Creates a quiz by parsing an uploaded Excel file.
 */
const addQuiz = async (req, res) => {
    const { class: classLevel, level } = req.body;
    const file = req.file;
    if (!classLevel || !level || !file) {
        return res.status(400).json({ message: 'Class, level, and a file are required.' });
    }
    try {
        const course = await findOrCreateCourse(classLevel, level);
        // --- Robust Excel Parsing Logic ---
        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return res.status(400).json({ message: 'Excel file contains no sheets.' });
        }
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            return res.status(400).json({ message: `Sheet '${sheetName}' not found in the Excel file.` });
        }
        const quizData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        if (quizData.length < 1) {
            return res.status(400).json({ message: 'Excel file must contain at least one question.' });
        }
        const questionsToCreate = [];
        // Start from 0 to process all rows, assuming no header
        for (let i = 0; i < quizData.length; i++) {
            const row = quizData[i];
            if (!row || row.length < 6 || row.slice(0, 6).some(cell => cell === null || cell === undefined)) {
                // Skip incomplete or empty rows
                continue;
            }
            const [q, oA, oB, oC, oD, cO] = row;
            const question = String(q).trim();
            const optionA = String(oA).trim();
            const optionB = String(oB).trim();
            const optionC = String(oC).trim();
            const optionD = String(oD).trim();
            const correctOption = String(cO).trim();
            if (!question || !optionA || !optionB || !optionC || !optionD || !correctOption) {
                // Skip rows where essential data is empty after trimming
                continue;
            }
            questionsToCreate.push({ question, optionA, optionB, optionC, optionD, correctOption });
        }
        if (questionsToCreate.length === 0) {
            return res.status(400).json({ message: 'No valid questions could be parsed from the file. Please check the format.' });
        }
        // --- End of Parsing Logic ---
        const newQuiz = await client_1.prisma.$transaction(async (tx) => {
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
            message: `Quiz with ${questionsToCreate.length} questions created successfully.`,
            quiz: newQuiz,
        });
    }
    catch (error) {
        console.error("Error adding quiz:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.addQuiz = addQuiz;
/**
 * Retrieves a list of all courses, with optional filtering by class and level.
 * Includes counts of associated videos, notes, and quizzes for each course.
 */
const getAllCourses = async (req, res) => {
    const { classLevel, level } = req.query;
    const where = {};
    if (classLevel) {
        where.classLevel = classLevel;
    }
    if (level) {
        where.level = level;
    }
    try {
        const courses = await client_1.prisma.course.findMany({
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
        // Group by classLevel and level (treat every classLevel as separate, including 9th-12th)
        const grouped = {};
        for (const course of courses) {
            // Defensive: skip if classLevel or level is missing
            if (!course.classLevel || !course.level)
                continue;
            // Treat every classLevel as its own group, including 9th, 10th, 11th, 12th
            const classKey = course.classLevel;
            const classGroup = grouped[classKey] ?? (grouped[classKey] = {});
            classGroup[course.level] = {
                id: course.id,
                title: course.title,
                description: course.description,
                isPublished: course.isPublished,
                createdAt: course.createdAt,
                videos: course.videos.map(v => ({
                    id: v.id,
                    title: v.title,
                    youtubeId: v.youtubeId,
                    thumbnail: v.thumbnail,
                    iframeSnippet: v.iframeSnippet // fallback for type error
                })),
                pdfs: course.pdfs.map(p => ({
                    id: p.id,
                    title: p.title,
                    url: p.url
                })),
                quizzes: course.quizzes.map(q => ({
                    id: q.id,
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
    }
    catch (error) {
        console.error("Error fetching all courses:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllCourses = getAllCourses;
// Passing Marks Endpoints
const setPassingMarks = async (req, res) => {
    const data = req.body; // expects { "6": { "level1": 80, ... }, ... }
    if (!data || typeof data !== 'object') {
        return res.status(400).json({ message: 'Invalid payload format.' });
    }
    try {
        const upserts = [];
        for (const classIdRaw in data) {
            const classId = String(classIdRaw);
            if (!data[classIdRaw] || typeof data[classIdRaw] !== 'object')
                continue;
            for (const levelIdRaw of Object.keys(data[classIdRaw])) {
                const levelId = String(levelIdRaw);
                const passingMarks = data[classIdRaw][levelIdRaw];
                upserts.push(client_1.prisma.passingMark.upsert({
                    where: { classId_levelId: { classId, levelId } },
                    update: { passingMarks },
                    create: { classId, levelId, passingMarks }
                }));
            }
        }
        await Promise.all(upserts);
        res.status(200).json({ message: 'Passing marks saved.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to save passing marks', error });
    }
};
exports.setPassingMarks = setPassingMarks;
const getPassingMarks = async (req, res) => {
    const { classId, levelId } = req.query;
    try {
        let where = {};
        if (classId)
            where.classId = String(classId);
        if (levelId)
            where.levelId = String(levelId);
        const passingMarks = await client_1.prisma.passingMark.findMany({ where });
        // Transform to { classId: { levelId: passingMarks, ... }, ... }
        const result = {};
        for (const mark of passingMarks) {
            if (!result[mark.classId])
                result[mark.classId] = {};
            result[mark.classId][mark.levelId] = mark.passingMarks;
        }
        res.status(200).json(result);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch passing marks', error });
    }
};
exports.getPassingMarks = getPassingMarks;
const getCourseLevels = async (req, res) => {
    try {
        // Fetch course levels from database
        const courseLevels = await client_1.prisma.courseLevel.findMany();
        // Transform database data to the expected format
        const classLevels = courseLevels.reduce((acc, cl) => {
            acc[cl.classId] = cl.levels;
            return acc;
        }, {});
        // Get unique class levels from existing courses
        const existingCourses = await client_1.prisma.course.findMany({
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
    }
    catch (error) {
        logger_1.default.error('Error fetching course levels: %o', error);
        res.status(500).json({ message: 'Failed to fetch course levels', error });
    }
};
exports.getCourseLevels = getCourseLevels;
const setCourseLevels = async (req, res) => {
    const { classId, levels } = req.body;
    if (!classId || !Array.isArray(levels)) {
        return res.status(400).json({ message: 'classId and levels[] are required.' });
    }
    try {
        const courseLevel = await client_1.prisma.courseLevel.upsert({
            where: { classId },
            update: { levels },
            create: { classId, levels },
        });
        res.json({
            message: 'Levels set successfully.',
            classId: courseLevel.classId,
            levels: courseLevel.levels
        });
    }
    catch (error) {
        logger_1.default.error('Error setting course levels: %o', error);
        res.status(500).json({ message: 'Failed to set course levels', error });
    }
};
exports.setCourseLevels = setCourseLevels;
const updateVideo = async (req, res) => {
    const { id } = req.params;
    const { title, url } = req.body;
    if (!id) {
        return res.status(400).json({ message: 'Video ID is required.' });
    }
    if (!title && !url) {
        return res.status(400).json({ message: 'At least one of title or url is required.' });
    }
    try {
        const data = {};
        if (title)
            data.title = title;
        if (url)
            data.iframeSnippet = url;
        const updated = await client_1.prisma.courseVideo.update({
            where: { id },
            data
        });
        res.status(200).json(updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update video', error });
    }
};
exports.updateVideo = updateVideo;
const updateNote = async (req, res) => {
    const { id } = req.params;
    // Accept title and url (from file upload or direct url)
    const title = req.body.title;
    let url = req.body.url;
    // If a file is uploaded, use its location (assuming upload middleware sets req.file)
    if (req.file && req.file.location) {
        url = req.file.location;
    }
    if (!id) {
        return res.status(400).json({ message: 'Note ID is required.' });
    }
    if (!title && !url) {
        return res.status(400).json({ message: 'At least one of title or url is required.' });
    }
    try {
        const data = {};
        if (title)
            data.title = title;
        if (url)
            data.url = url;
        const updated = await client_1.prisma.coursePDF.update({
            where: { id },
            data
        });
        res.status(200).json(updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update note', error });
    }
};
exports.updateNote = updateNote;
const updateQuiz = async (req, res) => {
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
        const data = {};
        if (numQuestions !== undefined)
            data.numQuestions = numQuestions;
        if (passPercentage !== undefined)
            data.passPercentage = passPercentage;
        const updated = await client_1.prisma.quiz.update({
            where: { id },
            data
        });
        res.status(200).json(updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update quiz', error });
    }
};
exports.updateQuiz = updateQuiz;
