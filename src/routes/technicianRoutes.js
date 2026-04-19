import express from 'express';
import { getAllTechnicians } from '../controllers/technicianController.js';

const router = express.Router();

// GET /technicians
router.get('/', getAllTechnicians);

export default router;