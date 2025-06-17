const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

// Create a mock app for testing
const app = express();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Healthcare Manager API',
      version: '1.0.0',
      description: 'API for interacting with the Healthcare Manager smart contract using ethers.js',
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

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running'
  });
});

// Add mock endpoints for testing
app.post('/api/doctors', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Doctor registered successfully (mock)',
    transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  });
});

app.get('/api/patients', (req, res) => {
  res.status(200).json({
    success: true,
    patients: [
      {
        id: '0x1234567890123456789012345678901234567890',
        name: 'John Doe'
      },
      {
        id: '0x0987654321098765432109876543210987654321',
        name: 'Jane Smith'
      }
    ]
  });
});

app.get('/api/records/0x1234567890123456789012345678901234567890', (req, res) => {
  res.status(200).json({
    success: true,
    records: [
      {
        cid: 'QmXgm5QVTy8kYZ3ZiNMZRPKLCCAX3WEFLDNxH1rXvfUMnE',
        fileName: 'medical_report.pdf',
        patientName: 'John Doe',
        patientId: '0x1234567890123456789012345678901234567890',
        diagnosis: 'Common Cold',
        treatment: 'Rest and fluids',
        doctorId: '0x0987654321098765432109876543210987654321',
        timestamp: '1623456789'
      }
    ]
  });
});

// Set the port
const port = process.env.PORT || 3000;

// Start the server
app.listen(port, () => {
  console.log(`Test server is running at http://localhost:${port}`);
  console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
  console.log(`Health check endpoint: http://localhost:${port}/health`);
  console.log('Note: This is a test server with mock endpoints. For full functionality, run index.js with a connected Ethereum node.');
});

