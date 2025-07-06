import { Router } from 'express';
import { loginAdmin, logout, studentSignUp, studentVerifyOtp, studentRegister, getStudentDashboard, studentSignIn } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', asyncHandler(loginAdmin));

router.post('/logout', asyncHandler(authenticateToken), logout);

router.post('/student-signup', asyncHandler(studentSignUp));

router.post('/student-verify-otp', asyncHandler(studentVerifyOtp));

router.post('/student-register', asyncHandler(studentRegister));

router.post('/student-signin', asyncHandler(studentSignIn));

router.get('/student-dashboard', asyncHandler(authenticateToken), asyncHandler(getStudentDashboard));

export default router;
