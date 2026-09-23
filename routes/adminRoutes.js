const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/roleMiddleware');
const adminController = require('../controllers/adminController');

// Dashboard & Analytics
router.get('/', authenticate, authorizeRole('admin'), adminController.getDashboardStats);
router.get('/analytics', authenticate, authorizeRole('admin'), adminController.getAnalytics);

// Users
router.get('/users', authenticate, authorizeRole('admin'), adminController.getUsers);
router.put('/users/:id/role', authenticate, authorizeRole('admin'), adminController.updateUserRole);
router.get('/audit-logs', authenticate, authorizeRole('admin'), adminController.getAuditLogs);

// Submissions
router.get('/submissions', authenticate, authorizeRole('admin'), adminController.getAllSubmissions);

// Contests
router.get('/contests', authenticate, authorizeRole('admin'), adminController.getContests);
router.get('/contests/registrations', authenticate, authorizeRole('admin'), adminController.getContestRegistrations);
router.post('/contests', authenticate, authorizeRole('admin'), adminController.createContest);
router.put('/contests/:id', authenticate, authorizeRole('admin'), adminController.updateContest);
router.delete('/contests/:id', authenticate, authorizeRole('admin'), adminController.deleteContest);

// Tags
router.get('/tags', authenticate, authorizeRole('admin'), adminController.getTags);
router.post('/tags', authenticate, authorizeRole('admin'), adminController.createTag);
router.delete('/tags/:id', authenticate, authorizeRole('admin'), adminController.deleteTag);

module.exports = router;
