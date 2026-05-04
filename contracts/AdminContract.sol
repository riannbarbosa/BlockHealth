// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract AdminContract {
    error OnlyOwner();
    error DoctorNotAuthorized();
    error PatientNotActive();
    error DoctorAlreadyRegistered();
    error InvalidAddress();
    error PatientAlreadyRegistered();
    error MedicContractCallFailed();
    error InvalidOwnerAddress();

    address public owner;
    address public medicContract;

    constructor() {
        owner = msg.sender;
    }

    // Struct packing: address(20) + bool(1) + uint88(11) = 32 bytes (1 slot)
    struct Doctor {
        string name;
        string specialization;
        string licenseNumber;
        address id;              // 20 bytes \
        bool isAuthorized;       // 1 byte   |
        uint88 registrationDate; // 11 bytes / = 32 bytes (1 slot)
    }

    struct Patient {
        string name;
        string dateOfBirth;
        string phoneNumber;
        string emergencyContact;
        address id;              // 20 bytes \
        bool isActive;           // 1 byte   |
        uint88 registrationDate; // 11 bytes / = 32 bytes (1 slot)
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
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier doctorExists(address doctorId) {
        if (!doctors[doctorId].isAuthorized) revert DoctorNotAuthorized();
        _;
    }

    modifier patientExists(address patientId) {
        if (!patients[patientId].isActive) revert PatientNotActive();
        _;
    }

    function registerDoctor(
        address _doctorId,
        string calldata _name,
        string calldata _specialization,
        string calldata _licenseNumber
    ) public onlyOwner {
        if (doctors[_doctorId].isAuthorized) revert DoctorAlreadyRegistered();
        if (_doctorId == address(0)) revert InvalidAddress();
        
        doctors[_doctorId] = Doctor({
            id: _doctorId,
            name: _name,
            specialization: _specialization,
            licenseNumber: _licenseNumber,
            isAuthorized: true,
            registrationDate: uint88(block.timestamp)
        });
        
        doctorList.push(_doctorId);
        
        if (medicContract != address(0)) {
            (bool success, ) = medicContract.call(
                abi.encodeWithSignature("authorizeDoctor(address)", _doctorId)
            );
            if (!success) revert MedicContractCallFailed();
        }
        
        emit DoctorRegistered(_doctorId, _name, _specialization);
    }

    function revokeDoctor(address _doctorId) public onlyOwner doctorExists(_doctorId) {
        if (medicContract != address(0)) {
            (bool success, ) = medicContract.call(
                abi.encodeWithSignature("revokeDoctor(address)", _doctorId)
            );
            if (!success) revert MedicContractCallFailed();
        }

        doctors[_doctorId].isAuthorized = false;
        
        emit DoctorRevoked(_doctorId);
    }

    function updateDoctorInfo(
        address _doctorId,
        string calldata _name,
        string calldata _specialization,
        string calldata _licenseNumber
    ) public onlyOwner doctorExists(_doctorId) {
        Doctor storage doc = doctors[_doctorId];
        doc.name = _name;
        doc.specialization = _specialization;
        doc.licenseNumber = _licenseNumber;
    }

    function registerPatient(
        address _patientId,
        string calldata _name,
        string calldata _dateOfBirth,
        string calldata _phoneNumber,
        string calldata _emergencyContact
    ) public onlyOwner {
        if (patients[_patientId].isActive) revert PatientAlreadyRegistered();
        if (_patientId == address(0)) revert InvalidAddress();
        
        patients[_patientId] = Patient({
            id: _patientId,
            name: _name,
            dateOfBirth: _dateOfBirth,
            phoneNumber: _phoneNumber,
            emergencyContact: _emergencyContact,
            isActive: true,
            registrationDate: uint88(block.timestamp)
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
        string calldata _name,
        string calldata _dateOfBirth,
        string calldata _phoneNumber,
        string calldata _emergencyContact
    ) public onlyOwner patientExists(_patientId) {
        Patient storage pat = patients[_patientId];
        pat.name = _name;
        pat.dateOfBirth = _dateOfBirth;
        pat.phoneNumber = _phoneNumber;
        pat.emergencyContact = _emergencyContact;
    }

    function getAllDoctors() public view returns (Doctor[] memory) {
        uint256 len = doctorList.length;
        uint256 activeCount;
        
        for (uint256 i; i < len; ) {
            if (doctors[doctorList[i]].isAuthorized) {
                unchecked { ++activeCount; }
            }
            unchecked { ++i; }
        }
        
        Doctor[] memory activeDoctors = new Doctor[](activeCount);
        uint256 index;
        
        for (uint256 i; i < len; ) {
            if (doctors[doctorList[i]].isAuthorized) {
                activeDoctors[index] = doctors[doctorList[i]];
                unchecked { ++index; }
            }
            unchecked { ++i; }
        }
        
        return activeDoctors;
    }

    function getAllPatients() public view returns (Patient[] memory) {
        uint256 len = patientList.length;
        uint256 activeCount;
        
        for (uint256 i; i < len; ) {
            if (patients[patientList[i]].isActive) {
                unchecked { ++activeCount; }
            }
            unchecked { ++i; }
        }
        
        Patient[] memory activePatients = new Patient[](activeCount);
        uint256 index;
        
        for (uint256 i; i < len; ) {
            if (patients[patientList[i]].isActive) {
                activePatients[index] = patients[patientList[i]];
                unchecked { ++index; }
            }
            unchecked { ++i; }
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

    function updateMedicContract(address _newContract) public onlyOwner {
        medicContract = _newContract;
        emit MedicContractUpdated(_newContract);
    }

    function transferOwnership(address _newOwner) public onlyOwner {
        if (_newOwner == address(0)) revert InvalidOwnerAddress();
        owner = _newOwner;
    }
}