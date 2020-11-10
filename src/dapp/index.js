
//import DOM from './dom';
//import Contract from './contract';
import './flightsurety.css';
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

let config = Config["localhost"];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')))
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let owner = null;
let accounts = [];
let airlines = [];
let passengers = [];
let flights = ["DS112", "DS224", "EA234", "EA899"]
const CONSTANT_GAS = 769122

function copyFunction() {
    /* Get the text field */
    var copyText = owner;
  
    navigator.clipboard.writeText(copyText).then(function() {
    console.log('Async: Copying to clipboard was successful!');
    }, function(err) {
    console.error('Async: Could not copy text: ', err);
    });
}

function generateFlightDropdown(parentId, flights){
    let parent = document.getElementById(parentId);

    let select = document.createElement("select"); 
    select.setAttribute("class", "form-control");
    select.id = "flights_"+parentId;

    var i;
    for (i = 0; i < flights.length; i++) {
        let option  = document.createElement("option");
        option.value = flights[i];
        option.innerHTML = flights[i];
        select.appendChild(option);
    }

    parent.appendChild(select);
}

function generateAccountDropdown(parentId, accounts){
    let parent = document.getElementById(parentId);

    let select = document.createElement("select"); 
    select.id = "account_"+parentId;
    select.setAttribute("class", "form-control");
    select.id = "accounts_"+parentId;

    var i;
    for (i = 0; i < accounts.length; i++) {
        let option  = document.createElement("option");
        option.value = accounts[i];
        option.innerHTML = accounts[i].substring(0,8) +"......"+ accounts[i].substring(38,42);
        select.appendChild(option);
    }

    parent.appendChild(select);
}

function contractBalance(balance){
    let status_parent = document.getElementById("contractBalanceDiv");

    status_parent.innerHTML = "&nbsp;" +balance+"&nbsp;Wei &nbsp;"; 
}

function addLog(text, type){
    let parent = document.getElementById("logger");

    parent.innerHTML=parent.innerHTML+"- "+type+" > "+text+"<br\>";


}

generateFlightDropdown("flight_search_drop", flights);
generateFlightDropdown("add_flight_drop", flights);
generateFlightDropdown("insurance_flight", flights);
generateFlightDropdown("search_insurance_flight", flights);

document.getElementById("copyAddress").onclick = copyFunction;

// Contract Calls!!!!!!
async function isOperational() {
    return await flightSuretyApp.methods.isOperational().call({ from: owner});
 };

 async function withdrawFunds() {
    let active_user = document.getElementById("accounts_active_user").value;
     try{
        let withdraw = await flightSuretyApp.methods.initiateWithdrawl().send({ from: active_user, gas: CONSTANT_GAS});
        console.log(withdraw);
        addLog("Funds withdrawn for user.", "WithdrawFunds")
        let data = await flightSuretyApp.methods.contractBalance().call();
        contractBalance(data)
    }
    catch(err) {
        console.log(err.message);
        if(err.message.includes("revert")){
            addLog("Reverted. You sure there is money to withdraw?", "WithdrawFunds")
            
        }   
        else{
            addLog("Error has ocurred.", "WithdrawFunds")
        }
    }
 };

 async function submitAirline() {
    let active_user = document.getElementById("accounts_active_user").value;
    let add_airline = document.getElementById("accounts_add_airline").value;
    try{
        addLog("Registering airline.", "RegisteringAirline")
        await flightSuretyApp.methods.registerAirline(add_airline,true).send({ from: active_user, gas: CONSTANT_GAS});
    }
    catch(err){
        if(err.message.includes("revert")){
            addLog("Error on register. "+err.message.split("revert")[1], "RegisteringAirline");
        }
        else{
            addLog("Error, please check console for more details.")
        }
        console.log(err);
    }
};



async function submitFunds() {
    let active_user = document.getElementById("accounts_active_user").value;

    try{
        await flightSuretyApp.methods.addFunds().send({ from: active_user, gas: CONSTANT_GAS, value: web3.utils.toWei('10', 'ether')});
        let data = await flightSuretyApp.methods.contractBalance().call();
        contractBalance(data)
        console.log("Submitted funds")
    }
    catch(err){
        if(err.message.includes("revert")){
            addLog("Error on register. "+err.message.split("revert")[1], "RegisteringAirline");
        }
        else{
            addLog("Error, please check console for more details.")
        }
        console.log(err);
    }
};

async function getAirline() {
    let active_user = document.getElementById("accounts_active_user").value;

    let short_user = active_user.substring(0,8) +"......"+ active_user.substring(38,42)

    try{
        let data = await flightSuretyApp.methods.getAirlineInfo(active_user).call({ });

        addLog("Airline: "+ short_user+", Funds: "+data[1]+", status: "+data[2], "AirlineInfo")
    }
    catch(err){
        console.log(err);
    }
};

async function registerFlight() {
    let active_user = document.getElementById("accounts_active_user").value;
    
    let flight = document.getElementById("flights_add_flight_drop").value;

    try{
        addLog("Adding Fligh "+flight, "RegisterFlight")
        let data = await flightSuretyApp.methods.registerFlight(flight).send({ from: active_user, gas: CONSTANT_GAS });

    }
    catch(err){
        if(err.message.includes("revert")){
            addLog("Error on register. "+err.message.split("revert")[1], "RegisterFlight");
        }
        else{
            addLog("Error, please check console for more details.")
        }
        console.log(err);
    }
};

async function searchInsurance() {
    let active_user = document.getElementById("accounts_active_user").value;
    
    let flight = document.getElementById("flights_search_insurance_flight").value;

    try{
        
        let data = await flightSuretyApp.methods.getInsurance(flight).call({ from: active_user });
        addLog("Insurance for passenger: "+data[0]+", flight: "+data[1]+", value: "+data[2]+", claimed: "+data[3], "GetInsurance")
    }
    catch(err){
        addLog("Error, please check console for more details.")
        console.log(err);
    }
};

async function buyInsurance() {
    let active_user = document.getElementById("accounts_active_user").value;
    
    let flight = document.getElementById("flights_insurance_flight").value;
    let amount = document.getElementById("insurance_amount").value;


    try{
        addLog("Buying insurance", "BuyingInsurance");
        await flightSuretyApp.methods.buyInsurance(flight).send({ from: active_user,gas: CONSTANT_GAS, value: web3.utils.toWei(amount.toString(), 'ether') });
        let data = await flightSuretyApp.methods.contractBalance().call();
        contractBalance(data)
    }
    catch(err){
        if(err.message.includes("revert")){
            addLog("Error on register. "+err.message.split("revert")[1], "BuyingInsurance");
        }
        else{
            addLog("Error, please check console for more details.", "BuyingInsurance")
        }
        console.log(err);
    }
};

async function triggerOracle(){
    let active_user = document.getElementById("accounts_active_user").value;
    let flight = document.getElementById("flights_flight_search_drop").value;

    addLog("Requesting Oracle for flight "+flight, "OracleTrigger")
    let flightInfo = await flightSuretyApp.methods.getFlightInformation(flight).call();
    console.log(flightInfo);
    await flightSuretyApp.methods.fetchFlightStatus(flightInfo[0], flight, flightInfo[1]).send({from: active_user, gas: CONSTANT_GAS});
}


document.getElementById("withdraw-click").onclick = withdrawFunds;
document.getElementById("add-airline").onclick = submitAirline;
document.getElementById("push-funds").onclick = submitFunds;
document.getElementById("airline-info").onclick = getAirline;
document.getElementById("add-flight").onclick = registerFlight;
document.getElementById("search-insurance").onclick = searchInsurance;
document.getElementById("buy-insurance").onclick = buyInsurance;
document.getElementById("submit-oracle").onclick = triggerOracle;


async function initialize() {
    accounts = await web3.eth.getAccounts()
    owner = accounts[0];

    let opStatus = await isOperational();

    let status_parent = document.getElementById("statusDiv");
    
    let status_div = "";
    if(!opStatus){
        status_parent.style = "color:red;";
        status_div = document.createElement("div"); 
        status_div.id = "realStatus"
        status_div.innerHTML =  "&nbsp;" + opStatus + "&nbsp;";
    }
    else{
        status_parent.style = "color:green;";
        status_div = document.createElement("div"); 
        status_div.id = "realStatus"
        status_div.innerHTML = "&nbsp;" + opStatus + "&nbsp;";
    }

    status_parent.appendChild(status_div);  
    
    let user_parent = document.getElementById("user");

    let user_div = document.createElement("div"); 
    user_div.id = "user_div"
    user_div.innerHTML =  "&nbsp;" + owner.substring(0,7) +"..."+ owner.substring(38,42) + "&nbsp;";

    user_parent.appendChild(user_div);  

    let data = await flightSuretyApp.methods.contractBalance().call();
    contractBalance(data)
    

    generateAccountDropdown("add_airline", accounts);
    generateAccountDropdown("active_user", accounts);

};

initialize()

// Events from Emits
flightSuretyApp.events.RegisteringAirline( {}, (err, event) => {
    if (err) {
        addLog("Error registering airline see console for more info. ", "RegisteringAirline - Event")
        console.log(err)
    } else {
        addLog("Registed airline "+event.returnValues[0].substring(0,8) +"......"+ event.returnValues[0].substring(38,42), "RegisteringAirline - Event")
        console.log(event.returnValues)
    }
})

flightSuretyApp.events.AddedFunds( {}, (err, event) => {
    if (err) {
        addLog("Error adding funds see console for more info. ", "AddingFunds - Event")
        console.log(err)
    } else {
        addLog("Funds Added with airline: "+event.returnValues[0].substring(0,8) +"......"+ event.returnValues[0].substring(38,42)+", funds: "+event.returnValues[1], "AddingFunds - Event")
        console.log(event.returnValues)
    }
})

flightSuretyApp.events.AirlineVote( {}, (err, event) => {
    if (err) {
        addLog("Error Voting, see console. ", "RegisteringAirline - Event")
        console.log(err)
    } else {
        addLog("Votes for airline: "+event.returnValues[0].substring(0,8) +"......"+ event.returnValues[0].substring(38,42)+", from airline: "+event.returnValues[0].substring(0,8) +"......"+ event.returnValues[0].substring(38,42), "RegisteringAirline - Event")
        console.log(event.returnValues)
    }
})

flightSuretyApp.events.FlightRegistered( {}, (err, event) => {
    if (err) {
        addLog("Error storing flight, see console. ", "FlightRegistered - Event")
        console.log(err)
    } else {
        addLog("Flight stored for airline "+event.returnValues[0].substring(0,8) +"......"+ event.returnValues[0].substring(38,42)+", flight: "+event.returnValues[1], "FlightRegistered - Event")
        console.log(event.returnValues)
    }
})

flightSuretyApp.events.InsuranceBought( {}, (err, event) => {
    if (err) {
        addLog("Error buying insurance, see console. ", "InsuranceBought - Event")
        console.log(err)
    } else {
        addLog("Insurance bought for passenger "+event.returnValues[0].substring(0,8) +"......"+ event.returnValues[0].substring(38,42)+", flight: "+event.returnValues[1], "InsuranceBought - Event")
        console.log(event.returnValues)
    }
})

flightSuretyApp.events.FlightStatusInfo({fromBlock:"latest"}, (err, event) => {
    if (err){
        console.log(err)
        addLog("Error in flight status ", "FlightStatus - Event")
    } 
    else{
        addLog("Update flight, flight: "+event.returnValues[1]+", and status: "+event.returnValues[3], "FlightStatus - Event")

        console.log(event.returnValues)
        console.log("Finished FlightStatusInfo")
    }
    
  });

