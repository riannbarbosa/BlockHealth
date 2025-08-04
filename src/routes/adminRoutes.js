const express = require('express');
const router = express.Router();

const {
    addDoctor,
    revokeDoctor,
    addPatient,
    removePatient,
    getAllPatients,
    getAllDoctors
} = require('../controllers/adminController');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */

/**
 * @swagger
 * /api/admin/doctors:
 *   post:
 *     summary: Add a new doctor
 *     description: Registers a new doctor in the system with their credentials and authorization.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doctorId
 *               - name
 *               - specialization
 *               - licenseNumber
 *             properties:
 *               doctorId:
 *                 type: string
 *                 description: The Ethereum address of the doctor
 *                 example: "0x742d35Cc8C4F8c7dd0f1e8a0b7B8e5F9E8A0F8C7"
 *               name:
 *                 type: string
 *                 description: Full name of the doctor
 *                 example: "Dr. John Smith"
 *               specialization:
 *                 type: string
 *                 description: Medical specialization of the doctor
 *                 example: "Cardiology"
 *               licenseNumber:
 *                 type: string
 *                 description: Medical license number
 *                 example: "MD123456789"
 *     responses:
 *       201:
 *         description: Doctor registered successfully
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
 *                   example: "Doctor registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     doctorId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     specialization:
 *                       type: string
 *                     licenseNumber:
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
 *                   example: "All fields are required: doctorId, name, specialization, licenseNumber"
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
 *                   example: "Failed to add doctor"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/admin/doctors/{doctorId}:
 *   delete:
 *     summary: Revoke a doctor's authorization
 *     description: Removes a doctor's authorization from the system.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum address of the doctor to revoke
 *         example: "0x742d35Cc8C4F8c7dd0f1e8a0b7B8e5F9E8A0F8C7"
 *     responses:
 *       200:
 *         description: Doctor revoked successfully
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
 *                   example: "Doctor revoked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     doctorId:
 *                       type: string
 *                     transactionHash:
 *                       type: string
 *                     blockNumber:
 *                       type: number
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
 *                   example: "Invalid Ethereum address for doctorId"
 *       404:
 *         description: Doctor not found or already revoked
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
 *                   example: "Doctor not found or already revoked"
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
 *                   example: "Failed to revoke doctor"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/admin/patients:
 *   post:
 *     summary: Add a new patient
 *     description: Registers a new patient in the system with their personal information.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - name
 *               - dateOfBirth
 *               - phoneNumber
 *               - emergencyContact
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: The Ethereum address of the patient
 *                 example: "0x8ba1f109551bD432803012645Hac136c"
 *               name:
 *                 type: string
 *                 description: Full name of the patient
 *                 example: "Jane Doe"
 *               dateOfBirth:
 *                 type: string
 *                 description: Patient's date of birth
 *                 example: "1990-05-15"
 *               phoneNumber:
 *                 type: string
 *                 description: Patient's phone number
 *                 example: "+1234567890"
 *               emergencyContact:
 *                 type: string
 *                 description: Emergency contact information
 *                 example: "John Doe - +1234567891"
 *     responses:
 *       201:
 *         description: Patient registered successfully
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
 *                   example: "Patient registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     patientId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     dateOfBirth:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     emergencyContact:
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
 *                   example: "All fields are required: patientId, name, dateOfBirth, phoneNumber, emergencyContact"
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
 *                   example: "Failed to add patient"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/admin/patients/{patientId}:
 *   delete:
 *     summary: Remove (deactivate) a patient
 *     description: Deactivates a patient's account in the system.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum address of the patient to deactivate
 *         example: "0x8ba1f109551bD432803012645Hac136c"
 *     responses:
 *       200:
 *         description: Patient deactivated successfully
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
 *                   example: "Patient deactivated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     patientId:
 *                       type: string
 *                     transactionHash:
 *                       type: string
 *                     blockNumber:
 *                       type: number
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
 *         description: Patient not found or already deactivated
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
 *                   example: "Patient not found or already deactivated"
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
 *                   example: "Failed to remove patient"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/admin/doctors:
 *   get:
 *     summary: Get all doctors
 *     description: Retrieves a list of all authorized doctors in the system.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successfully retrieved all doctors
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
 *                   example: "Doctors retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Ethereum address of the doctor
 *                         example: "0x742d35Cc8C4F8c7dd0f1e8a0b7B8e5F9E8A0F8C7"
 *                       name:
 *                         type: string
 *                         description: Full name of the doctor
 *                         example: "Dr. John Smith"
 *                       specialization:
 *                         type: string
 *                         description: Medical specialization
 *                         example: "Cardiology"
 *                       licenseNumber:
 *                         type: string
 *                         description: Medical license number
 *                         example: "MD123456789"
 *                       isAuthorized:
 *                         type: boolean
 *                         description: Authorization status
 *                         example: true
 *                       registrationDate:
 *                         type: number
 *                         description: Registration timestamp
 *                         example: 1642723200
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
 *                   example: "Failed to retrieve doctors"
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /api/admin/patients:
 *   get:
 *     summary: Get all patients
 *     description: Retrieves a list of all active patients in the system.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successfully retrieved all patients
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
 *                         description: Ethereum address of the patient
 *                         example: "0x8ba1f109551bD432803012645Hac136c"
 *                       name:
 *                         type: string
 *                         description: Full name of the patient
 *                         example: "Jane Doe"
 *                       dateOfBirth:
 *                         type: string
 *                         description: Patient's date of birth
 *                         example: "1990-05-15"
 *                       phoneNumber:
 *                         type: string
 *                         description: Patient's phone number
 *                         example: "+1234567890"
 *                       emergencyContact:
 *                         type: string
 *                         description: Emergency contact information
 *                         example: "John Doe - +1234567891"
 *                       isActive:
 *                         type: boolean
 *                         description: Patient's active status
 *                         example: true
 *                       registrationDate:
 *                         type: number
 *                         description: Registration timestamp
 *                         example: 1642723200
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
 *                   example: "Failed to retrieve patients"
 *                 error:
 *                   type: string
 */
router.post('/doctors', addDoctor);
router.delete('/doctors/:doctorId', revokeDoctor);
router.post('/patients', addPatient);
router.delete('/patients/:patientId', removePatient);
router.get('/patients', getAllPatients);
router.get('/doctors', getAllDoctors);

module.exports = router;

