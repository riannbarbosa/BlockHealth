const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Import controllers to initialize contracts
const adminController = require('../controllers/adminController');
const doctorController = require('../controllers/doctorController');
const patientController = require('../controllers/patientController');

let provider;
let signer;
let adminContract;
let medicContract;
let patientContract;

/**
 * Initialize blockchain connection and contracts
 */
const setupContract = async (app) => {
    try {
        console.log('Setting up blockchain contracts...');

        const rpcUrl = process.env.RPC_URL || 'http://localhost:7545'; // Ganache default
        provider = new ethers.JsonRpcProvider(rpcUrl);

        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            console.warn('Warning: No PRIVATE_KEY found in environment variables. Using default test account.');
            // Default Ganache private key - NEVER use this in production!
            const defaultPrivateKey = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
            signer = new ethers.Wallet(defaultPrivateKey, provider);
        } else {
            signer = new ethers.Wallet(privateKey, provider);
        }

        console.log('Connected to blockchain with account:', await signer.getAddress());

        // Load contract ABIs and addres    ses
        const contractsPath = path.join(__dirname, '../../build/contracts');
        
        // Load AdminContract
        try {
            const adminContractData = JSON.parse(
                fs.readFileSync(path.join(contractsPath, 'AdminContract.json'), 'utf8')
            );
            const adminAddress = process.env.ADMIN_CONTRACT_ADDRESS || getLatestDeployedAddress(adminContractData);
            if (adminAddress) {
                adminContract = new ethers.Contract(adminAddress, adminContractData.abi, signer);
                console.log('AdminContract loaded at:', adminAddress);
            } else {
                console.warn('AdminContract address not found');
            }
        } catch (error) {
            console.warn('Could not load AdminContract:', error.message);
        }

        // Load MedicContract
        try {
            const medicContractData = JSON.parse(
                fs.readFileSync(path.join(contractsPath, 'MedicContract.json'), 'utf8')
            );
            const medicAddress = process.env.MEDIC_CONTRACT_ADDRESS || getLatestDeployedAddress(medicContractData);
            if (medicAddress) {
                medicContract = new ethers.Contract(medicAddress, medicContractData.abi, signer);
                console.log('MedicContract loaded at:', medicAddress);
            } else {
                console.warn('MedicContract address not found');
            }
        } catch (error) {
            console.warn('Could not load MedicContract:', error.message);
        }

        // Load PatientContract
        try {
            const patientContractData = JSON.parse(
                fs.readFileSync(path.join(contractsPath, 'PatientContract.json'), 'utf8')
            );
            const patientAddress = process.env.PATIENT_CONTRACT_ADDRESS || getLatestDeployedAddress(patientContractData);
            if (patientAddress) {
                patientContract = new ethers.Contract(patientAddress, patientContractData.abi, signer);
                console.log('PatientContract loaded at:', patientAddress);
            } else {
                console.warn('PatientContract address not found');
            }
        } catch (error) {
            console.warn('Could not load PatientContract:', error.message);
        }

        // Initialize contracts in controllers
        const contracts = {
            adminContract,
            medicContract,
            patientContract
        };

        adminController.initializeContracts(contracts);
        doctorController.initializeContracts(contracts);
        patientController.initializeContracts(contracts);

        // Add contract information to app for debugging
        app.locals.contracts = {
            adminContract: adminContract ? await adminContract.getAddress() : null,
            medicContract: medicContract ? await medicContract.getAddress() : null,
            patientContract: patientContract ? await patientContract.getAddress() : null,
            signerAddress: await signer.getAddress()
        };

        console.log('Blockchain setup completed successfully!');

    } catch (error) {
        console.error('Error setting up contracts:', error);
        console.warn('Continuing without blockchain connection - API will have limited functionality');
    }
};

/**
 * Get the latest deployed contract address from Truffle artifacts
 */
const getLatestDeployedAddress = (contractData) => {
    try {
        const networks = contractData.networks;
        const networkIds = Object.keys(networks);
        
        if (networkIds.length === 0) {
            return null;
        }

        // Get the latest network (highest network ID)
        const latestNetworkId = Math.max(...networkIds.map(id => parseInt(id)));
        return networks[latestNetworkId].address;
    } catch (error) {
        console.error('Error getting deployed address:', error);
        return null;
    }
};

/**
 * Get contract instances (for use in other modules)
 */
const getContracts = () => {
    return {
        provider,
        signer,
        adminContract,
        medicContract,
        patientContract
    };
};

/**
 * Check if contracts are properly initialized
 */
const areContractsInitialized = () => {
    return {
        adminContract: !!adminContract,
        medicContract: !!medicContract,
        patientContract: !!patientContract,
        provider: !!provider,
        signer: !!signer
    };
};

/**
 * Get network information
 */
const getNetworkInfo = async () => {
    try {
        if (!provider) {
            throw new Error('Provider not initialized');
        }

        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        const signerAddress = signer ? await signer.getAddress() : null;
        const balance = signerAddress ? await provider.getBalance(signerAddress) : null;

        return {
            chainId: Number(network.chainId),
            name: network.name,
            blockNumber,
            signerAddress,
            balance: balance ? ethers.formatEther(balance) : null
        };
    } catch (error) {
        throw new Error('Failed to get network info: ' + error.message);
    }
};

/**
 * Deploy a new contract (utility function for testing)
 */
const deployContract = async (contractName, constructorArgs = []) => {
    try {
        if (!signer) {
            throw new Error('Signer not initialized');
        }

        const contractPath = path.join(__dirname, '../../build/contracts', `${contractName}.json`);
        const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

        const factory = new ethers.ContractFactory(contractData.abi, contractData.bytecode, signer);
        const contract = await factory.deploy(...constructorArgs);
        await contract.waitForDeployment();

        const address = await contract.getAddress();
        console.log(`${contractName} deployed to:`, address);

        return {
            contract,
            address,
            transactionHash: contract.deploymentTransaction().hash
        };
    } catch (error) {
        throw new Error(`Failed to deploy ${contractName}: ${error.message}`);
    }
};

/**
 * Validate Ethereum address
 */
const isValidAddress = (address) => {
    return ethers.isAddress(address);
};

/**
 * Format transaction receipt for API response
 */
const formatTransactionReceipt = (receipt) => {
    return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        timestamp: new Date().toISOString() // Note: This is approximate
    };
};

/**
 * Get transaction details
 */
const getTransactionDetails = async (txHash) => {
    try {
        if (!provider) {
            throw new Error('Provider not initialized');
        }

        const tx = await provider.getTransaction(txHash);
        const receipt = await provider.getTransactionReceipt(txHash);

        return {
            transaction: tx,
            receipt: receipt,
            formatted: formatTransactionReceipt(receipt)
        };
    } catch (error) {
        throw new Error(`Failed to get transaction details: ${error.message}`);
    }
};

module.exports = {
    setupContract,
    getContracts,
    areContractsInitialized,
    getNetworkInfo,
    deployContract,
    isValidAddress,
    formatTransactionReceipt,
    getTransactionDetails
};
