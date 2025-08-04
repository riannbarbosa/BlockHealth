const MedicContract = artifacts.require('MedicContract')

module.exports = function (deployer) {
  deployer.deploy(MedicContract)
}
