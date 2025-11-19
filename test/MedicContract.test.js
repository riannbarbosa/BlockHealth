const MedicContract = artifacts.require("MedicContract");
const AdminContract = artifacts.require("AdminContract");

contract("MedicContract", (accounts) => {
  let medicInstance;
  let adminInstance;
  const owner = accounts[0];
  const doctor1 = accounts[1];
  const doctor2 = accounts[2];
  const patient1 = accounts[3];
  const unauthorized = accounts[4];

  beforeEach(async () => {
    // Deploy fresh instances for each test
    medicInstance = await MedicContract.new({ from: owner });
    adminInstance = await AdminContract.new({ from: owner });
    
    // Link contracts
    await medicInstance.setAdminContract(adminInstance.address, { from: owner });
    
    // Register patient in AdminContract
    await adminInstance.registerPatient(
      patient1, 
      "Alice Johnson", 
      "1990-01-01", 
      "1234567890", 
      "Bob Johnson", 
      { from: owner }
    );
    
    // Register and authorize doctor1
    await adminInstance.registerDoctor(
      doctor1, 
      "Dr. Smith", 
      "Cardiology", 
      "LIC001", 
      { from: owner }
    );
  });

  describe("Deployment", () => {
    it("should deploy the MedicContract successfully", async () => {
      assert.ok(medicInstance.address, "Contract address should not be empty");
      assert.notEqual(medicInstance.address, "0x0000000000000000000000000000000000000000", "Contract address should be valid");
    });

    it("should set the deployer as owner", async () => {
      const contractOwner = await medicInstance.owner();
      assert.equal(contractOwner, owner, "Deployer should be the owner");
    });
  });

  describe("Admin Contract Integration", () => {
    it("should set the admin contract address", async () => {
      const newMedicInstance = await MedicContract.new({ from: owner });
      await newMedicInstance.setAdminContract(adminInstance.address, { from: owner });
      
      const adminAddr = await newMedicInstance.adminContract();
      assert.equal(adminAddr, adminInstance.address, "Admin contract address should be set");
    });

    it("should not allow non-owner to set admin contract", async () => {
      const newMedicInstance = await MedicContract.new({ from: owner });
      
      try {
        await newMedicInstance.setAdminContract(adminInstance.address, { from: unauthorized });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert the transaction");
      }
    });
  });

  describe("Doctor Authorization", () => {
    it("should check if a doctor is authorized", async () => {
      const isAuth = await medicInstance.isDoctorAuthorized(doctor1);
      assert.isTrue(isAuth, "Doctor should be authorized through AdminContract");
    });

    it("should return false for unauthorized doctor", async () => {
      const isAuth = await medicInstance.isDoctorAuthorized(unauthorized);
      assert.isFalse(isAuth, "Unauthorized address should not be authorized");
    });

    it("should return false for revoked doctor", async () => {
      // Revoke doctor in AdminContract
      await adminInstance.revokeDoctor(doctor1, { from: owner });
      
      const isAuth = await medicInstance.isDoctorAuthorized(doctor1);
      assert.isFalse(isAuth, "Revoked doctor should not be authorized");
    });
  });

  describe("Medical Records", () => {
    it("should add a medical record by authorized doctor", async () => {
      const tx = await medicInstance.addMedicalRecord(
        "QmTest123CID", 
        "medical_report.pdf", 
        patient1, 
        "Hypertension", 
        "ACE inhibitor medication", 
        { from: doctor1 }
      );

      // Check event
      assert.equal(tx.logs[0].event, "MedicalRecordAdded", "Should emit MedicalRecordAdded event");
      assert.equal(tx.logs[0].args.patientId, patient1, "Event should contain patient ID");
      assert.equal(tx.logs[0].args.doctorId, doctor1, "Event should contain doctor ID");

      // Retrieve records
      const records = await medicInstance.getMedicalRecords(patient1);
      assert.isArray(records, "Records should be an array");
      assert.equal(records.length, 1, "Should have one record");
      assert.equal(records[0].cid, "QmTest123CID", "CID should match");
      assert.equal(records[0].fileName, "medical_report.pdf", "File name should match");
      assert.equal(records[0].diagnosis, "Hypertension", "Diagnosis should match");
      assert.equal(records[0].treatment, "ACE inhibitor medication", "Treatment should match");
      assert.equal(records[0].doctorId, doctor1, "Doctor ID should match");
      assert.isTrue(records[0].isActive, "Record should be active");
    });

    it("should not allow unauthorized person to add medical records", async () => {
      try {
        await medicInstance.addMedicalRecord(
          "QmTest123CID", 
          "report.pdf", 
          patient1, 
          "Diagnosis", 
          "Treatment", 
          { from: unauthorized }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert for unauthorized doctor");
      }
    });

    it("should not allow adding records for inactive patient", async () => {
      // Deactivate patient
      await adminInstance.removePatient(patient1, { from: owner });

      try {
        await medicInstance.addMedicalRecord(
          "QmTest123CID", 
          "report.pdf", 
          patient1, 
          "Diagnosis", 
          "Treatment", 
          { from: doctor1 }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert for inactive patient");
      }
    });

    it("should add multiple medical records", async () => {
      // Add first record
      await medicInstance.addMedicalRecord(
        "QmCID1", 
        "report1.pdf", 
        patient1, 
        "Diagnosis 1", 
        "Treatment 1", 
        { from: doctor1 }
      );

      // Add second record
      await medicInstance.addMedicalRecord(
        "QmCID2", 
        "report2.pdf", 
        patient1, 
        "Diagnosis 2", 
        "Treatment 2", 
        { from: doctor1 }
      );

      const records = await medicInstance.getMedicalRecords(patient1);
      assert.equal(records.length, 2, "Should have two records");
      assert.equal(records[0].cid, "QmCID1", "First record CID should match");
      assert.equal(records[1].cid, "QmCID2", "Second record CID should match");
    });

    it("should get medical record count for a patient", async () => {
      await medicInstance.addMedicalRecord("QmCID1", "report1.pdf", patient1, "Diag1", "Treat1", { from: doctor1 });
      await medicInstance.addMedicalRecord("QmCID2", "report2.pdf", patient1, "Diag2", "Treat2", { from: doctor1 });

      const count = await medicInstance.getMedicalRecordCount(patient1);
      assert.equal(count.toNumber(), 2, "Should have 2 records");
    });

    it("should deactivate a medical record", async () => {
      await medicInstance.addMedicalRecord("QmCID1", "report.pdf", patient1, "Diagnosis", "Treatment", { from: doctor1 });

      const tx = await medicInstance.deactivateMedicalRecord(patient1, 0, { from: doctor1 });

      // Check event
      assert.equal(tx.logs[0].event, "MedicalRecordDeactivated", "Should emit deactivation event");

      const records = await medicInstance.getMedicalRecords(patient1);
      assert.isFalse(records[0].isActive, "Record should be deactivated");
    });

    it("should not allow unauthorized doctor to deactivate records", async () => {
      await medicInstance.addMedicalRecord("QmCID1", "report.pdf", patient1, "Diagnosis", "Treatment", { from: doctor1 });

      // Register another doctor
      await adminInstance.registerDoctor(doctor2, "Dr. Jones", "Neurology", "LIC002", { from: owner });

      try {
        await medicInstance.deactivateMedicalRecord(patient1, 0, { from: doctor2 });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert when different doctor tries to deactivate");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should return empty array for patient with no records", async () => {
      const records = await medicInstance.getMedicalRecords(patient1);
      assert.isArray(records, "Should return an array");
      assert.equal(records.length, 0, "Should be empty");
    });

    it("should not add record with empty CID", async () => {
      try {
        await medicInstance.addMedicalRecord("", "report.pdf", patient1, "Diagnosis", "Treatment", { from: doctor1 });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert for empty CID");
      }
    });

    it("should handle timestamp correctly", async () => {
      await medicInstance.addMedicalRecord("QmCID1", "report.pdf", patient1, "Diagnosis", "Treatment", { from: doctor1 });
      
      const records = await medicInstance.getMedicalRecords(patient1);
      const timestamp = records[0].timestamp.toNumber();
      
      assert.isAbove(timestamp, 0, "Timestamp should be greater than 0");
      assert.isBelow(timestamp, Math.floor(Date.now() / 1000) + 100, "Timestamp should be reasonable");
    });
  });
});