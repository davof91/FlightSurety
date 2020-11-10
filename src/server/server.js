import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const CONSTANT_GAS = 769122;
const ORACLES_COUNT = 20
const oracles = []
const statusCodes = ['10', '20', '30', '40', '50']

let accounts = []

// Oracle Events
flightSuretyApp.events.FlightStatusInfo({fromBlock:"latest"}, (err, event) => {
  if (err){
    console.log(err)
  } 
  else{
    console.log("FlightStatusInfo Event:")
    console.log(event.returnValues)
    console.log("Finished FlightStatusInfo")
  }
  
});

flightSuretyApp.events.OracleReport({fromBlock:"latest"}, (err, event) => {
  if (err){
    console.log(err)
  } 
  else{
    console.log("OracleReport Event:")
    console.log(event.returnValues)
  }
})

flightSuretyApp.events.OracleRequest({fromBlock:"latest"}, (err, event) => {
    if (err) {
      console.log(err)
    }
    else{
      console.log("Receive OracleRequest Event:")
      var { index, airline, flight, timestamp } = event.returnValues
      console.log(event.returnValues);
      let tempOracles = []
      oracles.forEach((indexes, accountId) => {
        indexes.forEach( indexOracle => {
          // Check index of oracle match index for Request.
          if (indexOracle === index) {
            console.log('OracleRequest > Oracle with address '+ accounts[accountId] +' has the same index for request')
            // Add account address to temp array.
            tempOracles.push(accounts[accountId])
          }
        })
      })
      // Did we get any oracles?
      if (tempOracles.length>0) {
        // Random codes
        let statusCode = statusCodes[Math.floor((Math.random() * statusCodes.length))]
        tempOracles.forEach( async address => {
          try{
            // Submit response
            let result = await flightSuretyApp.methods.getMyIndexes().call({from: address});
            console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
            if(index == result[0] || index == result[1] || index == result[2]){
              await flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode).send({from:address, gas: CONSTANT_GAS});
              console.log('OracleRequest > Oracle submitted code '+statusCode+'.')
            }   
          }
          catch(err){
            console.log(err);
          }
        });
      } else {
        console.log('OracleRequest > No oracle with index');
      }

    }
});

const app = express();

app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

app.initializeServer = async () => {
  console.log('Registering oracles')
  accounts = await web3.eth.getAccounts(); 
  web3.eth.defaultAccount = accounts[0];
  
  accounts.forEach(async account => {
    try{
      await flightSuretyApp.methods.registerOracle().send({
            "from": account,
            "value": web3.utils.toWei('1', 'ether'),
            "gas": 4712388,
            "gasPrice": 100000000000
      })
      let result = await flightSuretyApp.methods.getMyIndexes().call({from: account});
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
      oracles.push(result);
    }
    catch(err){
      console.log(err);
    }
 });
}

export default app;


