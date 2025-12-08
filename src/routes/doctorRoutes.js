const express = require('express');
const router = express.Router();
const {
    checkDoctorStatus,
    getPatients,
    addPatientRecord,
    getPatientRecords,
    checkPatientExists,
    upload,
} = require('../controllers/doctorController');

/**
 * @swagger
 * tags:
 *   name: Doctor
 *   description: Doctor management endpoints
 */

/**
 * @swagger
 * /api/doctor/doctors/{doctorId}:
 *   get:
 *     summary: Check doctor authorization status
 *     description: Retrieves the authorization status and information of a doctor.
 *     tags: [Doctor]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum address of the doctor
 *         example: "0x742d35Cc8C4F8c7dd0f1e8a0b7B8e5F9E8A0F8C7"
 *     responses:
 *       200:
 *         description: Doctor status retrieved successfully
 *       400:
 *         description: Invalid Ethereum address
 *       404:
 *         description: Doctor not found or not authorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/doctor/patients:
 *   get:
 *     summary: Get all patients
 *     description: Retrieves a list of all active patients in the system.
 *     tags: [Doctor]
 *     responses:
 *       200:
 *         description: Patients retrieved successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/doctor/records:
 *   post:
 *     summary: Add a patient medical record
 *     description: Uploads a medical file and creates a new medical record for a patient.
 *     tags: [Doctor]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - diagnosis
 *               - treatment
 *               - doctorId
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: The Ethereum address of the patient
 *                 example: "0x8ba1f109551bD432803012645Hac136c"
 *               diagnosis:
 *                 type: string
 *                 description: Medical diagnosis
 *                 example: "Hypertension"
 *               treatment:
 *                 type: string
 *                 description: Treatment prescribed
 *                 example: "ACE inhibitor medication"
 *               doctorId:
 *                 type: string
 *                 description: The Ethereum address of the doctor adding the record
 *                 example: "0x742d35Cc8C4F8c7dd0f1e8a0b7B8e5F9E8A0F8C7"
 *               medicalFile:
 *                 type: string
 *                 format: binary
 *                 description: Medical file to upload (PDF, images, documents) - OPTIONAL
 *     responses:
 *       201:
 *         description: Medical record added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Medical record added successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cid:
 *                       type: string
 *                       description: IPFS hash of the uploaded file
 *                     fileName:
 *                       type: string
 *                     patientId:
 *                       type: string
 *                     diagnosis:
 *                       type: string
 *                     treatment:
 *                       type: string
 *                     doctorId:
 *                       type: string
 *                     transactionHash:
 *                       type: string
 *                     blockNumber:
 *                       type: number
 *       400:
 *         description: Bad request - Invalid input or missing required fields
 *       403:
 *         description: Doctor is not authorized
 *       404:
 *         description: Patient not found or not active
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/doctor/records/{patientId}:
 *   get:
 *     summary: Get patient medical records
 *     description: Retrieves all medical records for a specific patient.
 *     tags: [Doctor]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum address of the patient
 *         example: "0x8ba1f109551bD432803012645Hac136c"
 *       - in: query
 *         name: activeOnly
 *         required: false
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter to show only active records
 *         example: "true"
 *     responses:
 *       200:
 *         description: Medical records retrieved successfully
 *       400:
 *         description: Invalid Ethereum address
 *       404:
 *         description: Patient not found or no records available
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/doctor/patients/{patientId}/exists:
 *   get:
 *     summary: Check if patient exists
 *     description: Verifies if a patient is registered and active in the system.
 *     tags: [Doctor]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum address of the patient
 *         example: "0x8ba1f109551bD432803012645Hac136c"
 *     responses:
 *       200:
 *         description: Patient existence status retrieved successfully
 *       400:
 *         description: Invalid Ethereum address
 *       404:
 *         description: Patient not found or not active
 *       500:
 *         description: Internal server error
 */

router.get('/doctors/:doctorId', checkDoctorStatus);
router.get('/patients', getPatients);
router.post('/records', upload.single('medicalFile'), addPatientRecord);
router.get('/records/:patientId', getPatientRecords);
router.get('/patients/:patientId/exists', checkPatientExists);

module.exports = router;