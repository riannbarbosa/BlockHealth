// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract MedicContract {

    address public owner;
    address public adminContract;
    address public patientContract;

    constructor() {
        owner = msg.sender; 
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


    mapping(address => MedicalRecord[]) public patientRecords;
    mapping(address => bool) public authorizedDoctors;

    event RecordAdded(string cid, address patientId, address doctorId);
    event RecordDeactivated(address patientId, uint256 recordIndex);
    event AdminContractUpdated(address newAdminContract);
    event PatientContractUpdated(address newPatientContract);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == adminContract || msg.sender == owner, "Only admin can perform this action");
        _;
    }
      modifier onlyAuthorizedDoctor() {
        require(
            authorizedDoctors[msg.sender],
            "Not an authorized medical provider"
        );
        _;
    }

    modifier patientActive(address patientId) {
        require(_isPatientActive(patientId), "Patient not active");
        _;
    }

    function _isPatientActive(address patientId) private view returns (bool) {
         if(adminContract == address(0)) return false;
        (bool success, bytes memory data) = adminContract.staticcall(
            abi.encodeWithSignature("isPatientActive(address)", patientId)
        );
        return success && abi.decode(data, (bool));
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
    function addMedicalRecord(
        string memory _cid,
        string memory _fileName,
        address _patientId,
        string memory _diagnosis,
        string memory _treatment
    ) public onlyAuthorizedDoctor patientActive(_patientId) {
        patientRecords[_patientId].push(
            MedicalRecord({
                cid: _cid,
                fileName: _fileName,
                patientId: _patientId,
                diagnosis: _diagnosis,
                treatment: _treatment,
                doctorId: msg.sender,
                timestamp: block.timestamp,
                isActive: true
            })
        );
        emit RecordAdded(_cid, _patientId, msg.sender);
    }

   function deactivateRecord(address _patientId, uint256 _recordIndex) public onlyAuthorizedDoctor {
       require(_recordIndex < patientRecords[_patientId].length, "Invalid record index");
        require(
            patientRecords[_patientId][_recordIndex].doctorId == msg.sender,
            "Only record creator can deactivate"
        );
       patientRecords[_patientId][_recordIndex].isActive = false;
       emit RecordDeactivated(_patientId, _recordIndex);
   }

   function getMedicalRecords(address _patientId) public view returns (MedicalRecord[] memory) {
       require(msg.sender == _patientId || msg.sender == adminContract ||  authorizedDoctors[msg.sender], "Unauthorized access");
       return patientRecords[_patientId];
   }

   function getActiveMedicalRecords(address _patientId) public view returns (MedicalRecord[] memory) {
       require(msg.sender == _patientId || msg.sender == patientContract || authorizedDoctors[msg.sender], "Unauthorized access");
       uint256 activeCount = 0;
       MedicalRecord[] storage records = patientRecords[_patientId];

       for (uint256 i = 0; i < records.length; i++) {
           if (records[i].isActive) activeCount++;
       }

       MedicalRecord[] memory activeRecords = new MedicalRecord[](activeCount);
       uint256 currentIndex = 0;

       for (uint256 i = 0; i < records.length; i++) {
            if (records[i].isActive) {
                activeRecords[currentIndex] = records[i];
                currentIndex++;
            }
        }
        
        return activeRecords;
   }

   function isDoctorAuthorized(address _doctorId) public view returns (bool) {
        return authorizedDoctors[_doctorId];
    }

    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Invalid owner address");
        owner = _newOwner;
    }
}