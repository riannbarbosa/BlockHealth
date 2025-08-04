// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract PatientContract {
    address public medicContract;
    address public adminContract;

    constructor(address _medicContract, address _adminContract) {
        medicContract = _medicContract;
        adminContract = _adminContract;
    }

    struct MedicalRecord {
        string cid;
        string fileName;
        address patientId;
        string diagnosis;
        string treatment;
        address doctorId;
        uint256 timestamp;
        bool isActive;
    }

    struct SelfUploadedRecord {
        string cid;
        string fileName;
        string recordType;
        string description;
        uint256 timestamp;
        bool isEncrypted;
    }

    struct PatientProfile {
        string name;
        string email;
        string phoneNumber;
        bool profileCompleted;
        uint256 lastUpdated;
    }

    mapping(address => SelfUploadedRecord[]) public patientSelfRecords;
    mapping(address => PatientProfile) public patientProfiles;

    event SelfRecordUploaded(address indexed patientId, string cid, string fileName);
    event ProfileUpdated(address indexed patientId);
    event PatientRegistered(address indexed patientId);

    modifier onlyPatient() {
        require(isPatientRegistered(msg.sender), "Patient not registered");
        _;
    }

    modifier onlyValidPatient(address patientId) {
        require(isPatientRegistered(patientId), "Patient not registered");
        _;
    }

    modifier onlyPatientOrDoctor(address patientId) {
        require(
            msg.sender == patientId || 
            isDoctorAuthorized(msg.sender),
            "Not authorized"
        );
        _;
    }


    // Doctor authorization check
    function isDoctorAuthorized(address caller) public view returns (bool) {
        if (medicContract != address(0)) {
            (bool success, bytes memory data) = medicContract.staticcall(
                abi.encodeWithSignature("isDoctorAuthorized(address)", caller)
            );
            return success && abi.decode(data, (bool));
        }
        return false;
    }
    // Check if patient is registered in the admin contract
    function isPatientRegistered(address patientId) public view returns (bool) {
            (bool success, bytes memory data) = adminContract.staticcall(
                abi.encodeWithSignature("isPatientActive(address)", patientId)
            );
        return success && abi.decode(data, (bool));
    }

    function _isPatientActiveInAdmin(address patientId) private view returns (bool) {
        if (adminContract != address(0)) {
            (bool success, bytes memory data) = adminContract.staticcall(
                abi.encodeWithSignature("isPatientActive(address)", patientId)
            );
            return success && abi.decode(data, (bool));
        }
        return false;
    }


    // Update patient profile
    function updateProfile(
        string memory _name,
        string memory _email,
        string memory _phoneNumber
    ) public onlyPatient {
        patientProfiles[msg.sender].name = _name;
        patientProfiles[msg.sender].email = _email;
        patientProfiles[msg.sender].phoneNumber = _phoneNumber;
        patientProfiles[msg.sender].lastUpdated = block.timestamp;
        
        emit ProfileUpdated(msg.sender);
    }

    // Upload medical record by patient themselves
    function uploadSelfRecord(
        string memory _cid,
        string memory _fileName,
        string memory _recordType,
        string memory _description
    ) public onlyPatient {
        require(bytes(_cid).length > 0, "CID cannot be empty");
        require(bytes(_fileName).length > 0, "File name cannot be empty");
        
        SelfUploadedRecord memory newRecord = SelfUploadedRecord({
            cid: _cid,
            fileName: _fileName,
            recordType: _recordType,
            description: _description,
            timestamp: block.timestamp,
            isEncrypted: true
        });
        
        patientSelfRecords[msg.sender].push(newRecord);
        
        emit SelfRecordUploaded(msg.sender, _cid, _fileName);
    }

    // Get all self-uploaded records for a patient
    function getMySelfRecords() public view onlyPatient returns (SelfUploadedRecord[] memory) {
        return patientSelfRecords[msg.sender];
    }

    // Get specific self-uploaded record
    function getMySelfRecord(uint256 _index) public view onlyPatient returns (SelfUploadedRecord memory) {
        require(_index < patientSelfRecords[msg.sender].length, "Record index out of bounds");
        return patientSelfRecords[msg.sender][_index];
    }

    // Get all medical records from main contract (doctor-uploaded records)
    function getMyMedicalRecords() public view onlyPatient returns (MedicalRecord[] memory) {
        require(medicContract != address(0), "Main contract not set");

        (bool success, bytes memory data) = medicContract.staticcall(
            abi.encodeWithSignature("getActiveMedicalRecords(address)", msg.sender)
        );
        
        require(success, "Failed to fetch medical records");
        return abi.decode(data, (MedicalRecord[]));
    }

    // Get patient profile
    function getMyProfile() public view onlyPatient returns (PatientProfile memory) {
        return patientProfiles[msg.sender];
    }

    // Get patient profile by address (for authorized access)
    function getPatientProfile(address patientId) public view onlyValidPatient(patientId) returns (PatientProfile memory) {
        // This could be restricted to doctors or admin in a more complex system
        return patientProfiles[patientId];
    }

    // Get count of self-uploaded records
    function getMySelfRecordCount() public view onlyPatient returns (uint256) {
        return patientSelfRecords[msg.sender].length;
    }

    // Delete a self-uploaded record
    function deleteSelfRecord(uint256 _index) public onlyPatient {
        require(_index < patientSelfRecords[msg.sender].length, "Record index out of bounds");
        
        // Move the last element to the deleted position and pop
        uint256 lastIndex = patientSelfRecords[msg.sender].length - 1;
        if (_index != lastIndex) {
            patientSelfRecords[msg.sender][_index] = patientSelfRecords[msg.sender][lastIndex];
        }
        patientSelfRecords[msg.sender].pop();
    }

    // Update a self-uploaded record
    function updateSelfRecord(
        uint256 _index,
        string memory _recordType,
        string memory _description
    ) public onlyPatient {
        require(_index < patientSelfRecords[msg.sender].length, "Record index out of bounds");
        
        patientSelfRecords[msg.sender][_index].recordType = _recordType;
        patientSelfRecords[msg.sender][_index].description = _description;
    }

    // Emergency function to verify patient identity
    function verifyPatientIdentity(address patientId) public view returns (bool, string memory) {
        if (isPatientRegistered(patientId)) {
            return (true, patientProfiles[patientId].name);
        }
        return (false, "");
    }

    // Admin functions (can be called by contract admin)
    function updateMedicContract(address _newContract) public {
        require(msg.sender == adminContract, "Only admin can update");
        medicContract = _newContract;
    }

    function updateAdminContract(address _newContract) public {
        require(msg.sender == adminContract, "Only admin can update");
        adminContract = _newContract;
    }

    // Get all self-uploaded records for a patient (for admin/doctor access)
    function getPatientSelfRecords(address patientId) public view 
        onlyValidPatient(patientId)
        onlyPatientOrDoctor(patientId)
        returns (SelfUploadedRecord[] memory)
    {
        return patientSelfRecords[patientId];
    }
}