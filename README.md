# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Software version
Truffle v5.1.46 (core: 5.1.46)
Solidity - ^0.4.24 (solc-js)
Node v10.23.0
Web3.js v1.2.1

## Whats in the code
You can test everything except the oracles on the test directory with flightSurety.js

Oracles can be ran from `server` and the dapp

## The Dapp
The dapp has 3 section. The top bar were you can find the contract balance, the owner address, and the status of contract. Below you got the section of buttons for the active user you are using. You can change this to select an address to use current user.

The second section is on the left. You got a scrollable secion for performing different actions. This are create airlines, create flights, etc. This all have to be created with the owner account from the beginning. 

Thrid section is the logger on the left to show what is going on in the dapp when you are collaing the different functions. this is for feedback to the user.