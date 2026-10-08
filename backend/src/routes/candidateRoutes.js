const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

router.get('/dashboard', protect(['CANDIDATE']), (req, res) => {
    res.json({ message: 'Candidate Dashboard data' });
});

router.get('/profile', protect(['CANDIDATE']), (req, res) => {
    res.json({ message: 'Candidate Profile data' });
});

module.exports = router;
