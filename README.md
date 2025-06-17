# Healthcare - Undergraduate thesis of Computer Science

This my undergraduate thesis work of computer science course from UFFS. It's a Healthcare Manager smart contract. It provides endpoints for managing doctors, patients, and medical records.

I've created a REST API to handle smart contract requests. I'm using the Truffle framework to improve testing and Ganache for a simulated blockchain - local blockchain.


## Prerequisites

- Node.js and npm
- Ethereum node (local or remote)
- Smart contract deployed on the Ethereum network

## Installation

1. Install dependencies:

```bash
npm install
```


## Running the API

Start the server:

```bash
node index.js
```

The server will start on port 3000 (or the port specified in the PORT environment variable).

### Test Server

If you don't have an Ethereum node set up yet, you can run the test server to see the Swagger documentation:

```bash
node test-server.js
```

This will start a server with mock endpoints and the Swagger UI.

## Project Structure

- `server.js` - Main server file with REST API endpoints and Swagger documentation
- `index.js` - Entry point that starts the server
- `test-server.js` - Test server with mock endpoints for testing Swagger UI
- `HManager.sol` - Smart contract source code
- `HManager.json` - Smart contract ABI and metadata

## API Documentation

Swagger documentation is available at:

```
http://localhost:3000/api-docs
```

## API Endpoints

### Doctors

- `POST /api/doctors` - Register a new doctor
- `DELETE /api/doctors/:doctorId` - Revoke a doctor's access
- `GET /api/doctors/:doctorId` - Check if an address is a doctor

### Patients

- `POST /api/patients` - Add a new patient
- `GET /api/patients` - Get all patients information
- `GET /api/patients/:patientId` - Get patient information
- `DELETE /api/patients/:patientId` - Remove a patient

### Records

- `POST /api/records` - Add a new patient record
- `GET /api/records/:patientId` - Get all records for a patient

## Authentication

All transactions that modify the blockchain state require an Ethereum account. You can specify the account in the request body:

```json
{
  "account": "0x1234567890123456789012345678901234567890"
}
```

If no account is provided, the first account from the connected Ethereum node will be used.

## Example Usage

### Adding a Doctor

```bash
curl -X POST http://localhost:3000/api/doctors \
  -H "Content-Type: application/json" \
  -d '{"account": "0x1234567890123456789012345678901234567890"}'
```

### Adding a Patient

```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "0x0987654321098765432109876543210987654321",
    "name": "John Doe",
    "account": "0x1234567890123456789012345678901234567890"
  }'
```

### Adding a Patient Record

```bash
curl -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -d '{
    "cid": "QmXgm5QVTy8kYZ3ZiNMZRPKLCCAX3WEFLDNxH1rXvfUMnE",
    "fileName": "medical_report.pdf",
    "patientName": "John Doe",
    "patientId": "0x0987654321098765432109876543210987654321",
    "diagnosis": "Common Cold",
    "treatment": "Rest and fluids",
    "account": "0x1234567890123456789012345678901234567890"
  }'
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in case of failure.

## Next Steps

1. Deploy your smart contract to an Ethereum network
2. Update the contract address in the server.js file
3. Start the server and interact with your contract through the API

## License

MIT

