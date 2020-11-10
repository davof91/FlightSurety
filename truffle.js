var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "glimpse tuna buzz muscle frequent goat side box invite account circle dumb";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*',
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};