pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    // Consensus list of airlines
    mapping (address => uint256) private authorizedContracts;

    // Consensus mapping.
    // Airline mapping
    mapping(address => address[]) private airlineConcensusList;

    // Mapping Contact active consensus
    mapping(address => uint256) private airlineConcensusTotal;

    // Checks Change to one contract...
    // mapping (address => uint256) private authorizedUsersCont;

    // airlines struct
    // addresses, funds and approved status from consesus.
    struct Airline {
        address airlineAddress;
        uint256 funds;
        bool status;
    }

    // All airlines
    mapping (address => Airline) private airlines;

    // Total airlines before we start consensus
    uint256 private airlineCounter = 0 ;


    // Passengers
    struct Insurance {
        bool refunded;
        bool claimed;
        string flight;
        address passenger;
        uint256 value;
    }
    

    mapping(bytes32 => Insurance) private insuredFlights;
    mapping(string => address[]) private flightPassengers;

    mapping(address => uint256) private passengerFunds;



    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor() public 
    {
        contractOwner = msg.sender;
        authorizedContracts[msg.sender] = 1;

        airlines[msg.sender]=Airline({
            airlineAddress: msg.sender,
            funds:0,
            status:true
        });

        airlineCounter = airlineCounter.add(1);
    }

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
        require(operational, "Contract is currently not operational");
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

    // Making sure its an authorized contract performing the changes.
    modifier isCallerAuthorized()
    {   
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    // Contract authorization functuons!!!
    function authorizeCaller(address dataContract) external requireContractOwner{
        authorizedContracts[dataContract] = 1;
    }

    function deauthorizeCaller(address dataContract) external requireContractOwner{
        delete authorizedContracts[dataContract];
    }

    // AIRLINE Modifiers
    // Airline is approved
    modifier approvedAirline()
    {
        require(airlines[msg.sender].status, "Airline is not approved");
        _;
    }

    // Airline has funds
    modifier fundedAirline()
    {
        require(airlines[msg.sender].funds > 0, "Airline doesnt have funds");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() public view returns(bool) 
    {
        return operational;
    }




    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) public requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    // Airlines
   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(address airlineAddress,  uint256 funds, bool status ) isCallerAuthorized external
    {
        airlines[airlineAddress]=Airline({
            airlineAddress: airlineAddress,
            funds:funds,
            status:status
        });
        airlineCounter = airlineCounter.add(1);
    }

    function setAirlineFunds(address airlineAddress, uint256 funds) external payable isCallerAuthorized {
        airlines[airlineAddress].funds = airlines[airlineAddress].funds.add(funds);
    }



    // Getting amount of Airlines already in the system.
    function getAirlineCounter()  external view  returns (uint256) {
        return airlineCounter;
    }

    // Adding airline concensus
    function addConcensus(address airlineToApprove, address approvingAirline, uint256 vote)  external isCallerAuthorized returns (uint256)
    {
        for (uint i=0; i<airlineConcensusList[airlineToApprove].length; i++) {
            if(airlineConcensusList[airlineToApprove][i] == approvingAirline){
                require(false, "User already voted.");
            }
        }

        airlineConcensusList[airlineToApprove].push(approvingAirline);

        airlineConcensusTotal[airlineToApprove] = airlineConcensusTotal[airlineToApprove].add(vote);

        return airlineConcensusTotal[airlineToApprove];
    }

    // Function to check total votes for an airline.
    function getAirlineVotes(address airlineAddress) external view isCallerAuthorized  returns (uint256 votes){
        return airlineConcensusTotal[airlineAddress];
    }

    // Get airline information from Adress
    function getAirlines(address airlineAddress ) external view  isCallerAuthorized returns (address airline, uint256 funds, bool status)
    {
        Airline memory airlineData = airlines[airlineAddress];
        return (airlineData.airlineAddress, airlineData.funds, airlineData.status);
    }

    // Get airline status from Adress
    function getAirlineStatus(address airlineAddress )  external view isCallerAuthorized returns (bool status)
    {
        Airline memory airlineData = airlines[airlineAddress];
        return airlineData.status;
    }

    // Passengers!!!
   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buyInsurace(string flight, address passenger) isCallerAuthorized external payable
    {
        Insurance memory temp = Insurance({
            refunded:false,
            claimed:false,
            flight: flight,
            passenger: passenger,
            value: msg.value
        });

        bytes32 key = keccak256(abi.encodePacked(flight, passenger));

        insuredFlights[key] = temp;
        flightPassengers[flight].push(passenger);

    }

    function contractBalance() external view returns(uint) {
        return address(this).balance;
    }

    // Retrieve insurance
    function getInsurance(string flight, address passenger) isCallerAuthorized external view returns (address r_passenger, string r_flight, uint256 value, bool claimed){
        bytes32 key = keccak256(abi.encodePacked(flight, passenger));
        return (insuredFlights[key].passenger, insuredFlights[key].flight, insuredFlights[key].value, insuredFlights[key].claimed);
    }

    /**
     *  @dev Credits payouts to insurees
        give credit to users before paying them.
    */
    function creditInsurees( string flight ) isCallerAuthorized external 
    {
        address[] memory passengers = flightPassengers[flight];
        
        for (uint i=0; i<passengers.length; i++) {
            bytes32 key = keccak256(abi.encodePacked(flight, passengers[i]));
            Insurance storage passengerInsurance = insuredFlights[key];

            // multiply by 3 and divide by 2 == 1.5
            uint256 multiplied = passengerInsurance.value.mul(3).div(2);
            
            passengerFunds[passengers[i]] = passengerFunds[passengers[i]].add(multiplied);

            passengerInsurance.refunded = true;

            insuredFlights[key] = passengerInsurance;
        }
    }

    function getPassengerFunds(address passenger) external view isCallerAuthorized returns (uint256 funds)
    {
        return passengerFunds[passenger];
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     * basically withdraw
    */
    function pay(address passenger, uint256 value) isCallerAuthorized external                
    {
        passengerFunds[passenger] = 0;
        passenger.transfer(value);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *        airline activation 10 ether
    * 
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

