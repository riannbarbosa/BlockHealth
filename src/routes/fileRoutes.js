const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()

const { uploadToIPFS, downloadFromIPFS } = require('../ipfs/ipfs')
const { isValidAddress } = require('../utils/contractUtils')

let adminContract
let medicContract

const initializeContracts = contracts => {
  adminContract = contracts.adminContract
  medicContract = contracts.medicContract
}

// fora da rota, perto do topo do arquivo
const roleValidators = {
  doctor: async requesterId => {
    const ok = await medicContract.isDoctorAuthorized(requesterId)
    if (!ok) throw { status: 403, message: 'Médico não autorizado' }
  },
  patient: async requesterId => {
    const isActive = await adminContract.isPatientActive(requesterId)
    if (!isActive) throw { status: 403, message: 'Paciente inativo' }
  },
  admin: async () => {
    if (!adminContract) throw { status: 500, message: 'Contract not initialized' }
  },
}
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads')
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext)
    cb(null, `${name}_${timestamp}${ext}`)
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and documents are allowed.'))
    }
  },
})

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File management endpoints for medical records
 */

/**
 * @swagger
 * /api/files/download/{cid}:
 *   get:
 *     summary: Download a file from IPFS
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: cid
 *         required: true
 *         schema:
 *           type: string
 *         description: IPFS Content ID
 *       - in: query
 *         name: requesterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ethereum address de quem está fazendo o download
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [doctor, patient, admin]
 *         description: Papel do solicitante
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Patient ID para descriptografia (obrigatório para arquivos criptografados)
 *       - in: query
 *         name: encrypted
 *         schema:
 *           type: boolean
 *         description: Se o arquivo está criptografado
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Not authorized
 *       404:
 *         description: File not found
 *       500:
 *         description: Download failed
 */
router.get('/download/:cid', async (req, res) => {
  try {
    const { cid } = req.params
    const { patientId, encrypted = 'false', filename, requesterId, role } = req.query
    const isEncrypted = encrypted === 'true' || encrypted === true

    if (!cid) {
      return res.status(400).json({
        success: false,
        message: 'CID is required',
      })
    }

    if (!requesterId || !role) {
      return res.status(400).json({
        success: false,
        message: 'requesterId e role são obrigatórios',
      })
    }

    if (!isValidAddress(requesterId)) {
      return res.status(400).json({
        success: false,
        message: 'requesterId inválido',
      })
    }

    const validator = roleValidators[role]
    if (!validator) {
      return res.status(403).json({ success: false, message: 'Role inválido' })
    }
    try {
      await validator(requesterId)
    } catch (error) {
      return res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' })
    }
    // Validate patient ID if file is encrypted
    if (isEncrypted) {
      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: 'Patient ID is required for encrypted files',
        })
      }
      if (!isValidAddress(patientId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Ethereum address for patientId',
        })
      }
    }

    // Download from IPFS
    const fileBuffer = await downloadFromIPFS(cid, patientId, isEncrypted)

    // Set appropriate headers
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename || `file_${cid.substring(0, 8)}`}"`,
    })

    res.send(fileBuffer)
  } catch (error) {
    console.error('Error downloading file:', error)

    let statusCode = 500
    let message = 'Failed to download file'

    if (error.message.includes('not found') || error.message.includes('timeout')) {
      statusCode = 404
      message = 'File not found or unavailable'
    } else if (error.message.includes('Decryption failed')) {
      statusCode = 400
      message = 'Failed to decrypt file - invalid patient ID or corrupted file'
    }

    res.status(statusCode).json({
      success: false,
      message,
      error: error.message,
    })
  }
})

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
      })
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + error.message,
    })
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  next(error)
})

module.exports = router
module.exports.initializeContracts = initializeContracts
