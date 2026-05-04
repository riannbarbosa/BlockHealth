// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract MedicContract {

    // Custom errors - muito mais baratos que strings em require (~200 gas/char)
    error OnlyOwner();
    error OnlyAdmin();
    error NotAuthorizedDoctor();
    error PatientNotActive();
    error AdminContractNotSet();
    error AdminCallFailed();
    error DoctorNotAuthorized();
    error InvalidRecordIndex();
    error OnlyRecordCreator();
    error UnauthorizedAccess();
    error InvalidOwnerAddress();

    address public owner;
    address public adminContract;
    address public patientContract;

    constructor() {
        owner = msg.sender; 
    }

    // Struct packing: agrupa campos menores no mesmo slot de 32 bytes
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

    mapping(address => MedicalRecord[]) public patientRecords;
    mapping(address => bool) public authorizedDoctors;

    mapping(address => address[]) private doctorPatients;
    mapping(address => mapping(address => bool)) private doctorHasPatient;

    event RecordAdded(string cid, address patientId, address doctorId);
    event RecordDeactivated(address patientId, uint256 recordIndex);
    event AdminContractUpdated(address newAdminContract);
    event PatientContractUpdated(address newPatientContract);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != adminContract && msg.sender != owner) revert OnlyAdmin();
        _;
    }

    modifier onlyAuthorizedDoctor() {
        if (!authorizedDoctors[msg.sender]) revert NotAuthorizedDoctor();
        _;
    }

    modifier patientActive(address _patientId) {
        if (!_isPatientActive(_patientId)) revert PatientNotActive();
        _;
    }

    function _isPatientActive(address _patientId) private view returns (bool) {
        if (adminContract == address(0)) revert AdminContractNotSet();

        (bool success, bytes memory data) = adminContract.staticcall(
            abi.encodeWithSignature("isPatientActive(address)", _patientId)
        );

        if (!success) revert AdminCallFailed();

        return abi.decode(data, (bool));
    }

    function setAdminContract(address _adminContract) public onlyOwner {
        adminContract = _adminContract;
        emit AdminContractUpdated(_adminContract);
    }

    function setPatientContract(address _patientContract) public onlyOwner {
        patientContract = _patientContract;
        emit PatientContractUpdated(_patientContract);
    }

    function authorizeDoctor(address _doctorId) public onlyAdmin {
        authorizedDoctors[_doctorId] = true;
    }

    function revokeDoctor(address _doctorId) public onlyAdmin {
        authorizedDoctors[_doctorId] = false;
    }

    // calldata em vez de memory para strings = menos cópia de dados
    function addMedicalRecordByAdmin(
        string calldata _cid,
        string calldata _fileName,
        address _patientId,
        string calldata _diagnosis,
        string calldata _treatment,
        address _doctorId
    ) public onlyAdmin patientActive(_patientId) {
        if (!authorizedDoctors[_doctorId]) revert DoctorNotAuthorized();
        
        patientRecords[_patientId].push(
            MedicalRecord({
                cid: _cid,
                fileName: _fileName,
                patientId: _patientId,
                diagnosis: _diagnosis,
                treatment: _treatment,
                doctorId: _doctorId,
                timestamp: uint96(block.timestamp),
                isActive: true
            })
        );

        if (!doctorHasPatient[_doctorId][_patientId]) {
            doctorPatients[_doctorId].push(_patientId);
            doctorHasPatient[_doctorId][_patientId] = true;
        }

        emit RecordAdded(_cid, _patientId, _doctorId);
    }

    function deactivateRecordByAdmin( 
        address _patientId,
        uint256 _recordIndex,
        address _doctorId
    ) public onlyAuthorizedDoctor patientActive(_patientId) {
        if (_recordIndex >= patientRecords[_patientId].length) revert InvalidRecordIndex();
        if (patientRecords[_patientId][_recordIndex].doctorId != _doctorId) revert OnlyRecordCreator();
        patientRecords[_patientId][_recordIndex].isActive = false;
        emit RecordDeactivated(_patientId, _recordIndex);
    }

    function getMedicalRecords(address _patientId) public view returns (MedicalRecord[] memory) {
        if (
            msg.sender != _patientId &&
            msg.sender != adminContract &&
            msg.sender != owner &&
            !authorizedDoctors[msg.sender]
        ) revert UnauthorizedAccess();
        return patientRecords[_patientId];
    }

    function getDoctorPatients(address _doctorId) 
        public 
        view 
        returns (address[] memory) 
    {
        if (msg.sender != _doctorId && msg.sender != adminContract) revert UnauthorizedAccess();
        return doctorPatients[_doctorId];
    }

    function getActiveMedicalRecords(address _patientId) public view returns (MedicalRecord[] memory) {
        if (
            msg.sender != _patientId &&
            msg.sender != patientContract &&
            msg.sender != owner &&
            !authorizedDoctors[msg.sender]
        ) revert UnauthorizedAccess();

        MedicalRecord[] storage records = patientRecords[_patientId];
        uint256 len = records.length;
        uint256 activeCount;

        // unchecked { ++i } economiza ~60 gas por iteração (sem overflow check)
        for (uint256 i; i < len; ) {
            if (records[i].isActive) {
                unchecked { ++activeCount; }
            }
            unchecked { ++i; }
        }

        MedicalRecord[] memory activeRecords = new MedicalRecord[](activeCount);
        uint256 currentIndex;

        for (uint256 i; i < len; ) {
            if (records[i].isActive) {
                activeRecords[currentIndex] = records[i];
                unchecked { ++currentIndex; }
            }
            unchecked { ++i; }
        }
        
        return activeRecords;
    }

    function isDoctorAuthorized(address _doctorId) public view returns (bool) {
        return authorizedDoctors[_doctorId];
    }

    function transferOwnership(address _newOwner) public onlyOwner {
        if (_newOwner == address(0)) revert InvalidOwnerAddress();
        owner = _newOwner;
    }
}