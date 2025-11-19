# BlockHealth - Healthcare Management System

> Undergraduate thesis project for Computer Science at UFFS

A blockchain-based healthcare management system built with Ethereum smart contracts. This project provides a secure and decentralized platform for managing doctors, patients, and medical records with IPFS integration for file storage.

## 🎯 Features

- **Admin Management**: Register and manage doctors and patients
- **Doctor Portal**: Add medical records and view patient information
- **Patient Portal**: Self-registration, view medical records, and upload personal health documents
- **IPFS Integration**: Decentralized storage for medical files with optional encryption
- **RESTful API**: Complete REST API with Swagger documentation
- **Smart Contract Security**: Solidity-based contracts with role-based access control

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14.x or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Truffle Framework](https://trufflesuite.com/) (v5.x)
- [Ganache](https://trufflesuite.com/ganache/) (GUI or CLI)
- [MetaMask](https://metamask.io/) (optional, for browser integration)

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd BlockHealth
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install Truffle globally (if not already installed)

```bash
npm install -g truffle
```

### 4. Configure Ganache

**Option A: Ganache GUI**
- Download and install [Ganache](https://trufflesuite.com/ganache/)
- Open Ganache and create a new workspace
- Ensure it's running on port **7545** (default)
- Note the network ID (should be **5777** or use any network)

**Option B: Ganache CLI**
```bash
npm install -g ganache-cli
ganache-cli -p 8545
```

### 5. Compile Smart Contracts

```bash
truffle compile
```

### 6. Deploy Smart Contracts

Make sure Ganache is running, then deploy the contracts:

```bash
truffle migrate --reset --network development
```

You should see output showing the deployed contract addresses:
```
MedicContract deployed at: 0x...
AdminContract deployed at: 0x...
PatientContract deployed at: 0x...
```

### 7. Configure Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_URL=http://127.0.0.1:7545
PRIVATE_KEY=<your_private_key_here>

# Encryption Configuration
ENCRYPTION_SECRET=your_very_secure_encryption_secret_here_change_in_production
```

## 🏃 Running the Application

### Start the API Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Access Swagger Documentation

Open your browser and navigate to:

```
http://localhost:3000/api-docs
```

### Test Server (Mock Mode)

To test the API without blockchain connection:

```bash
npm run test-server
```

## 📁 Project Structure

```
BlockHealth/
│
├── contracts/                          # Solidity smart contracts
│   ├── AdminContract.sol              # Manages administrative functionalities
│   ├── MedicContract.sol              # Defines operations for medical professionals
│   └── PatientContract.sol            # Implements patient management logic
│
├── migrations/                         # Deployment scripts for Ganache environment
│   ├── 1_MedicContract_migration.js   # Deploy script for MedicContract
│   ├── 2_AdminContract_migration.js   # Deploy script for AdminContract
│   └── 3_PatientContract_migration.js # Deploy script for PatientContract
│
├── test/                               # Smart contract integration tests
│   ├── AdminContract.test.js          # Tests for administrative functionalities
│   ├── MedicContract.test.js          # Tests for medical operations
│   └── PatientContract.test.js        # Tests for patient management
│
├── src/                                # Main directory containing REST API source code
│   │
│   ├── controllers/                    # Business logic connecting HTTP requests to blockchain
│   │   ├── adminController.js         # Controls administrative functionalities
│   │   ├── doctorController.js        # Manages doctor-related operations
│   │   └── patientController.js       # Controls patient functionalities
│   │
│   ├── ipfs/                           # Manages decentralized storage and file encryption
│   │   ├── ipfs.js                    # Configures IPFS network connection
│   │   └── file.js                    # Implements file upload and download functions
│   │
│   ├── routes/                         # Defines endpoints for each system entity
│   │   ├── adminRoutes.js             # Routes for administrative operations
│   │   ├── doctorRoutes.js            # Routes for medical functionalities
│   │   ├── patientRoutes.js           # Routes for patient management
│   │   └── fileRoutes.js              # Routes for file operations (IPFS)
│   │
│   ├── utils/                          # Configuration and initialization utilities
│   │   ├── contractUtils.js           # Initializes and manages contract instances
│   │   └── test_server.js             # Test environment configurations
│   │
│   ├── uploads/                        # Temporary storage for files before IPFS upload
│   │
│   ├── app.js                          # Centralizes API route configuration and Swagger documentation
│   └── index.js                        # Application entry point that initializes Express server
│
├── build/                              # Compiled contract artifacts (auto-generated)
│   └── contracts/                      # Contract ABIs and metadata
│
├── node_modules/                       # NPM dependencies (auto-generated)
│
├── truffle-config.js                   # Truffle framework configuration
├── package.json                        # NPM package configuration and dependencies
├── package-lock.json                   # NPM dependency lock file
├── .env                                # Environment variables (create this file)
├── .gitignore                          # Git ignore rules
└── README.md                           # Project documentation
```


## 📚 API Documentation

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/doctors` | Register a new doctor |
| DELETE | `/api/admin/doctors/:doctorId` | Revoke doctor authorization |
| GET | `/api/admin/doctors` | Get all authorized doctors |
| POST | `/api/admin/patients` | Register a new patient |
| DELETE | `/api/admin/patients/:patientId` | Deactivate a patient |
| GET | `/api/admin/patients` | Get all active patients |

### Doctor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctor/doctors/:doctorId` | Check doctor authorization status |
| GET | `/api/doctor/patients` | Get all patients |
| POST | `/api/doctor/records` | Add a patient medical record (with file upload) |
| GET | `/api/doctor/records/:patientId` | Get patient medical records |
| GET | `/api/doctor/patients/:patientId/exists` | Check if patient exists |

### Patient Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/patient/register` | Patient self-registration |
| GET | `/api/patient/:patientId` | Get patient information |
| GET | `/api/patient/:patientId/medical-records` | Get medical records from doctors |
| GET | `/api/patient/:patientId/records` | Get self-uploaded records |
| GET | `/api/patient/:patientId/profile` | Get patient profile |
| POST | `/api/patient/upload-record` | Upload a self-record |

### File Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload a file to IPFS |
| GET | `/api/files/download/:cid` | Download a file from IPFS |

## 🧪 Testing

### Run Smart Contract Tests

```bash
truffle test
```

### Run Specific Test File

```bash
truffle test ./test/AdminContract.test.js
truffle test ./test/MedicContract.test.js
truffle test ./test/PatientContract.test.js
```

### Test with Truffle Console

```bash
truffle console --network development
```

Inside the console:
```javascript
// Get contract instance
let admin = await AdminContract.deployed()
let medic = await MedicContract.deployed()
let patient = await PatientContract.deployed()

// Get accounts
let accounts = await web3.eth.getAccounts()

// Test adding a doctor
await admin.addDoctor(accounts[1], "Dr. John", "Cardiology", "MD12345")
```

## 📝 Example Usage

### 1. Register a Doctor (Admin)

```bash
curl -X POST http://localhost:3000/api/admin/doctors \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "0x742d35Cc8C4F8c7dd0f1e8a0b7B8e5F9E8A0F8C7",
    "name": "Dr. John Smith",
    "specialization": "Cardiology",
    "licenseNumber": "MD123456789"
  }'
```

### 2. Register a Patient (Admin)

```bash
curl -X POST http://localhost:3000/api/admin/patients \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "0x8ba1f109551bD432803012645Hac136c",
    "name": "Jane Doe",
    "dateOfBirth": "1990-05-15",
    "phoneNumber": "+1234567890",
    "emergencyContact": "John Doe - +1234567891"
  }'
```

### 3. Patient Self-Registration

```bash
curl -X POST http://localhost:3000/api/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "0x9cb2f209661cE543913022755Ibd246d",
    "name": "Bob Smith",
    "dateOfBirth": "1985-03-20",
    "phoneNumber": "+1987654321",
    "emergencyContact": "Alice Smith - +1987654322"
  }'
```

### 4. Upload Medical File

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@/path/to/medical_report.pdf" \
  -F "patientId=0x8ba1f109551bD432803012645Hac136c" \
  -F "encrypted=true"
```

### 5. Add Medical Record (Doctor)

```bash
curl -X POST http://localhost:3000/api/doctor/records \
  -F "patientId=0x8ba1f109551bD432803012645Hac136c" \
  -F "diagnosis=Hypertension" \
  -F "treatment=ACE inhibitor medication" \
  -F "medicalFile=@/path/to/report.pdf"
```

### 6. Get Patient Medical Records

```bash
curl -X GET "http://localhost:3000/api/patient/0x8ba1f109551bD432803012645Hac136c/medical-records"
```

## 🔒 Security Features

- **Role-Based Access Control**: Separate contracts for Admin, Doctor, and Patient roles
- **Address Validation**: All Ethereum addresses are validated
- **File Encryption**: Optional encryption for sensitive medical files
- **Access Control**: Only authorized doctors can add medical records
- **Patient Privacy**: Patients control their own data

## 🐛 Troubleshooting

### Contract Deployment Issues

**Problem**: Migration fails with "network not running"
```
Error: No network specified. Cannot determine current network.
```

**Solution**: Ensure Ganache is running and check your `truffle-config.js`:
```bash
# Check if Ganache is running
curl http://127.0.0.1:7545

# Restart Ganache and migrate again
truffle migrate --reset --network development
```

### Connection Issues

**Problem**: API cannot connect to blockchain
```
Error: Provider not set or invalid
```

**Solution**: 
1. Verify Ganache is running
2. Check contract addresses in your configuration
3. Ensure `.env` file has correct values

### IPFS Issues

**Problem**: File upload fails
```
Error: IPFS daemon not running
```

**Solution**: 
1. Install IPFS Desktop or run IPFS daemon
2. Or use a public IPFS gateway
3. Update IPFS configuration in code

## 🛠️ Built With

- **Blockchain**: Ethereum, Solidity 0.8.13
- **Framework**: Truffle v5.11.5
- **Backend**: Node.js, Express.js
- **Storage**: IPFS (InterPlanetary File System)
- **Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Truffle Test, Mocha, Chai

## 📄 Smart Contract Architecture

### AdminContract
- Manages doctor and patient registration
- Handles authorization and deactivation
- Maintains registry of all participants

### MedicContract
- Stores medical records from doctors
- Validates doctor authorization
- Links to AdminContract for access control

### PatientContract
- Manages patient self-uploaded records
- Stores patient profile information
- Links to both MedicContract and AdminContract

## 📖 Additional Resources

- [Truffle Documentation](https://trufflesuite.com/docs/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Web3.js Documentation](https://web3js.readthedocs.io/)
- [IPFS Documentation](https://docs.ipfs.tech/)

## 📜 License

MIT License - see LICENSE file for details

## 🤝 Contributing

This is an academic project, but suggestions and feedback are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Note**: This project is for educational purposes. Before deploying to production, ensure proper security audits and compliance with healthcare regulations (HIPAA, GDPR, etc.).