const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { protect } = require('../middleware/auth');

// Dashboard endpoints
router.get('/dashboard', protect(['COMPANY']), (req, res) => {
    res.json({ message: 'Company Dashboard data' });
});

router.get('/profile', protect(['COMPANY']), (req, res) => {
    res.json({ message: 'Company Profile data' });
});

// Role endpoints
router.post('/roles', protect(['COMPANY']), companyController.createRole);
router.get('/roles', protect(['COMPANY']), companyController.getRoles);
router.put('/roles/:id', protect(['COMPANY']), companyController.updateRole);
router.delete('/roles/:id', protect(['COMPANY']), companyController.deleteRole);

module.exports = router;
