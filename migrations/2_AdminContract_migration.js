const AdminContract = artifacts.require('AdminContract');
const MedicContract = artifacts.require('MedicContract');

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(AdminContract);
  const admin = await AdminContract.deployed();

  const medic = await MedicContract.deployed();

  await medic.setAdminContract(admin.address, { from: accounts[0] });
};
