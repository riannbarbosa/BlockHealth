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
 *                   example: "Doctor status retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                       example: "Dr. John Smith"
 *                     specialization:
 *                       type: string
 *                       example: "Cardiology"
 *                     licenseNumber:
 *                       type: string
 *                       example: "MD123456789"
 *                     isAuthorized:
 *                       type: boolean
 *                       example: true
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
 *                   example: "Patients retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: "Jane Doe"
 *                       dateOfBirth:
 *                         type: string
 *                         example: "1990-05-15"
 *                       phoneNumber:
 *                         type: string
 *                         example: "+1234567890"
 *                       isActive:
 *                         type: boolean
 *                         example: true
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
 *               - doctorId
 *               - diagnosis
 *               - treatment
 *               - medicalFile
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: The Ethereum address of the patient
 *                 example: "0x8ba1f109551bD432803012645Hac136c"
 *               doctorId:
 *                 type: string
 *                 description: The Ethereum address of the doctor
 *                 example: "0x742d35Cc8C4F8c7dd0f1e8a0b7B8e5F9E8A0F8C7"
 *               diagnosis:
 *                 type: string
 *                 description: Medical diagnosis
 *                 example: "Hypertension"
 *               treatment:
 *                 type: string
 *                 description: Treatment prescribed
 *                 example: "ACE inhibitor medication"
 *               medicalFile:
 *                 type: string
 *                 format: binary
 *                 description: Medical file to upload (PDF, images, documents)
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
 *     responses:
 *       200:
 *         description: Medical records retrieved successfully
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
 *                   example: "Medical records retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       cid:
 *                         type: string
 *                       fileName:
 *                         type: string
 *                       diagnosis:
 *                         type: string
 *                       treatment:
 *                         type: string
 *                       doctorId:
 *                         type: string
 *                       timestamp:
 *                         type: number
 *                       isActive:
 *                         type: boolean
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
 *                   example: "Patient exists and is active"
 *                 data:
 *                   type: object
 *                   properties:
 *                     exists:
 *                       type: boolean
 *                       example: true
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     patientId:
 *                       type: string
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

