// 3_PatientContract_migration.js
const PatientContract = artifacts.require('PatientContract');
const MedicContract = artifacts.require('MedicContract');
const AdminContract = artifacts.require('AdminContract');

module.exports = async function (deployer) {
  // Get the already deployed contract instances
  const medicInstance = await MedicContract.deployed();
  const adminInstance = await AdminContract.deployed();

  // Deploy PatientContract with the addresses of already deployed contracts
  await deployer.deploy(
    PatientContract,
    medicInstance.address,
    adminInstance.address
  );
  
  const patientInstance = await PatientContract.deployed();
  console.log('PatientContract deployed at:', patientInstance.address);
  console.log('Linked to MedicContract:', medicInstance.address);
  console.log('Linked to AdminContract:', adminInstance.address);
};