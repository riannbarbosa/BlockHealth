
const MedicContract = artifacts.require("MedicContract");
const AdminContract = artifacts.require("AdminContract");

contract("MedicContract", (accounts) => {
  let medicInstance;
  let adminInstance;
  const owner = accounts[0];
  const doctor1 = accounts[2];
  const patient1 = accounts[3];

  before(async () => {
    adminInstance = await AdminContract.deployed();
    medicInstance = await MedicContract.deployed();
    await medicInstance.setAdminContract(adminInstance.address, { from: owner });
    // Register patient in AdminContract so MedicContract can add records
    await adminInstance.registerPatient(patient1, "Alice", "1990-01-01", "1234567890", "Bob", { from: owner });
  });

  describe("Deployment", () => {
    it("should deploy the MedicContract", async () => {
      assert.ok(medicInstance.address, "Contract address should not be empty");
    });
  });

  describe("Doctor Authorization", () => {
    it("should authorize a doctor", async () => {
      await medicInstance.authorizeDoctor(doctor1, { from: owner });
      const isAuth = await medicInstance.isDoctorAuthorized(doctor1);
      assert.isTrue(isAuth, "Doctor should be authorized");
    });
  });

  describe("Medical Records", () => {
    it("should add a medical record for a patient", async () => {
      await medicInstance.authorizeDoctor(doctor1, { from: owner });
      await medicInstance.addMedicalRecord("CID1", "file.pdf", patient1, "Diagnosis", "Treatment", { from: doctor1 });
      const records = await medicInstance.getMedicalRecords(patient1, { from: doctor1 });
      assert.isArray(records, "Records should be an array");
      assert.equal(records.length, 1, "Should have one record");
      assert.equal(records[0].cid, "CID1", "CID should match");
    });
  });
});
