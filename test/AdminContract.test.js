const AdminContract = artifacts.require("AdminContract");

contract("AdminContract", (accounts) => {
  let adminInstance;
  const owner = accounts[0];
  const doctor1 = accounts[1];
  const doctor2 = accounts[2];
  const patient1 = accounts[3];
  const patient2 = accounts[4];
  const unauthorized = accounts[5];

  beforeEach(async () => {
    // Deploy a fresh instance for each test to avoid state pollution
    adminInstance = await AdminContract.new({ from: owner });
  });

  describe("Deployment", () => {
    it("should deploy the AdminContract successfully", async () => {
      assert.ok(adminInstance.address, "Contract address should not be empty");
      assert.notEqual(adminInstance.address, "0x0000000000000000000000000000000000000000", "Contract address should be valid");
    });

    it("should set the deployer as the owner", async () => {
      const contractOwner = await adminInstance.owner();
      assert.equal(contractOwner, owner, "Deployer should be the contract owner");
    });
  });

  describe("Doctor Management", () => {
    it("should register a doctor successfully", async () => {
      const tx = await adminInstance.registerDoctor(
        doctor1, 
        "Dr. John Smith", 
        "Cardiology", 
        "LIC123456", 
        { from: owner }
      );

      const doctor = await adminInstance.doctors(doctor1);
      assert.equal(doctor.id, doctor1, "Doctor ID should match");
      assert.equal(doctor.name, "Dr. John Smith", "Doctor name should match");
      assert.equal(doctor.specialization, "Cardiology", "Doctor specialization should match");
      assert.equal(doctor.licenseNumber, "LIC123456", "License number should match");
      assert.isTrue(doctor.isAuthorized, "Doctor should be authorized");

      // Check if event was emitted
      assert.equal(tx.logs.length, 1, "Should emit one event");
      assert.equal(tx.logs[0].event, "DoctorRegistered", "Should emit DoctorRegistered event");
      assert.equal(tx.logs[0].args.doctorId, doctor1, "Event should contain correct doctor ID");
    });

    it("should not allow non-owner to register a doctor", async () => {
      try {
        await adminInstance.registerDoctor(
          doctor1, 
          "Dr. Test", 
          "Cardiology", 
          "LIC123", 
          { from: unauthorized }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert the transaction");
      }
    });

    it("should revoke a doctor's authorization", async () => {
      // First register the doctor
      await adminInstance.registerDoctor(doctor1, "Dr. Test", "Cardiology", "LIC123", { from: owner });
      
      // Then revoke
      const tx = await adminInstance.revokeDoctor(doctor1, { from: owner });
      
      const doctor = await adminInstance.doctors(doctor1);
      assert.isFalse(doctor.isAuthorized, "Doctor should no longer be authorized");

      // Check event
      assert.equal(tx.logs[0].event, "DoctorRevoked", "Should emit DoctorRevoked event");
    });

    it("should not allow revoking a non-existent doctor", async () => {
      try {
        await adminInstance.revokeDoctor(doctor2, { from: owner });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert the transaction");
      }
    });

    it("should retrieve all doctors", async () => {
      await adminInstance.registerDoctor(doctor1, "Dr. Smith", "Cardiology", "LIC001", { from: owner });
      await adminInstance.registerDoctor(doctor2, "Dr. Jones", "Neurology", "LIC002", { from: owner });

      const doctorAddresses = await adminInstance.getAllDoctors();
      assert.equal(doctorAddresses.length, 2, "Should return 2 doctors");
      assert.include(doctorAddresses, doctor1, "Should include doctor1");
      assert.include(doctorAddresses, doctor2, "Should include doctor2");
    });
  });

  describe("Patient Management", () => {
    it("should register a patient successfully", async () => {
      const tx = await adminInstance.registerPatient(
        patient1, 
        "Alice Johnson", 
        "1990-01-01", 
        "1234567890", 
        "Bob Johnson - 0987654321", 
        { from: owner }
      );

      const patient = await adminInstance.patients(patient1);
      assert.equal(patient.id, patient1, "Patient ID should match");
      assert.equal(patient.name, "Alice Johnson", "Patient name should match");
      assert.equal(patient.dateOfBirth, "1990-01-01", "Date of birth should match");
      assert.equal(patient.phoneNumber, "1234567890", "Phone number should match");
      assert.equal(patient.emergencyContact, "Bob Johnson - 0987654321", "Emergency contact should match");
      assert.isTrue(patient.isActive, "Patient should be active");

      // Check event
      assert.equal(tx.logs[0].event, "PatientRegistered", "Should emit PatientRegistered event");
    });

    it("should not allow non-owner to register a patient", async () => {
      try {
        await adminInstance.registerPatient(
          patient1, 
          "Alice", 
          "1990-01-01", 
          "1234567890", 
          "Bob", 
          { from: unauthorized }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert the transaction");
      }
    });

    it("should deactivate a patient", async () => {
      // First register the patient
      await adminInstance.registerPatient(patient1, "Alice", "1990-01-01", "1234567890", "Bob", { from: owner });
      
      // Then remove (deactivate)
      const tx = await adminInstance.removePatient(patient1, { from: owner });
      
      const patient = await adminInstance.patients(patient1);
      assert.isFalse(patient.isActive, "Patient should no longer be active");

      // Check event
      assert.equal(tx.logs[0].event, "PatientRemoved", "Should emit PatientRemoved event");
    });

    it("should not allow removing a non-existent patient", async () => {
      try {
        await adminInstance.removePatient(patient2, { from: owner });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert the transaction");
      }
    });

    it("should retrieve all patients", async () => {
      await adminInstance.registerPatient(patient1, "Alice", "1990-01-01", "1234567890", "Bob", { from: owner });
      await adminInstance.registerPatient(patient2, "Charlie", "1985-05-15", "5555555555", "David", { from: owner });

      const patientAddresses = await adminInstance.getAllPatients();
      assert.equal(patientAddresses.length, 2, "Should return 2 patients");
      assert.include(patientAddresses, patient1, "Should include patient1");
      assert.include(patientAddresses, patient2, "Should include patient2");
    });

    it("should check if a patient is active", async () => {
      await adminInstance.registerPatient(patient1, "Alice", "1990-01-01", "1234567890", "Bob", { from: owner });
      
      const isActive = await adminInstance.isPatientActive(patient1);
      assert.isTrue(isActive, "Patient should be active");

      // Deactivate and check again
      await adminInstance.removePatient(patient1, { from: owner });
      const isStillActive = await adminInstance.isPatientActive(patient1);
      assert.isFalse(isStillActive, "Patient should no longer be active");
    });
  });

  describe("Edge Cases", () => {
    it("should not register a doctor with empty name", async () => {
      try {
        await adminInstance.registerDoctor(doctor1, "", "Cardiology", "LIC123", { from: owner });
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert the transaction");
      }
    });

    it("should not register a patient with invalid address", async () => {
      try {
        await adminInstance.registerPatient(
          "0x0000000000000000000000000000000000000000", 
          "Alice", 
          "1990-01-01", 
          "1234567890", 
          "Bob", 
          { from: owner }
        );
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.include(error.message, "revert", "Should revert the transaction");
      }
    });
  });
});