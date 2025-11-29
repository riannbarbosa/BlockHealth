const { ethers } = require('ethers');

let adminContract;
let medicContract;

/**
 * Initialize contracts - this function should be called when the app starts
 */
const initializeContracts = (contracts) => {
    adminContract = contracts.adminContract;
    medicContract = contracts.medicContract;
};

/**
 * Add a new doctor to the system
 */
const addDoctor = async (req, res) => {
    try {
        const { doctorId, name, specialization, licenseNumber } = req.body;

        // Validate required fields
        if (!doctorId || !name || !specialization || !licenseNumber) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: doctorId, name, specialization, licenseNumber'
            });
        }

        // Validate Ethereum address
        if (!ethers.isAddress(doctorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for doctorId'
            });
        }

        if (!adminContract) {
            return res.status(500).json({
                success: false,
                message: 'Admin contract not initialized'
            });
        }

        // Call the smart contract to register doctor
        const tx = await adminContract.registerDoctor(
            doctorId,
            name,
            specialization,
            licenseNumber
        );

        const receipt = await tx.wait();

        res.status(201).json({
            success: true,
            message: 'Doctor registered successfully',
            data: {
                doctorId,
                name,
                specialization,
                licenseNumber,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            }
        });

    } catch (error) {
        console.error('Error adding doctor:', error);
        
        let errorMessage = 'Failed to add doctor';
        if (error.message.includes('already registered')) {
            errorMessage = 'Doctor is already registered';
        } else if (error.message.includes('Only owner')) {
            errorMessage = 'Only contract owner can add doctors';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Revoke a doctor from the system
 */
const revokeDoctor = async (req, res) => {
    try {
        const { doctorId } = req.params;

        if (!ethers.isAddress(doctorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Ethereum address for doctorId'
            });
        }

        if (!adminContract) {
            return res.status(500).json({
                success: false,
                message: 'Admin contract not initialized'
            });
        }

        // Check if doctor exists and is authorized
        const doctorInfo = await adminContract.getDoctorInfo(doctorId);
        if (!doctorInfo.isAuthorized) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found or already revoked'
            });
        }

        const tx = await adminContract.revokeDoctor(doctorId);

        const receipt = await tx.wait();

        res.status(200).json({
            success: true,
            message: 'Doctor revoked successfully',
            data: {
                doctorId,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            }
        });

    } catch (error) {
        console.error('Error revoking doctor:', error);
        
        let errorMessage = 'Failed to revoke doctor';
        if (error.message.includes('does not exist')) {
            errorMessage = 'Doctor does not exist or is not authorized';
        } else if (error.message.includes('Only owner')) {
            errorMessage = 'Only contract owner can revoke doctors';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Add a new patient to the system
 */
const addPatient = async (req, res) => {
    try {
        const { patientId, name, dateOfBirth, phoneNumber, emergencyContact } = req.body;

        // Validate required fields
        if (!patientId || !name || !dateOfBirth || !phoneNumber || !emergencyContact) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: patientId, name, dateOfBirth, phoneNumber, emergencyContact'
            });
        }

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

        // Call the smart contract to register patient
        const tx = await adminContract.registerPatient(
            patientId,
            name,
            dateOfBirth,
            phoneNumber,
            emergencyContact
        );

        const receipt = await tx.wait();

        res.status(201).json({
            success: true,
            message: 'Patient registered successfully',
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
        console.error('Error adding patient:', error);
        
        let errorMessage = 'Failed to add patient';
        if (error.message.includes('already registered')) {
            errorMessage = 'Patient is already registered';
        } else if (error.message.includes('Only owner')) {
            errorMessage = 'Only contract owner can add patients';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Remove (deactivate) a patient from the system
 */
const deactivatePatient = async (req, res) => {
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

        const patientInfo = await adminContract.getPatientInfo(patientId);
        if (!patientInfo.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found or already deactivated'
            });
        }

        const tx = await adminContract.deactivatePatient(patientId);

        const receipt = await tx.wait();

        res.status(200).json({
            success: true,
            message: 'Patient deactivated successfully',
            data: {
                patientId,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
            }
        });

    } catch (error) {
        console.error('Error removing patient:', error);
        
        let errorMessage = 'Failed to remove patient';
        if (error.message.includes('does not exist')) {
            errorMessage = 'Patient does not exist or is not active';
        } else if (error.message.includes('Only owner')) {
            errorMessage = 'Only contract owner can remove patients';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

/**
 * Get all doctors in the system
 */
const getAllDoctors = async (req, res) => {
    try {
        if (!adminContract) {
            return res.status(500).json({
                success: false,
                message: 'Admin contract not initialized'
            });
        }

        const doctors = await adminContract.getAllDoctors();

        res.status(200).json({
            success: true,
            message: 'Doctors retrieved successfully',
            data: doctors.map(doctor => ({
                id: doctor.id,
                name: doctor.name,
                specialization: doctor.specialization,
                licenseNumber: doctor.licenseNumber,
                isAuthorized: doctor.isAuthorized,
                registrationDate: new Date(Number(doctor.registrationDate) * 1000).toISOString()
            }))
        });

    } catch (error) {
        console.error('Error getting all doctors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve doctors',
            error: error.message
        });
    }
};

/**
 * Get all patients in the system
 */
const getAllPatients = async (req, res) => {
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
                emergencyContact: patient.emergencyContact,
                isActive: patient.isActive,
                registrationDate: new Date(Number(patient.registrationDate) * 1000).toISOString()
            }))
        });

    } catch (error) {
        console.error('Error getting all patients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve patients',
            error: error.message
        });
    }
};

module.exports = {
    initializeContracts,
    addDoctor,
    revokeDoctor,
    addPatient,
    deactivatePatient,
    getAllDoctors,
    getAllPatients
};
