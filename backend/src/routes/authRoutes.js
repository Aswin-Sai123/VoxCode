const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/company/register', authController.registerCompany);
router.post('/company/login', authController.loginCompany);

router.post('/candidate/register', authController.registerCandidate);
router.post('/candidate/login', authController.loginCandidate);

router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);

router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', protect(['COMPANY', 'CANDIDATE']), authController.getMe);

module.exports = router;
