const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const HManagerContract = require('../build/contracts/HManager.json'); // Adjust the path to your contract JSON

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ethers setup
const provider = new ethers.JsonRpcProvider('http://localhost:8545'); // Replace with your Ethereum node URL
let hManagerContract;

// Contract setup
const setupContract = async () => {
  try {
    const network = await provider.getNetwork();
    const deployedAddress = HManagerContract.networks[network.chainId]?.address;
    
    if (!deployedAddress) {
      console.error('Contract not deployed on the current network');
      return;
    }
    
    hManagerContract = new ethers.Contract(
      deployedAddress,
      HManagerContract.abi,
      provider
    );
    
    console.log('Contract setup complete');
  } catch (error) {
    console.error('Error setting up contract:', error);
  }
};

// Setup contract on startup
setupContract();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Healthcare Manager API',
      version: '1.0.0',
      description: 'API for interacting with the Healthcare Manager smart contract',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },    ],
  },
  apis: [__dirname + '/server.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Helper function to get signer
const getSigner = async (req) => {
  // In a real application, you would handle wallet connections securely.
  // For this example, we'll assume a private key is provided or use a default signer.
  // **WARNING: Storing private keys directly in code is not recommended for production.**
  const privateKey = req.body.privateKey; // Assuming private key is sent in the request body
  
  if (privateKey) {
    const wallet = new ethers.Wallet(privateKey, provider);
    return wallet;
  } else {
    // Fallback to a default signer if no private key is provided (e.g., for read-only operations)
    // This might require the node to have unlocked accounts or using a different provider setup
    console.warn("No private key provided. Using provider for read-only operations.");
    return provider; // Return provider for read-only calls
  }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Doctor:
 *       type: object
 *       required:
 *         - privateKey
 *       properties:
 *         privateKey:
 *           type: string
 *           description: Private key of the doctor's Ethereum account
 *     Patient:
 *       type: object
 *       required:
 *         - address
 *         - name
 *         - privateKey
 *       properties:
 *         address:
 *           type: string
 *           description: Ethereum address of the patient
 *         name:
 *           type: string
 *           description: Name of the patient
 *         privateKey:
 *           type: string
 *           description: Private key of the doctor's Ethereum account
 *     PatientRecord:
 *       type: object
 *       required:
 *         - cid
 *         - fileName
 *         - patientName
 *         - patientId
 *         - diagnosis
 *         - treatment
 *         - privateKey
 *       properties:
 *         cid:
 *           type: string
 *           description: Content ID for the record (e.g., IPFS hash)
 *         fileName:
 *           type: string
 *           description: Name of the file
 *         patientName:
 *           type: string
 *           description: Name of the patient
 *         patientId:
 *           type: string
 *           description: Ethereum address of the patient
 *         diagnosis:
 *           type: string
 *           description: Medical diagnosis
 *         treatment:
 *           type: string
 *           description: Treatment plan
 *         privateKey:
 *           type: string
 *           description: Private key of the doctor's Ethereum account
 */

/**
 * @swagger
 * /api/doctors:
 *   post:
 *     summary: Register a new doctor
 *     tags: [Doctors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Doctor'
 *     responses:
 *       200:
 *         description: Doctor registered successfully
 *       500:
 *         description: Server error
 */
app.post('/api/doctors', async (req, res) => {
  try {
    const signer = await getSigner(req);
    if (!signer || !signer.sendTransaction) { // Check if signer is capable of sending transactions
        return res.status(400).json({
            success: false,
            message: 'Valid private key required for this operation'
        });
    }
    const contractWithSigner = hManagerContract.connect(signer);
    
    const tx = await contractWithSigner.addDoctor();
    await tx.wait(); // Wait for the transaction to be mined
    
    res.status(200).json({
      success: true,
      message: 'Doctor registered successfully',
      transactionHash: tx.hash
    });
  } catch (error) {
    console.error('Error registering doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering doctor',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/doctors/{doctorId}:
 *   delete:
 *     summary: Revoke a doctor's access
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum address of the doctor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Doctor'
 *     responses:
 *       200:
 *         description: Doctor revoked successfully
 *       500:
 *         description: Server error
 */
app.delete('/api/doctors/:doctorId', async (req, res) => {
  try {
    const signer = await getSigner(req);
     if (!signer || !signer.sendTransaction) { // Check if signer is capable of sending transactions
        return res.status(400).json({
            success: false,
            message: 'Valid private key required for this operation'
        });
    }
    const doctorId = req.params.doctorId;
    const contractWithSigner = hManagerContract.connect(signer);
    
    const tx = await contractWithSigner.revokeDoctor(doctorId);
    await tx.wait(); // Wait for the transaction to be mined
    
    res.status(200).json({
      success: true,
      message: 'Doctor revoked successfully',
      transactionHash: tx.hash
    });
  } catch (error) {
    console.error('Error revoking doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Error revoking doctor',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/doctors/{doctorId}:
 *   get:
 *     summary: Check if an address is a doctor
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum address to check
 *     responses:
 *       200:
 *         description: Doctor status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isDoctor:
 *                   type: boolean
 *       500:
 *         description: Server error
 */
app.get('/api/doctors/:doctorId', async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    
    const isDoctor = await hManagerContract.doctors(doctorId);
    
    res.status(200).json({
      success: true,
      isDoctor: isDoctor
    });
  } catch (error) {
    console.error('Error checking doctor status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking doctor status',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Add a new patient
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Patient'
 *     responses:
 *       200:
 *         description: Patient added successfully
 *       500:
 *         description: Server error
 */
app.post('/api/patients', async (req, res) => {
  try {
    const { patientId, name } = req.body;
    const signer = await getSigner(req);
     if (!signer || !signer.sendTransaction) { // Check if signer is capable of sending transactions
        return res.status(400).json({
            success: false,
            message: 'Valid private key required for this operation'
        });
    }
    
    if (!patientId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and name are required'
      });
    }
    const contractWithSigner = hManagerContract.connect(signer);
    
    const tx = await contractWithSigner.addPatient(patientId, name);
    await tx.wait(); // Wait for the transaction to be mined
    
    res.status(200).json({
      success: true,
      message: 'Patient added successfully',
      transactionHash: tx.hash
    });
  } catch (error) {
    console.error('Error adding patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding patient',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients information
 *     tags: [Patients]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               account:
 *                 type: string
 *                 description: Ethereum address of the sender (doctor) - not required for this read-only operation
 *     responses:
 *       200:
 *         description: List of all patients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Patient'
 *       500:
 *         description: Server error
 */
app.get('/api/patients', async (req, res) => {
  try {
    // No signer needed for read-only call
    const patients = await hManagerContract.getAllPatientsInfo();
    
    res.status(200).json({
      success: true,
      patients: patients
    });
  } catch (error) {
    console.error('Error getting patients:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting patients',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/patients/{patientId}:
 *   get:
 *     summary: Get patient information
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum address of the patient
 *     responses:
 *       200:
 *         description: Patient information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       500:
 *         description: Server error
 */
app.get('/api/patients/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    const patient = await hManagerContract.patients(patientId);
    
    res.status(200).json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name
      }
    });
  } catch (error) {
    console.error('Error getting patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting patient',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/patients/{patientId}:
 *   delete:
 *     summary: Remove a patient
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum address of the patient
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Doctor'
 *     responses:
 *       200:
 *         description: Patient removed successfully
 *       500:
 *         description: Server error
 */
app.delete('/api/patients/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const signer = await getSigner(req);
     if (!signer || !signer.sendTransaction) { // Check if signer is capable of sending transactions
        return res.status(400).json({
            success: false,
            message: 'Valid private key required for this operation'
        });
    }
    const contractWithSigner = hManagerContract.connect(signer);
    
    const tx = await contractWithSigner.removePatient(patientId);
    await tx.wait(); // Wait for the transaction to be mined
    
    res.status(200).json({
      success: true,
      message: 'Patient removed successfully',
      transactionHash: tx.hash
    });
  } catch (error) {
    console.error('Error removing patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing patient',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/records:
 *   post:
 *     summary: Add a new patient record
 *     tags: [Records]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatientRecord'
 *     responses:
 *       200:
 *         description: Record added successfully
 *       500:
 *         description: Server error
 */
app.post('/api/records', async (req, res) => {
  try {
    const { cid, fileName, patientName, patientId, diagnosis, treatment } = req.body;
    const signer = await getSigner(req);
     if (!signer || !signer.sendTransaction) { // Check if signer is capable of sending transactions
        return res.status(400).json({
            success: false,
            message: 'Valid private key required for this operation'
        });
    }
    
    if (!cid || !fileName || !patientName || !patientId || !diagnosis || !treatment) {
      return res.status(400).json({
        success: false,
        message: 'All record fields are required'
      });
    }
    const contractWithSigner = hManagerContract.connect(signer);
    
    const tx = await contractWithSigner.addPatientRecord(
      cid,
      fileName,
      patientName,
      patientId,
      diagnosis,
      treatment
    );
    await tx.wait(); // Wait for the transaction to be mined
    
    res.status(200).json({
      success: true,
      message: 'Record added successfully',
      transactionHash: tx.hash
    });
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding record',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/records/{patientId}:
 *   get:
 *     summary: Get all records for a patient
 *     tags: [Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum address of the patient
 *     responses:
 *       200:
 *         description: List of patient records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PatientRecord'
 *       500:
 *         descrip
(Content truncated due to size limit. Use line ranges to read in chunks)
*/

module.exports = app;