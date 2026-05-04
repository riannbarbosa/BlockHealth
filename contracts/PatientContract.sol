// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract PatientContract {
    error PatientNotRegistered();
    error NotAuthorized();
    error EmptyCID();
    error EmptyFileName();
    error RecordIndexOutOfBounds();
    error MedicContractNotSet();
    error FetchRecordsFailed();
    error OnlyAdmin();

    address public medicContract;
    address public adminContract;

    constructor(address _medicContract, address _adminContract) {
        medicContract = _medicContract;
        adminContract = _adminContract;
    }

    // Struct com mesmo layout do MedicContract para decode ABI
    struct MedicalRecord {
        string cid;
        string fileName;
        string diagnosis;
        string treatment;
        address patientId;   // 20 bytes \
        uint96 timestamp;    // 12 bytes / = 32 bytes (1 slot)
        address doctorId;    // 20 bytes \
        bool isActive;       // 1 byte   / = 21 bytes (1 slot)
    }

    // Struct packing
    struct SelfUploadedRecord {
        string cid;
        string fileName;
        string recordType;
        string description;
        uint96 timestamp;    // 12 bytes \
        bool isEncrypted;    // 1 byte   / = 13 bytes (1 slot)
    }

    struct PatientProfile {
        string name;
        string email;
        string phoneNumber;
        uint96 lastUpdated;      // 12 bytes \
        bool profileCompleted;   // 1 byte   / = 13 bytes (1 slot)
    }

    mapping(address => SelfUploadedRecord[]) public patientSelfRecords;
    mapping(address => PatientProfile) public patientProfiles;

    event SelfRecordUploaded(address indexed patientId, string cid, string fileName);
    event ProfileUpdated(address indexed patientId);
    event PatientRegistered(address indexed patientId);

    modifier onlyPatient() {
        if (!isPatientRegistered(msg.sender)) revert PatientNotRegistered();
        _;
    }

    modifier onlyValidPatient(address patientId) {
        if (!isPatientRegistered(patientId)) revert PatientNotRegistered();
        _;
    }

    modifier onlyPatientOrDoctor(address patientId) {
        if (msg.sender != patientId && !isDoctorAuthorized(msg.sender)) revert NotAuthorized();
        _;
    }

    function isDoctorAuthorized(address caller) public view returns (bool) {
        if (medicContract != address(0)) {
            (bool success, bytes memory data) = medicContract.staticcall(
                abi.encodeWithSignature("isDoctorAuthorized(address)", caller)
            );
            return success && abi.decode(data, (bool));
        }
        return false;
    }

    function isPatientRegistered(address patientId) public view returns (bool) {
        (bool success, bytes memory data) = adminContract.staticcall(
            abi.encodeWithSignature("isPatientActive(address)", patientId)
        );
        return success && abi.decode(data, (bool));
    }

    function updateProfile(
        string calldata _name,
        string calldata _email,
        string calldata _phoneNumber
    ) public onlyPatient {
        PatientProfile storage profile = patientProfiles[msg.sender];
        profile.name = _name;
        profile.email = _email;
        profile.phoneNumber = _phoneNumber;
        profile.lastUpdated = uint96(block.timestamp);
        
        emit ProfileUpdated(msg.sender);
    }

    function uploadSelfRecord(
        string calldata _cid,
        string calldata _fileName,
        string calldata _recordType,
        string calldata _description
    ) public onlyPatient {
        if (bytes(_cid).length == 0) revert EmptyCID();
        if (bytes(_fileName).length == 0) revert EmptyFileName();
        
        patientSelfRecords[msg.sender].push(SelfUploadedRecord({
            cid: _cid,
            fileName: _fileName,
            recordType: _recordType,
            description: _description,
            timestamp: uint96(block.timestamp),
            isEncrypted: true
        }));
        
        emit SelfRecordUploaded(msg.sender, _cid, _fileName);
    }

    function getMySelfRecords() public view onlyPatient returns (SelfUploadedRecord[] memory) {
        return patientSelfRecords[msg.sender];
    }

    function getMySelfRecord(uint256 _index) public view onlyPatient returns (SelfUploadedRecord memory) {
        if (_index >= patientSelfRecords[msg.sender].length) revert RecordIndexOutOfBounds();
        return patientSelfRecords[msg.sender][_index];
    }

    function getMyMedicalRecords() public view onlyPatient returns (MedicalRecord[] memory) {
        if (medicContract == address(0)) revert MedicContractNotSet();

        (bool success, bytes memory data) = medicContract.staticcall(
            abi.encodeWithSignature("getActiveMedicalRecords(address)", msg.sender)
        );
        
        if (!success) revert FetchRecordsFailed();
        return abi.decode(data, (MedicalRecord[]));
    }

    function getMyProfile() public view onlyPatient returns (PatientProfile memory) {
        return patientProfiles[msg.sender];
    }

    function getPatientProfile(address patientId) public view onlyValidPatient(patientId) returns (PatientProfile memory) {
        return patientProfiles[patientId];
    }

    function getMySelfRecordCount() public view onlyPatient returns (uint256) {
        return patientSelfRecords[msg.sender].length;
    }

    function deleteSelfRecord(uint256 _index) public onlyPatient {
        SelfUploadedRecord[] storage records = patientSelfRecords[msg.sender];
        if (_index >= records.length) revert RecordIndexOutOfBounds();
        
        uint256 lastIndex = records.length - 1;
        if (_index != lastIndex) {
            records[_index] = records[lastIndex];
        }
        records.pop();
    }

    function updateSelfRecord(
        uint256 _index,
        string calldata _recordType,
        string calldata _description
    ) public onlyPatient {
        if (_index >= patientSelfRecords[msg.sender].length) revert RecordIndexOutOfBounds();
        
        SelfUploadedRecord storage record = patientSelfRecords[msg.sender][_index];
        record.recordType = _recordType;
        record.description = _description;
    }

    function verifyPatientIdentity(address patientId) public view returns (bool, string memory) {
        if (isPatientRegistered(patientId)) {
            return (true, patientProfiles[patientId].name);
        }
        return (false, "");
    }

    function updateMedicContract(address _newContract) public {
        if (msg.sender != adminContract) revert OnlyAdmin();
        medicContract = _newContract;
    }

    function updateAdminContract(address _newContract) public {
        if (msg.sender != adminContract) revert OnlyAdmin();
        adminContract = _newContract;
    }

    function getPatientSelfRecords(address patientId) public view 
        onlyValidPatient(patientId)
        onlyPatientOrDoctor(patientId)
        returns (SelfUploadedRecord[] memory)
    {
        return patientSelfRecords[patientId];
    }
}