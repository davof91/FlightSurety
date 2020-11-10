
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  // Adding funding and adding new airline!!!!!!
  it('(airline) First one is owner', async () => {
    let originalAirline = await config.flightSuretyData.getAirlines.call(config.owner); 

    console.log(originalAirline)
  });

  
  // Adding funding and adding new airline!!!!!!
  it('(airline) funding first airline before registering new one.', async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.addFunds({from: config.owner, value:10000000000000000000});
        await config.flightSuretyApp.registerAirline(newAirline, true, {from: config.owner});
    }
    catch(e) {
        console.log(e);
    }

    let result = await config.flightSuretyData.getAirlines.call(newAirline); 

    // ASSERT
    assert.equal(result[2], true, "Airline should have registered now that is funded");
  });
 
  // Adding funding and adding new airline!!!!!!
  it('(airline) Concensus checking for the first airline that is pass the limit.', async () => {
    // ARRANGE
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];
    let airline5 = accounts[5];

    // Adding funding to the airline2 to add new airlines with it.
    await config.flightSuretyApp.addFunds({from: airline2, value:10000000000000000000});

    let airline2_data = await config.flightSuretyData.getAirlines.call(airline2); 
    assert.equal(airline2_data[1], 10000000000000000000, "Airline2 should have funds of 2");

    // Adding airline3 without problems
    await config.flightSuretyApp.registerAirline(airline3, true, {from: airline2});
    let airline3_data = await config.flightSuretyData.getAirlines.call(airline2); 

    assert.equal(airline3_data[2], true, "Airline3 should have registered now that Airline2 is funded");

    // Adding funding to airline3 to have enough money.  
    await config.flightSuretyApp.addFunds({from: airline3, value:10000000000000000000});

    // Adding airline4
    await config.flightSuretyApp.registerAirline(airline4, true, {from: airline2});

    // Adding funding to airline4 to have enough money.  
    await config.flightSuretyApp.addFunds({from: airline4, value:10000000000000000000});

    await config.flightSuretyApp.registerAirline(airline5, true, {from: airline2});
    let airline4_data = await config.flightSuretyData.getAirlines(airline5); 
    
    let votes = await config.flightSuretyData.getAirlineVotes.call(airline5);

    // Adding aitline4 should return 1 vote and false status.
    assert.equal(airline4_data[0], "0x0000000000000000000000000000000000000000", "Returns false since the airline has to be approved");
    assert.equal(airline4_data[2], false, "There should be no airline created yet.");
    assert.equal(votes, 1, "There should be 1 vote for the user who just added it.");

  });

  it('(contract balance) Contract balance available', async () => {
    let contract_balance = await config.flightSuretyData.contractBalance.call();
    console.log(contract_balance);
  });

  it('(airline) Concensus approving a new airline. No double votes and negative votes.', async () => {
    // ARRANGE
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];
    let airline5 = accounts[5];
    let userAlreadyVoted = false;

    // Not sure why but this breaks the nonce of the airline2 so its unusable from here down!! :(
    try{
        // Adding airline3 without problems
        await config.flightSuretyApp.registerAirline(airline5, true, {from: airline2});
    }
    catch(e){
        // It will crash if it already voted. 
        userAlreadyVoted = true;
        // Uncoment following line to see error.
        //console.log(e)
    }
    
    assert.equal(userAlreadyVoted, true, "Airline2 cant vote twice on the same flight");

    // Voting no on the airline! This would prevent the creation
    await config.flightSuretyApp.registerAirline(airline5, false, {from: airline3});

    let airline5_data = await config.flightSuretyData.getAirlines.call(airline5); 
    assert.equal(airline5_data[2], false, "There should be no airline created yet.");

    // This is 50% of votes and should create it.
    await config.flightSuretyApp.registerAirline(airline5, true, {from: airline4});
    airline5_data = await config.flightSuretyData.getAirlines.call(airline5); 

    assert.equal(airline5_data[2], true, "Airline5 should be created.");

  });

  it('(flights) Registering two flights', async () => {
    let airline4 = accounts[4];
    let airline3 = accounts[3];

    let flight1 = "AA3321";
    let flight2 = "AA3323";
    
    await config.flightSuretyApp.registerFlight(flight1, {from: airline3});
    let flight1Found = await config.flightSuretyApp.getFlightInformation.call(flight1);

    await config.flightSuretyApp.registerFlight(flight2, {from: airline4});    
    let flight2Found = await config.flightSuretyApp.getFlightInformation.call(flight2);

    assert.equal(flight1Found[0], airline3, "Airline2 created flight.");
    assert.equal(flight2Found[0], airline4, "Airline3 created flight.");
  });

  it('(passengers) buy insurance for flight', async () => {
    let user1 = accounts[6];
    let user2 = accounts[7];
    let user3 = accounts[8];

    let flight1 = "AA3321";
    let flight2 = "AA3323";
    
    try{
        await config.flightSuretyApp.buyInsurance(flight1, {from: user1, value:3000000000000000000});
    }
    catch(e){
        
    }
    let insurance1 = await config.flightSuretyData.getInsurance.call(flight1,user1); 
    assert.equal(insurance1.value, 0, "reached max value.");

    // using user2 since nonce broke for user1
    await config.flightSuretyApp.buyInsurance(flight1, {from: user2, value:20});
    insurance1 = await config.flightSuretyData.getInsurance.call(flight1,user2); 
    assert.equal(insurance1.value, 20, "Insurance not bought");

    await config.flightSuretyApp.buyInsurance(flight1, {from: user3, value:30});
    insurance1 = await config.flightSuretyData.getInsurance.call(flight1,user3); 
    assert.equal(insurance1.value, 30, "Insurance not bought");
    
  });

  it('(flight delay) Funding passengers for delayed flights', async () => {
    let user2 = accounts[7];
    let user3 = accounts[8];

    let airline3 = accounts[3];

    let flight1 = "AA3321";
    let flight2 = "AA3323";
    
    await config.flightSuretyApp.processFlightStatusTesting(airline3, flight1, Date.now(), 10 );
    let passenger2_funds = await config.flightSuretyData.getPassengerFunds.call(user2);
    assert.equal(passenger2_funds, 0, "User2 should have 0 funds, flight on time.");

    await config.flightSuretyApp.processFlightStatusTesting(airline3, flight1, Date.now(), 20 );
    passenger2_funds = await config.flightSuretyData.getPassengerFunds.call(user2);
    assert.equal(passenger2_funds, 30, "User2 should have 30 funds to withdraw, flight on time.");

    let passenger3_funds = await config.flightSuretyData.getPassengerFunds.call(user3);
    assert.equal(passenger3_funds, 45, "User3 should have 45 funds to withdraw, flight on time.");
  });

  it('(contract balance) Contract balance available', async () => {
    let contract_balance = await config.flightSuretyData.contractBalance.call();
    console.log(contract_balance);
  });

  it('(flight delay) Funding passengers for delayed flights', async () => {
    let user3 = accounts[8];

    await config.flightSuretyApp.initiateWithdrawl({from: user3});
    passenger2_funds = await config.flightSuretyData.getPassengerFunds(user3);
    assert.equal(passenger2_funds, 0, "User2 should have 0 funds to withdraw");

    let contract_balance = await config.flightSuretyData.contractBalance.call();
    console.log(contract_balance);
    assert.equal(contract_balance, 40000000000000000005, "User2 should have 0 funds to withdraw");
  });

});
