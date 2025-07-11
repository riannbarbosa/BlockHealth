const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const HManagerContract = require('../build/contracts/HManager.json');
const path = require('path');
const multer = require('multer');
const { uploadToIPFS, downloadFromIPFS } = require('./ipfs/ipfs.js');
const fs = require('fs');
const { fileURLToPath } = require('url');


dotenv.config();
// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const provider = new ethers.JsonRpcProvider(process.env.NODE_URL);
let hManagerContract;
let contractReady = false;


const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common medical document formats
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and document files are allowed'));
    }
  }
});

// Helper to schedule file deletion after 15 minutes
const scheduleFileDeletion = (filePath, minutes = 15) => {
  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file after ${minutes} minutes:`, filePath, err);
      } else {
        console.log(`File deleted after ${minutes} minutes:`, filePath);
      }
    });
  }, minutes * 60 * 1000);
};

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
 *         privateKey:
 *           type: string
 *           description: Private key of the doctor
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
 *     AddPatientRecord:
 *       type: object
 *       required:
 *         - patientName
 *         - patientId
 *         - diagnosis
 *         - treatment
 *       properties:
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
 *         medicalFile:
 *           type: string
 *           format: binary
 *           description: Medical document file (PDF, DOC, images, etc.)
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
    const signer = await getSigner();
    console.log('Signer:', signer);

    if (!signer || !signer.sendTransaction) {
      console.log('signer is not valid or does not support sending transactions');
        return res.status(400).json({
            success: false,
            message: 'Valid private key required for this operation'
        });
    }

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID (address) is required'
      });
    }
    const contractWithSigner = hManagerContract.connect(signer);
    
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
 *     summary: Add a new patient record with file upload
 *     tags: [Records]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/AddPatientRecord'
 *     responses:
 *       200:
 *         description: Record added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 transactionHash:
 *                   type: string
 *                 cid:
 *                   type: string
 *                 fileName:
 *                   type: string
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Server error
 */
app.post('/api/records', upload.single('medicalFile'), async (req, res) => {
  try {
    const { patientName, patientId, diagnosis, treatment } = req.body;
    const signer = await getSigner();
     if (!signer || !signer.sendTransaction) { // Check if signer is capable of sending transactions
        return res.status(400).json({
            success: false,
            message: 'Valid private key required for this operation'
        });
    }
    
    if (!patientName || !patientId || !diagnosis || !treatment) {
      return res.status(400).json({
        success: false,
        message: 'All record fields are required'
      });
    }

    let cid = '';
    let fileName = '';

    if(req.file){
      fileName = req.file.originalname;
      const uploadResult = await uploadToIPFS(req.file.path, patientId, true);
      cid = uploadResult.cid;
      console.log(`File uploaded and encrypted: ${fileName} -> CID: ${cid}`);
      
      // Schedule deletion after 15 minutes
      scheduleFileDeletion(req.file.path, 15);
    }else{
      fileName = 'no-file'
      cid=`text-record-${Date.now()}`;
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
    const formattedRecords = records.map(record => ({
      cid: record[0],
      fileName: record[1],
      patientName: record[2],
      patientId: record[3],
      diagnosis: record[4],
      treatment: record[5],
      doctorId: record[6],
      timestamp: record[7].toString(),
    }));

    res.status(200).json({
      success: true,
      records: formattedRecords
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

/**
 * @swagger
 * /api/files/{cid}:
 *   get:
 *     summary: Download and decrypt a file from IPFS
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: cid
 *         schema:
 *           type: string
 *         required: true
 *         description: IPFS Content ID of the file
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: Patient ID for decryption
 *       - in: query
 *         name: fileName
 *         schema:
 *           type: string
 *         required: false
 *         description: Original filename for download
 *     responses:
 *       200:
 *         description: File downloaded and decrypted successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - missing required parameters
 *       500:
 *         description: Server error
 */
app.get('/api/files/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const { patientId, fileName } = req.query;
    const signer = await getSigner();
    
    if (!signer) {
      return res.status(400).json({
        success: false,
        message: 'Valid private key required - only authorized doctors can download files'
      });
    }

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required for file decryption'
      });
    }

    // Download and decrypt the file
    const fileBuffer = await downloadFromIPFS(cid, patientId, true);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    if (fileName) {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }
    
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message
    });
  }
});
module.exports = app;