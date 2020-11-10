pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

// Importing data Contract 
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    // Total of airlines before concensus starts.
    uint8 private constant MIN_AIRLINES = 4;
    // Needs 10 ether to be able to register an irline.
    uint256 private constant MIN_FUNDS = 10000000000000000000;

    // Maximun insurance allowed to be paid by a user.
    uint256 private constant MAX_INSURANCE = 1000000000000000000;

    address private contractOwner;          // Account used to deploy contract
    FlightSuretyData flightSuretyData;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    mapping(string => Flight) private flights;

    
 
    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
         // Modify to call data contract's status
        require(true, "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    // Checking if airline is approved in order to get money in.
    modifier activeAirline() {
        require(flightSuretyData.getAirlineStatus(msg.sender) == true, "Your must be an active airline.");
        _;
    }

    // Value has to be bigger than 0.
    modifier validFunds() {
        require(msg.value > 0, "Value is not valid");
        _;
    }

    // Make sure flight exists
    modifier requireFlight(string flight) {
        require(flights[flight].isRegistered == true, "This flight not exists");
        _;
    }
    
    // Maximun value of insurance reached.
    modifier requireMaximumInsurance() {
        require(msg.value <= MAX_INSURANCE, "You insurance limit reached");
        _;
    }

     // Airline Approved
    modifier requireAirlineApproved() {
        ( , uint256 fundUser, bool statusUser) = flightSuretyData.getAirlines(msg.sender);
        require(statusUser == true, "Airline has to be approved.");
        _;
    }

    // Airline Approved
    modifier requireUserFunding() {
        ( , uint256 fundUser, bool statusUser) = flightSuretyData.getAirlines(msg.sender);
        require(fundUser >= MIN_FUNDS, "Airline has not provided enough funding");
        _;
    }

    // Airline Approved
    modifier requireAirlineNotCreated(address checkAddress) {
        ( address airline, uint256 fundUser, bool statusUser) = flightSuretyData.getAirlines(checkAddress);
        require(airline != checkAddress, "Airline should not exist");
        _;
    }

    // Flight Approved
    modifier requireFlightDoesntExist(string flight) {
        require(flights[flight].isRegistered == false, "Flight should not exist");
        _;
    }
    
    // Check Insurance dont exisr
    modifier requireInsuranceDoesntExist(string flight) {
        ( address passenger, , , ) = flightSuretyData.getInsurance(flight, msg.sender);
        require(passenger != msg.sender, "User already bought insurance. All sales final");
        _;
    }


    // Events
    event RegisteringAirline(address airline);
    event AirlineVote(address airline, address sender);
    event AddedFunds(address airline, uint256 funds);
    event FlightRegistered(address airline, string flight);
    event FlightBooked(address passenger, string flight);
    event InsuranceBought(address passenger, string flight);
    event MoneyWithdrawn(address passenger, uint256 funds);

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *   Got to update the data contract in here.
    */
    constructor(address dataContract) public 
    {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            pure 
                            returns(bool) 
    {
        return true;  // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline( address flightAddress, bool userVote ) external requireAirlineNotCreated(flightAddress) requireAirlineApproved requireUserFunding 
    {
        bool status = false;
        uint256 consensus = 0;
        uint256 neededVotes = 0;
        uint256 vote = 0;

        if(userVote){
            vote = 1;
        }

        if (flightSuretyData.getAirlineCounter() >= 4) {
            consensus = flightSuretyData.addConcensus(flightAddress, msg.sender, vote);
            neededVotes = flightSuretyData.getAirlineCounter().div(2);
        }

        if (consensus >= neededVotes) {
            status = true;
            flightSuretyData.registerAirline(flightAddress, 0, status);
            emit RegisteringAirline(flightAddress);
        }
        else{
            emit AirlineVote(flightAddress, msg.sender);
        }
        
    }

    function getAirlineInfo (address searchAirline) external view returns (address airline, uint256 funds, bool status){
        (airline, funds, status) = flightSuretyData.getAirlines(searchAirline);
    }

    function airlineTotal() external view returns(uint256) {
        return flightSuretyData.getAirlineCounter();
    }

    // Add funds to airline
    function addFunds() external payable validFunds activeAirline
    {
        flightSuretyData.setAirlineFunds.value(msg.value)(msg.sender, msg.value);
        emit AddedFunds(msg.sender, msg.value);
    }

    // Buy insurance
    function buyInsurance(string flight) external payable validFunds requireMaximumInsurance requireFlight(flight) requireInsuranceDoesntExist(flight) {
        flightSuretyData.buyInsurace.value(msg.value)(flight, msg.sender);
        emit InsuranceBought(msg.sender, flight);
    }

    // Get Insurance
    function getInsurance(string flight) external view returns(address r_passenger, string r_flight, uint256 value, bool claimed) {
        (r_passenger, r_flight, value, claimed) = flightSuretyData.getInsurance(flight, msg.sender);
    }

    function contractBalance() external view returns(uint) {
        return flightSuretyData.contractBalance();
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight(string flight) external requireFlightDoesntExist(flight) requireUserFunding
    {
        flights[flight] = Flight({
            isRegistered: true,
            statusCode: STATUS_CODE_UNKNOWN,
            updatedTimestamp: now,
            airline: msg.sender
        });

        emit FlightRegistered(msg.sender, flight);
    }

    function getFlightInformation(string flight) external view returns (address airline, uint256 updatedTimestamp, bool isRegistered, uint8 statusCode){
        Flight memory flightInfo = flights[flight];

        return (flightInfo.airline, flightInfo.updatedTimestamp, flightInfo.isRegistered, flightInfo.statusCode);
    }

    function initiateWithdrawl() external payable {
        require(flightSuretyData.getPassengerFunds(msg.sender) > 0);

        flightSuretyData.pay(msg.sender, flightSuretyData.getPassengerFunds(msg.sender));

        emit MoneyWithdrawn(msg.sender, flightSuretyData.getPassengerFunds(msg.sender));
    }
    
   /**
    * Same as processFlightStatus its just external for testing with test classes. Would not be open in real life.
    */  
    function processFlightStatusTesting(address airline, string flight, uint256 timestamp, uint8 statusCode) external 
    {
        // Update flight
        flights[flight].updatedTimestamp = timestamp;
        flights[flight].statusCode = statusCode;

        if(statusCode > STATUS_CODE_ON_TIME){
            flightSuretyData.creditInsurees(flight);
        }
    }

    /**
    * @dev Called after oracle has updated flight status
    * Triggered when oracle returns with result and decides things. check status code?
    * look for passengers insurance on flight and do the retuns 
    */
    function processFlightStatus(address airline, string flight, uint256 timestamp, uint8 statusCode) internal
    {
        // Update flight
        flights[flight].updatedTimestamp = timestamp;
        flights[flight].statusCode = statusCode;

        if(statusCode > STATUS_CODE_ON_TIME){
            flightSuretyData.creditInsurees(flight);
        }
    }

    // Generate a request for oracles to fetch flight information
    // generated from the UI
    function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 wei;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes() view external returns(uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   
