// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract HManager {

 address public owner;

    constructor() {
        owner = msg.sender; // Set deployer as owner
    }

    struct Record {
        string cid;
        string fileName;
        string patientName;
        address patientId;
        string diagnosis;
        string treatment;
        address doctorId;
        uint256 timestamp;
    }

    struct Patient {
        address id;
        string name;
        Record[] records;
    }


    struct PatientInfo {    
        address id;
        string name;
    }
    struct Doctor {
        address id;
        bool isAuthorized;
    }

    mapping(address => Patient) public patients;
    mapping(address => Doctor) public doctors;
    address[] public patientList;

    event PatientAdded(address patientId);
    event PatientRemoved(address patientId);
    event DoctorAdded(address doctorId);
    event DoctorRemoved(address doctorId);
    event RecordAdded(string cid, address patientId, address doctorId); 

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    modifier patientExists(address patientId) {
        require(patients[patientId].id == patientId, "Patient does not exist");
        _;
    }

    modifier onlyAuthProvider() {
       require(doctors[msg.sender].isAuthorized, "Not an authorized provider");
        _;
    }


    function addPatient(address _patientId, string memory name) public onlyAuthProvider {
        require(patients[_patientId].id != _patientId, "Patient already exists");
        patients[_patientId].id = _patientId;
        patients[_patientId].name = name;
        patientList.push(_patientId);
        emit PatientAdded(_patientId);
    }

    function addPatientRecord(
        string memory _cid,
        string memory _fileName,
        string memory _patientName,
        address _patientId,
        string memory _diagnosis,
        string memory _treatment
    ) public onlyAuthProvider patientExists(_patientId) {

        // Store & retrieve value in a variable
       Record memory newRecord = Record({
            cid: _cid, // Assign the _cid parameter
            fileName: _fileName, // Assign the _fileName parameter
            patientName: _patientName,
            patientId: _patientId,
            diagnosis: _diagnosis,
            treatment: _treatment,
            doctorId: msg.sender,
            timestamp: block.timestamp
        });
        patients[_patientId].records.push(newRecord);
        
        emit RecordAdded(_cid, _patientId, msg.sender);

    }

   function addDoctor(address _doctorId) public onlyOwner {
        require(!doctors[_doctorId].isAuthorized, "Account is already a doctor");
        doctors[_doctorId].id = _doctorId;
        doctors[_doctorId].isAuthorized = true;
        emit DoctorAdded(_doctorId);
   }


    function revokeDoctorAuth(address _doctorId) public onlyOwner {
        require(doctors[_doctorId].isAuthorized, "This doctor does not exist or is not authorized");
        doctors[_doctorId].isAuthorized = false;
        emit DoctorRemoved(_doctorId);
    }

    
    function removePatient(address _patientId) public onlyAuthProvider {
        require(patients[_patientId].id == _patientId, "Patient does not exist");
        patients[_patientId].id = address(0); // Mark as removed
        emit PatientRemoved(_patientId);
    }

     function getPatientRecords(address _patientId) public view onlyAuthProvider patientExists(_patientId) returns (Record[] memory) {
        // Retrieve the record from the contract.;
        // Return all records with the same ID.
        return patients[_patientId].records;
    }

   // Get information for all active patients
    function getAllPatientsInfo() public view onlyAuthProvider returns (PatientInfo[] memory) {
        PatientInfo[] memory infos = new PatientInfo[](patientList.length);
        uint256 count = 0;
        for (uint256 i = 0; i < patientList.length; i++) {
            address patientId = patientList[i];
            if (patients[patientId].id == patientId) { // Only include active patients
                infos[count] = PatientInfo(patientId, patients[patientId].name);
                count++;
            }
        }
        // Trim the array to remove empty slots
        PatientInfo[] memory result = new PatientInfo[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = infos[i];
        }
        return result;
    }

    function getPatientExists(address _patientId) public view returns (bool) {
        return patients[_patientId].id == _patientId;
    }
}