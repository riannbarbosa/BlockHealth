const express = require('express');
const router = express.Router();

const {
    getPatientInfo,
    getPatientMedicalRecords,
    getPatientSelfRecords,
    getPatientProfile,
    selfRegisterPatient,
    uploadSelfRecord,
} = require('../controllers/patientController');
/**
 * @swagger
 * tags:
 *   name: Patient
 *   description: Patient management endpoints
 */

/**
 * @swagger
 * /api/patient/{patientId}:
 *   get:
 *     summary: Get patient information
 *     description: Retrieves detailed information about a specific patient.
 *     tags: [Patient]
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
 *         description: Patient information retrieved successfully
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
 *                   example: "Patient information retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Patient's Ethereum address
 *                     name:
 *                       type: string
 *                       example: "Jane Doe"
 *                     dateOfBirth:
 *                       type: string
 *                       example: "1990-05-15"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+1234567890"
 *                     emergencyContact:
 *                       type: string
 *                       example: "John Doe - +1234567891"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     registrationDate:
 *                       type: number
 *                       description: Unix timestamp of registration
 *       400:
 *         description: Invalid Ethereum address
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid Ethereum address for patientId"
 *       404:
 *         description: Patient not found or not active
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Patient not found or not active"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Admin contract not initialized"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/patient/{patientId}/medical-records:
 *   get:
 *     summary: Get patient medical records from doctors
 *     description: Retrieves all medical records created by doctors for a specific patient.
 *     tags: [Patient]
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
 *                         description: IPFS hash of the medical file
 *                       fileName:
 *                         type: string
 *                         example: "medical_report.pdf"
 *                       diagnosis:
 *                         type: string
 *                         example: "Hypertension"
 *                       treatment:
 *                         type: string
 *                         example: "ACE inhibitor medication"
 *                       doctorId:
 *                         type: string
 *                         description: Ethereum address of the doctor
 *                       timestamp:
 *                         type: number
 *                         description: Unix timestamp of record creation
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *       400:
 *         description: Invalid Ethereum address
 *       404:
 *         description: Patient not found or not active
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/patient/{patientId}/records:
 *   get:
 *     summary: Get patient self-uploaded records
 *     description: Retrieves all records that the patient has uploaded themselves.
 *     tags: [Patient]
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
 *         description: Self-uploaded records retrieved successfully
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
 *                   example: "Self-uploaded records retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       cid:
 *                         type: string
 *                         description: IPFS hash of the uploaded file
 *                       fileName:
 *                         type: string
 *                         example: "blood_test_results.pdf"
 *                       recordType:
 *                         type: string
 *                         example: "Lab Results"
 *                       description:
 *                         type: string
 *                         example: "Blood test from annual checkup"
 *                       timestamp:
 *                         type: number
 *                         description: Unix timestamp of upload
 *                       isEncrypted:
 *                         type: boolean
 *                         example: false
 *       400:
 *         description: Invalid Ethereum address
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/patient/{patientId}/profile:
 *   get:
 *     summary: Get patient profile information
 *     description: Retrieves the patient's profile information including personal details and completion status.
 *     tags: [Patient]
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
 *         description: Patient profile retrieved successfully
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
 *                   example: "Patient profile retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Jane Doe"
 *                     email:
 *                       type: string
 *                       example: "jane.doe@email.com"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+1234567890"
 *                     profileCompleted:
 *                       type: boolean
 *                       example: true
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Invalid Ethereum address
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/patient/upload-record:
 *   post:
 *     summary: Upload a self-record
 *     description: Allows a patient to upload their own medical record to the blockchain.
 *     tags: [Patient]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cid
 *               - fileName
 *               - recordType
 *               - description
 *               - patientAddress
 *             properties:
 *               cid:
 *                 type: string
 *                 description: IPFS hash of the uploaded file
 *                 example: "QmTzQ2z8Z9b6Q8vZXy5F2nL7X5P3M9k8J7H6G5D4S2A1N0"
 *               fileName:
 *                 type: string
 *                 description: Original name of the uploaded file
 *                 example: "blood_test_results.pdf"
 *               recordType:
 *                 type: string
 *                 description: Type of medical record
 *                 example: "Lab Results"
 *               description:
 *                 type: string
 *                 description: Description of the record
 *                 example: "Blood test from annual checkup"
 *               patientAddress:
 *                 type: string
 *                 description: The Ethereum address of the patient
 *                 example: "0x8ba1f109551bD432803012645Hac136c"
 *     responses:
 *       201:
 *         description: Self-record uploaded successfully
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
 *                   example: "Self-record uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cid:
 *                       type: string
 *                     fileName:
 *                       type: string
 *                     recordType:
 *                       type: string
 *                     description:
 *                       type: string
 *                     patientAddress:
 *                       type: string
 *                     transactionHash:
 *                       type: string
 *                     blockNumber:
 *                       type: number
 *       400:
 *         description: Bad request - Invalid input or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "All fields are required: cid, fileName, recordType, description, patientAddress"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Patient contract not initialized"
 *                 error:
 *                   type: string
 */

router.get('/:patientId', getPatientInfo);
router.get('/:patientId/medical-records', getPatientMedicalRecords);
router.get('/:patientId/records', getPatientSelfRecords);
router.get('/:patientId/profile', getPatientProfile);
router.post('/upload-record', uploadSelfRecord);

module.exports = router;