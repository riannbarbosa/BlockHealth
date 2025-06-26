const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
require('dotenv').config();
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
const provider = new ethers.JsonRpcProvider(process.env.NODE_URL);
let hManagerContract;
let contractReady = false;

// Contract setup
const setupContract = async () => {
  try {
    const block = await provider.getBlockNumber();
    console.log("Connected to node, block:", block);
    const network = await provider.getNetwork();
    const chainIdStr = network.chainId.toString();
    console.log("Network info:", HManagerContract.networks[chainIdStr]?.address);
    console.log("Artifact networks keys:", Object.keys(HManagerContract.networks));
    const deployedAddress = HManagerContract.networks[chainIdStr]?.address;
    if (!deployedAddress) {
      console.error('Contract not deployed on the current network (chainId:', network.chainId, ')');
      contractReady = false;
      return;
    }
    
    hManagerContract = new ethers.Contract(
      deployedAddress,
      HManagerContract.abi,
      provider
    );
    
    contractReady = true;
    console.log('Contract setup complete - API is now available');
  } catch (error) {
    console.error('Error setting up contract:', error);
    contractReady = false;
  }
};

setupContract();

// Updated middleware to block ALL routes when contract not ready
app.use((req, res, next) => {
  if (!contractReady || !hManagerContract) {
    return res.status(503).json({
      success: false,
      message: 'Contract is not connected. Please check your blockchain connection and contract deployment.'
    });
  }
  req.hManagerContract = hManagerContract;
  next();
});

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
      },
    ],
  },
  apis: [__dirname + '/server.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
const getSigner = async () => {
  const privateKey = process.env.PRIVATE_KEY;

  if (privateKey) {
    const wallet = new ethers.Wallet(privateKey, provider);
    return wallet;
  } else {
    console.warn("No private key provided. Using provider for read-only operations.");
    return provider;
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
 *     Patient:
 *       type: object
 *       required:
 *         - patientId
 *         - name
 *       properties:
 *         patientId:
 *           type: string
 *           description: Ethereum address of the patient
 *         name:
 *           type: string
 *           description: Name of the patient
 *     AddDoctorRequest:
 *       type: object
 *       required:
 *         - doctorId
 *       properties:
 *         doctorId:
 *           type: string
 *           description: Ethereum address of the doctor to add
 *     PatientRecord:
 *       type: object
 *       required:
 *         - cid
 *         - fileName
 *         - patientName
 *         - patientId
 *         - diagnosis
 *         - treatment
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
 */



/**
 * @swagger
 * /api/doctors:
 *   post:
 *     summary: Add a new doctor (only owner can do this)
 *     tags: [Doctors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddDoctorRequest'
 *     responses:
 *       200:
 *         description: Doctor added successfully
 *       400:
 *         description: Bad request - missing doctorId or invalid private key
 *       500:
 *         description: Server error
 */
app.post('/api/doctors', async (req, res) => {
  try {
    const { doctorId } = req.body; // Expecting doctorId in the request body
    console.log('Received doctorId:', req.body);
    console.log('Adding doctor with ID:', doctorId);
    const signer = await getSigner();
    console.log('Signer:', signer);
    console.log(signer.sendTransaction, 'FAF', doctorId);

    if (!signer || !signer.sendTransaction) {
      console.log('signer is not valid or does not support sending transactions');
      
        return res.status(400).json({
            success: false,
            message: 'Valid private key required for this operation'
        });
    }
    console.log('Signer is valid:', signer);

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID (address) is required'
      });
    }
    const contractWithSigner = hManagerContract.connect(signer);
    console.log('Contract with signer:', contractWithSigner);
    
    const tx = await contractWithSigner.addDoctor(doctorId);
    await tx.wait(); // Wait for the transaction to be mined
    
    res.status(200).json({
      success: true,
      message: 'Doctor added successfully',
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
 *     summary: Revoke a doctor's access (only owner can do this)
 *     tags: [Doctors]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum address of the doctor
 *     responses:
 *       200:
 *         description: Doctor revoked successfully
 *       500:
 *         description: Server error
 */
app.delete('/api/doctors/:doctorId', async (req, res) => {
  try {
    const signer = await getSigner();
     if (!signer || !signer.sendTransaction) { // Check if signer is capable of sending transactions
        return res.status(400).json({
            success: false,
            message: 'Valid private key required for this operation'
        });
    }
    const doctorId = req.params.doctorId;
    const contractWithSigner = hManagerContract.connect(signer);
    
    const tx = await contractWithSigner.revokeDoctorAuth(doctorId);
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
 *                 success:
 *                   type: boolean
 *                 doctorId:
 *                   type: string
 *                 isAuthorized:
 *                   type: boolean
 *       500:
 *         description: Server error
 */
app.get('/api/doctors/:doctorId', async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    
    const doctor = await hManagerContract.doctors(doctorId);
    
    res.status(200).json({
      success: true,
      doctorId: doctor.id,
      isAuthorized: doctor.isAuthorized
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
    const { patientId, name } = req.body; // Changed from address to patientId
    const signer = await getSigner();
     if (!signer || !signer.sendTransaction) {
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
    await tx.wait();
    
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
 *     summary: Get all patients information (only authorized doctors can access)
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all patients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *       400:
 *         description: Unauthorized - valid private key required
 *       500:
 *         description: Server error
 */
app.get('/api/patients', async (req, res) => {
  const signer = await getSigner();
  try {
    if (!signer) {
        return res.status(400).json({
            success: false,
            message: 'Valid private key required - only authorized doctors can access patient list'
        });
    }
    
    const contractWithSigner = hManagerContract.connect(signer);
    const patients = await contractWithSigner.getAllPatientsInfo();
    
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
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
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
 *     responses:
 *       200:
 *         description: Patient removed successfully
 *       500:
 *         description: Server error
 */
app.delete('/api/patients/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const signer = await getSigner();
    
    if (!signer || !signer.sendTransaction) {
        return res.status(400).json({
            success: false,
            message: 'Valid private key required for this operation'
        });
    }
    
    const contractWithSigner = hManagerContract.connect(signer);
    
    const tx = await contractWithSigner.removePatient(patientId);
    await tx.wait();
    
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
    const signer = await getSigner();
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
 *         description: Server error
 */
app.get('/api/records/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const signer = await getSigner();
    if (!signer) {
        return res.status(400).json({
            success: false,
            message: 'Valid private key required - only authorized doctors can access patient records'
        });
    }  
    const contractWithSigner = hManagerContract.connect(signer);
    const records = await contractWithSigner.getPatientRecords(patientId);
    
    res.status(200).json({
      success: true,
      records: records
    });
  } catch (error) {
    console.error('Error getting patient records:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting patient records',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/patients/{patientId}/exists:
 *   get:
 *     summary: Check if a patient exists
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
 *         description: Patient existence status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *       500:
 *         description: Server error
 */
app.get('/api/patients/:patientId/exists', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    const exists = await hManagerContract.getPatientExists(patientId);
    
    res.status(200).json({
      success: true,
      exists: exists
    });
  } catch (error) {
    console.error('Error checking patient existence:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking patient existence',
      error: error.message
    });
  }
});
module.exports = app;