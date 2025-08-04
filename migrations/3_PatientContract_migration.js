// 3_PatientContract_migration.js
const PatientContract = artifacts.require('PatientContract')
const MedicContract = artifacts.require('MedicContract')
const AdminContract = artifacts.require('AdminContract')

module.exports = function (deployer) {
  deployer.deploy(PatientContract, MedicContract.address, AdminContract.address)
}