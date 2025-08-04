// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract AdminContract {
    address public owner;
    address public medicContract;

    constructor() {
        owner = msg.sender;
    }

    struct Doctor {
        address id;
        string name;
        string specialization;
        string licenseNumber;
        bool isAuthorized;
        uint256 registrationDate;
    }

    struct Patient {
        address id;
        string name;
        string dateOfBirth;
        string phoneNumber;
        string emergencyContact;
        bool isActive;
        uint256 registrationDate;
    }

    mapping(address => Doctor) public doctors;
    mapping(address => Patient) public patients;
    address[] public doctorList;
    address[] public patientList;

    event DoctorRegistered(address indexed doctorId, string name, string specialization);
    event DoctorRevoked(address indexed doctorId);
    event PatientRegistered(address indexed patientId, string name);
    event PatientDeactivated(address indexed patientId);
    event MedicContractUpdated(address indexed newContract);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier doctorExists(address doctorId) {
        require(doctors[doctorId].isAuthorized, "Doctor does not exist or is not authorized");
        _;
    }

    modifier patientExists(address patientId) {
        require(patients[patientId].isActive, "Patient does not exist or is not active");
        _;
    }

    // Doctor management functions
    function registerDoctor(
        address _doctorId,
        string memory _name,
        string memory _specialization,
        string memory _licenseNumber
    ) public onlyOwner {
        require(!doctors[_doctorId].isAuthorized, "Doctor already registered");
        require(_doctorId != address(0), "Invalid doctor address");
        
        doctors[_doctorId] = Doctor({
            id: _doctorId,
            name: _name,
            specialization: _specialization,
            licenseNumber: _licenseNumber,
            isAuthorized: true,
            registrationDate: block.timestamp
        });
        
        doctorList.push(_doctorId);
        
        if (medicContract != address(0)) {
            (bool success, ) = medicContract.call(
                abi.encodeWithSignature("authorizeDoctor(address)", _doctorId)
            );
            require(success, "Failed to authorize doctor in medic contract");
        }
        
        emit DoctorRegistered(_doctorId, _name, _specialization);
    }

    function revokeDoctor(address _doctorId) public onlyOwner doctorExists(_doctorId) {
        doctors[_doctorId].isAuthorized = false;
        
        // Call the main contract to revoke doctor
        if (medicContract != address(0)) {
             require(doctors[_doctorId].isAuthorized == false, "Revoke failed");
            (bool success, ) = medicContract.call(
                abi.encodeWithSignature("revokeDoctor(address)", _doctorId)
            );
            require(success, "Failed to revoke doctor in medic contract");
        }
        
        emit DoctorRevoked(_doctorId);
    }

    function updateDoctorInfo(
        address _doctorId,
        string memory _name,
        string memory _specialization,
        string memory _licenseNumber
    ) public onlyOwner doctorExists(_doctorId) {
        doctors[_doctorId].name = _name;
        doctors[_doctorId].specialization = _specialization;
        doctors[_doctorId].licenseNumber = _licenseNumber;
    }

    // Patient management functions
    function registerPatient(
        address _patientId,
        string memory _name,
        string memory _dateOfBirth,
        string memory _phoneNumber,
        string memory _emergencyContact
    ) public onlyOwner {
        require(!patients[_patientId].isActive, "Patient already registered");
        require(_patientId != address(0), "Invalid patient address");
        
        patients[_patientId] = Patient({
            id: _patientId,
            name: _name,
            dateOfBirth: _dateOfBirth,
            phoneNumber: _phoneNumber,
            emergencyContact: _emergencyContact,
            isActive: true,
            registrationDate: block.timestamp
        });
        
        patientList.push(_patientId);
        
        emit PatientRegistered(_patientId, _name);
    }

    function deactivatePatient(address _patientId) public onlyOwner patientExists(_patientId) {
        patients[_patientId].isActive = false;
        emit PatientDeactivated(_patientId);
    }

    function updatePatientInfo(
        address _patientId,
        string memory _name,
        string memory _dateOfBirth,
        string memory _phoneNumber,
        string memory _emergencyContact
    ) public onlyOwner patientExists(_patientId) {
        patients[_patientId].name = _name;
        patients[_patientId].dateOfBirth = _dateOfBirth;
        patients[_patientId].phoneNumber = _phoneNumber;
        patients[_patientId].emergencyContact = _emergencyContact;
    }

    function getAllDoctors() public view returns (Doctor[] memory) {
        uint256 activeCount = 0;
        
        // Count active doctors
        for (uint256 i = 0; i < doctorList.length; i++) {
            if (doctors[doctorList[i]].isAuthorized) {
                activeCount++;
            }
        }
        
        Doctor[] memory activeDoctors = new Doctor[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < doctorList.length; i++) {
            if (doctors[doctorList[i]].isAuthorized) {
                activeDoctors[index] = doctors[doctorList[i]];
                index++;
            }
        }
        
        return activeDoctors;
    }

    function getAllPatients() public view returns (Patient[] memory) {
        uint256 activeCount = 0;
        
        // Count active patients
        for (uint256 i = 0; i < patientList.length; i++) {
            if (patients[patientList[i]].isActive) {
                activeCount++;
            }
        }
        
        Patient[] memory activePatients = new Patient[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < patientList.length; i++) {
            if (patients[patientList[i]].isActive) {
                activePatients[index] = patients[patientList[i]];
                index++;
            }
        }
        
        return activePatients;
    }

    function getDoctorInfo(address _doctorId) public view returns (Doctor memory) {
        return doctors[_doctorId];
    }

    function getPatientInfo(address _patientId) public view returns (Patient memory) {
        return patients[_patientId];
    }

    function isDoctorAuthorized(address _doctorId) public view returns (bool) {
        return doctors[_doctorId].isAuthorized;
    }

    function isPatientActive(address _patientId) public view returns (bool) {
        return patients[_patientId].isActive;
    }

    // Admin functions
    function updateMedicContract(address _newContract) public onlyOwner {
        medicContract = _newContract;
        emit MedicContractUpdated(_newContract);
    }

    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Invalid new owner address");
        owner = _newOwner;
    }
}