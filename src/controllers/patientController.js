const { ethers } = require('ethers');

// This will be populated when we create contractUtils.js
let adminContract;
let medicContract;
let patientContract;

/**
 * Initialize contracts - this function should be called when the app starts
 */
const initializeContracts = (contracts) => {
    adminContract = contracts.adminContract;
    medicContract = contracts.medicContract;
    patientContract = contracts.patientContract;
};

/**
 * Get patient information
 */
const getPatientInfo = async (req, res) => {
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

        // Get patient info from admin contract
        const patientInfo = await adminContract.getPatientInfo(patientId);

        if (!patientInfo.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found or not active'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Patient information retrieved successfully',
            data: {
                id: patientInfo.id,
                name: patientInfo.name,
                dateOfBirth: patientInfo.dateOfBirth,
                phoneNumber: patientInfo.phoneNumber,
                emergencyContact: patientInfo.emergencyContact,
                isActive: patientInfo.isActive,
                registrationDate: new Date(Number(patientInfo.registrationDate) * 1000).toISOString()
            }
        });

    } catch (error) {
        console.error('Error getting patient info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve patient information',
            error: error.message
        });
    }
};

/**
 * Get patient's medical records
 */
const getPatientMedicalRecords = async (req, res) => {
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

        // Check if patient exists and is active
        if (!adminContract) {
            return res.status(500).json({
                success: false,
                message: 'Admin contract not initialized'
            });
        }

        const isPatientActive = await adminContract.isPatientActive(patientId);
        if (!isPatientActive) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found or not active'
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
        console.error('Error getting patient medical records:', error);
        
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
 * Get patient's self-uploaded records (if PatientContract is available)
 */
const getPatientSelfRecords = async (req, res) => {
    try {
        const { patientId } = req.params;

        // Validate Ethereum address
        if (!ethers.isAddress(patientId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for patientId'
            });
        }

        if (!patientContract) {
            return res.status(500).json({
                success: false,
                message: 'Patient contract not initialized'
            });
        }

        // Get self-uploaded records from patient contract
        const selfRecords = await patientContract.getPatientSelfRecords(patientId);

        const formattedRecords = selfRecords.map(record => ({
            cid: record.cid,
            fileName: record.fileName,
            recordType: record.recordType,
            description: record.description,
            timestamp: new Date(Number(record.timestamp) * 1000).toISOString(),
            isEncrypted: record.isEncrypted
        }));

        res.status(200).json({
            success: true,
            message: 'Self-uploaded records retrieved successfully',
            data: formattedRecords
        });

    } catch (error) {
        console.error('Error getting patient self records:', error);
        
        let errorMessage = 'Failed to retrieve self-uploaded records';
        if (error.message.includes('Not authorized')) {
            errorMessage = 'Not authorized to access these records';
        } else if (error.message.includes('Patient not registered')) {
            errorMessage = 'Patient not registered in the system';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Get patient's profile from PatientContract
 */
const getPatientProfile = async (req, res) => {
    try {
        const { patientId } = req.params;

        // Validate Ethereum address
        if (!ethers.isAddress(patientId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for patientId'
            });
        }

        if (!patientContract) {
            return res.status(500).json({
                success: false,
                message: 'Patient contract not initialized'
            });
        }

        // Get patient profile from patient contract
        const profile = await patientContract.getPatientProfile(patientId);

        res.status(200).json({
            success: true,
            message: 'Patient profile retrieved successfully',
            data: {
                name: profile.name,
                email: profile.email,
                phoneNumber: profile.phoneNumber,
                profileCompleted: profile.profileCompleted,
                lastUpdated: new Date(Number(profile.lastUpdated) * 1000).toISOString()
            }
        });

    } catch (error) {
        console.error('Error getting patient profile:', error);
        
        let errorMessage = 'Failed to retrieve patient profile';
        if (error.message.includes('Patient not registered')) {
            errorMessage = 'Patient not registered in the system';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Update patient information (admin function)
 */
const updatePatientInfo = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { name, dateOfBirth, phoneNumber, emergencyContact } = req.body;

        // Validate Ethereum address
        if (!ethers.isAddress(patientId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for patientId'
            });
        }

        // Validate required fields
        if (!name || !dateOfBirth || !phoneNumber || !emergencyContact) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: name, dateOfBirth, phoneNumber, emergencyContact'
            });
        }

        if (!adminContract) {
            return res.status(500).json({
                success: false,
                message: 'Admin contract not initialized'
            });
        }

        // Update patient information
        const tx = await adminContract.updatePatientInfo(
            patientId,
            name,
            dateOfBirth,
            phoneNumber,
            emergencyContact
        );

        const receipt = await tx.wait();

        res.status(200).json({
            success: true,
            message: 'Patient information updated successfully',
            data: {
                patientId,
                name,
                dateOfBirth,
                phoneNumber,
                emergencyContact,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            }
        });

    } catch (error) {
        console.error('Error updating patient info:', error);
        
        let errorMessage = 'Failed to update patient information';
        if (error.message.includes('Patient does not exist')) {
            errorMessage = 'Patient does not exist or is not active';
        } else if (error.message.includes('Only owner')) {
            errorMessage = 'Only contract owner can update patient information';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Self-register a patient (using PatientContract)
 */
const selfRegisterPatient = async (req, res) => {
    try {
        const { name, email, phoneNumber, patientAddress } = req.body;

        // Validate required fields
        if (!name || !email || !phoneNumber || !patientAddress) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: name, email, phoneNumber, patientAddress'
            });
        }

        // Validate Ethereum address
        if (!ethers.isAddress(patientAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for patientAddress'
            });
        }

        if (!patientContract) {
            return res.status(500).json({
                success: false,
                message: 'Patient contract not initialized'
            });
        }

        // Self-register in patient contract
        const tx = await patientContract.selfRegister(name, email, phoneNumber, {
            from: patientAddress
        });

        const receipt = await tx.wait();

        res.status(201).json({
            success: true,
            message: 'Patient self-registration successful',
            data: {
                patientAddress,
                name,
                email,
                phoneNumber,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            }
        });

    } catch (error) {
        console.error('Error in patient self-registration:', error);
        
        let errorMessage = 'Failed to self-register patient';
        if (error.message.includes('Already registered')) {
            errorMessage = 'Patient is already registered';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Upload a self-record (using PatientContract)
 */
const uploadSelfRecord = async (req, res) => {
    try {
        const { cid, fileName, recordType, description, patientAddress } = req.body;

        // Validate required fields
        if (!cid || !fileName || !recordType || !description || !patientAddress) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: cid, fileName, recordType, description, patientAddress'
            });
        }

        // Validate Ethereum address
        if (!ethers.isAddress(patientAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for patientAddress'
            });
        }

        if (!patientContract) {
            return res.status(500).json({
                success: false,
                message: 'Patient contract not initialized'
            });
        }

        // Upload self-record
        const tx = await patientContract.uploadSelfRecord(
            cid,
            fileName,
            recordType,
            description,
            { from: patientAddress }
        );

        const receipt = await tx.wait();

        res.status(201).json({
            success: true,
            message: 'Self-record uploaded successfully',
            data: {
                cid,
                fileName,
                recordType,
                description,
                patientAddress,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            }
        });

    } catch (error) {
        console.error('Error uploading self-record:', error);
        
        let errorMessage = 'Failed to upload self-record';
        if (error.message.includes('Patient not registered')) {
            errorMessage = 'Patient not registered in the system';
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
    getPatientInfo,
    getPatientMedicalRecords,
    getPatientSelfRecords,
    getPatientProfile,
    updatePatientInfo,
    selfRegisterPatient,
    uploadSelfRecord
};
