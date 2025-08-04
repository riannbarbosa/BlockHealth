const AdminContract = artifacts.require("AdminContract");

contract("AdminContract", (accounts) => {
  let adminInstance;
  const owner = accounts[0];
  const doctor1 = accounts[1];
  const patient1 = accounts[2];

  before(async () => {
    adminInstance = await AdminContract.deployed();
  });

  describe("Deployment", () => {
    it("should deploy the AdminContract", async () => {
      assert.ok(adminInstance.address, "Contract address should not be empty");
    });
  });

  describe("Doctor Management", () => {
    it("should register a doctor", async () => {
      await adminInstance.registerDoctor(doctor1, "Dr. Test", "Cardiology", "LIC123", { from: owner });
      const doctor = await adminInstance.doctors(doctor1);
      assert.equal(doctor.id, doctor1, "Doctor ID should match");
      assert.equal(doctor.name, "Dr. Test", "Doctor name should match");
      assert.isTrue(doctor.isAuthorized, "Doctor should be authorized");
    });
  });

  describe("Patient Management", () => {
    it("should register a patient", async () => {
      await adminInstance.registerPatient(patient1, "Alice", "1990-01-01", "1234567890", "Bob", { from: owner });
      const patient = await adminInstance.patients(patient1);
      assert.equal(patient.id, patient1, "Patient ID should match");
      assert.equal(patient.name, "Alice", "Patient name should match");
      assert.isTrue(patient.isActive, "Patient should be active");
    });
  });
});
