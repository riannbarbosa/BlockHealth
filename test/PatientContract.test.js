
const PatientContract = artifacts.require("PatientContract");
const AdminContract = artifacts.require("AdminContract");

contract("PatientContract", (accounts) => {
  let patientInstance;
  let adminInstance;
  const medicContract = accounts[1];
  const patient1 = accounts[3];

  before(async () => {
    adminInstance = await AdminContract.deployed();
    // Register patient in AdminContract so PatientContract recognizes them
    await adminInstance.registerPatient(patient1, "Alice", "1990-01-01", "1234567890", "Bob", { from: accounts[0] });
    patientInstance = await PatientContract.deployed(medicContract, adminInstance.address);
  });

  describe("Deployment", () => {
    it("should deploy the PatientContract", async () => {
      assert.ok(patientInstance.address, "Contract address should not be empty");
    });
  });

  describe("Profile Management", () => {
    it("should update patient profile", async () => {
      await patientInstance.updateProfile("Alice", "alice@email.com", "1234567890", { from: patient1 });
      const profile = await patientInstance.getMyProfile({ from: patient1 });
      assert.equal(profile.name, "Alice", "Profile name should match");
      assert.equal(profile.email, "alice@email.com", "Profile email should match");
    });
  });

  describe("Self Record Upload", () => {
    it("should upload a self medical record", async () => {
      await patientInstance.uploadSelfRecord("CID2", "file2.pdf", "TypeA", "Desc", { from: patient1 });
      const records = await patientInstance.getMySelfRecords({ from: patient1 });
      assert.isArray(records, "Self records should be an array");
      assert.equal(records.length, 1, "Should have one self record");
      assert.equal(records[0].cid, "CID2", "CID should match");
    });
  });
});
