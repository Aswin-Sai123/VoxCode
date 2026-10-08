import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import {
    createRole,
    getRoles,
    updateRole,
    deleteRole
} from '../controllers/company.controller.js';

const router = Router();

// Dashboard endpoints
router.get('/dashboard', protect(['COMPANY']), (req, res) => {
    res.json({ message: 'Company Dashboard data' });
});

router.get('/profile', protect(['COMPANY']), (req, res) => {
    res.json({ message: 'Company Profile data' });
});

// Role endpoints
router.post('/roles', protect(['COMPANY']), createRole);
router.get('/roles', protect(['COMPANY']), getRoles);
router.put('/roles/:id', protect(['COMPANY']), updateRole);
router.delete('/roles/:id', protect(['COMPANY']), deleteRole);

export default router;
