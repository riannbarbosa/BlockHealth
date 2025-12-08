const { ethers } = require('ethers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadToIPFS } = require('../ipfs/ipfs');

// This will be populated when we create contractUtils.js
let adminContract;
let medicContract;

/**
 * Initialize contracts - this function should be called when the app starts
 */
const initializeContracts = (contracts) => {
    adminContract = contracts.adminContract;
    medicContract = contracts.medicContract;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}_${timestamp}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common medical file formats
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, images, and documents are allowed.'));
        }
    }
});

/**
 * Check if a doctor is authorized
 */
const checkDoctorStatus = async (req, res) => {
    try {
        const { doctorId } = req.params;

        if (!ethers.isAddress(doctorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for doctorId'
            });
        }

        if (!adminContract || !medicContract) {
            return res.status(500).json({
                success: false,
                message: 'Contracts not initialized'
            });
        }

        const doctorInfo = await adminContract.getDoctorInfo(doctorId);
        const isAuthorized = await medicContract.isDoctorAuthorized(doctorId);

 


        if(doctorInfo.isAuthorized && !isAuthorized) {

            try{
                const tx = await medicContract.authorizeDoctor(doctorId);
                await tx.wait();

                const newIsAuthorized = await medicContract.isDoctorAuthorized(doctorId);
                  return  res.status(200).json({
            success: true,
            message: 'Doctor status retrieved successfully',
            data: {
                id: doctorInfo.id,
                name: doctorInfo.name,
                specialization: doctorInfo.specialization,
                licenseNumber: doctorInfo.licenseNumber,
                isAuthorized: newIsAuthorized,
                registrationDate: new Date(Number(doctorInfo.registrationDate) * 1000).toISOString()
            }
         });

            }catch(error){
                console.error('Error authorizing doctor:', error);
            }
        }

        if (!doctorInfo.isAuthorized && !isAuthorized) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found or not authorized'
            });
        }

         res.status(200).json({
            success: true,
            message: 'Doctor status retrieved successfully',
            data: {
                id: doctorInfo.id,
                name: doctorInfo.name,
                specialization: doctorInfo.specialization,
                licenseNumber: doctorInfo.licenseNumber,
                isAuthorized: isAuthorized,
                registrationDate: new Date(Number(doctorInfo.registrationDate) * 1000).toISOString()
            }
        });
   

    } catch (error) {
        console.error('Error checking doctor status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check doctor status',
            error: error.message
        });
    }
};

/**
 * Get all patients (for doctors to view)
 */
const getPatients = async (req, res) => {
    try {
        if (!adminContract) {
            return res.status(500).json({
                success: false,
                message: 'Admin contract not initialized'
            });
        }

        const patients = await adminContract.getAllPatients();

        res.status(200).json({
            success: true,
            message: 'Patients retrieved successfully',
            data: patients.map(patient => ({
                id: patient.id,
                name: patient.name,
                dateOfBirth: patient.dateOfBirth,
                phoneNumber: patient.phoneNumber,
                isActive: patient.isActive,
                registrationDate: new Date(Number(patient.registrationDate) * 1000).toISOString()
            }))
        });

    } catch (error) {
        console.error('Error getting patients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve patients',
            error: error.message
        });
    }
};

/**
 * Add a medical record for a patient
 */
const addPatientRecord = async (req, res) => {
    try {
        const { patientId, diagnosis, treatment, doctorId } = req.body;
        const medicalFile = req.file;

        if (!patientId || !diagnosis || !treatment || !doctorId) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: patientId, diagnosis, treatment, doctorId'
            });
        }

        if (!ethers.isAddress(patientId) || !ethers.isAddress(doctorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for patientId or doctorId'
            });
        }

        if (!medicContract || !adminContract) {
            return res.status(500).json({
                success: false,
                message: 'Contracts not initialized'
            });
        }

        // Verify doctor is authorized
        const isDoctorAuthorized = await medicContract.isDoctorAuthorized(doctorId);
        if (!isDoctorAuthorized) {
            // Try to sync from AdminContract
            const doctorInfo = await adminContract.getDoctorInfo(doctorId);
            if (doctorInfo.isAuthorized) {
                console.log('Syncing doctor authorization...');
                try {
                    const authTx = await medicContract.authorizeDoctor(doctorId);
                    await authTx.wait();
                    console.log('Doctor authorization synced successfully');
                } catch (authError) {
                    console.error('Failed to sync doctor authorization:', authError);
                    return res.status(403).json({
                        success: false,
                        message: 'Doctor is not properly authorized in the system'
                    });
                }
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Doctor is not authorized'
                });
            }
        }

        // Verify patient is active
        const isPatientActive = await adminContract.isPatientActive(patientId);
        if (!isPatientActive) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found or not active'
            });
        }

        let cid = '';
        let fileName = '';
        if (medicalFile) {
            try {
                const ipfsResult = await uploadToIPFS(medicalFile.path, patientId, true);
                cid = ipfsResult.cid;
                fileName = medicalFile.originalname;
                fs.unlinkSync(medicalFile.path);
            } catch (ipfsError) {
                console.error('IPFS upload error:', ipfsError);
                cid = 'QmNoPhuLRhyaJzx1KoJ6vgmwmvFTxc8a1Cv7Bx1RPb6cNq';
                fileName = medicalFile ? medicalFile.originalname : 'No file';
            }
        } else {
            cid = 'QmTextOnlyRecord' + Date.now();
            fileName = 'Text record only';
        }

        // Use the new addMedicalRecordByAdmin function
        const tx = await medicContract.addMedicalRecordByAdmin(
            cid,
            fileName,
            patientId,
            diagnosis,
            treatment,
            doctorId
        );

        const receipt = await tx.wait();

        res.status(201).json({
            success: true,
            message: 'Medical record added successfully',
            data: {
                cid,
                fileName,
                patientId,
                diagnosis,
                treatment,
                doctorId: doctorId,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            }
        });

    } catch (error) {
        console.error('Error adding patient record:', error);
        
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        let errorMessage = 'Failed to add medical record';
        if (error.message.includes('Specified doctor is not authorized')) {
            errorMessage = 'Doctor is not authorized to add records';
        } else if (error.message.includes('Patient not active')) {
            errorMessage = 'Patient is not active in the system';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Get medical records for a specific patient
 */
const getPatientRecords = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { activeOnly } = req.query;

        // Validate Ethereum address
        if (!ethers.isAddress(patientId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for patientId'
            });
        }

        if (!medicContract) {
            return res.status(500).json({
                success: false,
                message: 'Medic contract not initialized'
            });
        }

        let records;
        if (activeOnly === 'true') {
            records = await medicContract.getActiveMedicalRecords(patientId);
        } else {
            records = await medicContract.getMedicalRecords(patientId);
        }

        const formattedRecords = records.map(record => ({
            cid: record.cid,
            fileName: record.fileName,
            patientId: record.patientId,
            diagnosis: record.diagnosis,
            treatment: record.treatment,
            doctorId: record.doctorId,
            timestamp: new Date(Number(record.timestamp) * 1000).toISOString(),
            isActive: record.isActive
        }));

        res.status(200).json({
            success: true,
            message: 'Medical records retrieved successfully',
            data: formattedRecords
        });

    } catch (error) {
        console.error('Error getting patient records:', error);
        
        let errorMessage = 'Failed to retrieve medical records';
        if (error.message.includes('Unauthorized access')) {
            errorMessage = 'Not authorized to access these records';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Check if a patient exists in the system
 */
const checkPatientExists = async (req, res) => {
    try {
        const { patientId } = req.params;

        // Validate Ethereum address
        if (!ethers.isAddress(patientId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for patientId'
            });
        }

        if (!adminContract) {
            return res.status(500).json({
                success: false,
                message: 'Admin contract not initialized'
            });
        }

        const isActive = await adminContract.isPatientActive(patientId);
        const patientInfo = await adminContract.getPatientInfo(patientId);

        res.status(200).json({
            success: true,
            message: 'Patient status checked successfully',
            data: {
                exists: isActive,
                patientInfo: isActive ? {
                    id: patientInfo.id,
                    name: patientInfo.name,
                    dateOfBirth: patientInfo.dateOfBirth,
                    isActive: patientInfo.isActive,
                    registrationDate: new Date(Number(patientInfo.registrationDate) * 1000).toISOString()
                } : null
            }
        });

    } catch (error) {
        console.error('Error checking patient exists:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check patient status',
            error: error.message
        });
    }
};

/**
 * Deactivate a medical record
 */
const deactivateRecord = async (req, res) => {
    try {
        const { patientId, recordIndex } = req.body;
        const doctorId = req.body.doctorId; // Should come from authentication middleware

        // Validate required fields
        if (!patientId || recordIndex === undefined || !doctorId) {
            return res.status(400).json({
                success: false,
                message: 'patientId, recordIndex, and doctorId are required'
            });
        }

        // Validate Ethereum addresses
        if (!ethers.isAddress(patientId) || !ethers.isAddress(doctorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum addresses'
            });
        }

        if (!medicContract) {
            return res.status(500).json({
                success: false,
                message: 'Medic contract not initialized'
            });
        }

        // Deactivate the recorde
        const tx = await medicContract.deactivateRecord(patientId, recordIndex, doctorId);
        const receipt = await tx.wait();

        res.status(200).json({
            success: true,
            message: 'Medical record deactivated successfully',
            data: {
                patientId,
                recordIndex,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            }
        });

    } catch (error) {
        console.error('Error deactivating record:', error);
        
        let errorMessage = 'Failed to deactivate record';
        if (error.message.includes('Only record creator can deactivate')) {
            errorMessage = 'Only the doctor who created the record can deactivate it';
        } else if (error.message.includes('Invalid record index')) {
            errorMessage = 'Invalid record index';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

module.exports = {
    initializeContracts,
    upload,
    checkDoctorStatus,
    getPatients,
    addPatientRecord,
    getPatientRecords,
    checkPatientExists,
    deactivateRecord
};
