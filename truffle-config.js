/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation, and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * https://trufflesuite.com/docs/truffle/reference/configuration
 *
 * Hands-off deployment with Infura
 * --------------------------------
 *
 * Do you have a complex application that requires lots of transactions to deploy?
 * Use this approach to make deployment a breeze 🏖️:
 *
 * Infura deployment needs a wallet provider (like @truffle/hdwallet-provider)
 * to sign transactions before they're sent to a remote public node.
 * Infura accounts are available for free at 🔍: https://infura.io/register
 *
 * You'll need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. You can store your secrets 🤐 in a .env file.
 * In your project root, run `$ npm install dotenv`.
 * Create .env (which should be .gitignored) and declare your MNEMONIC
 * and Infura PROJECT_ID variables inside.
 * For example, your .env file will have the following structure:
 *
 * MNEMONIC = <Your 12 phrase mnemonic>
 * PROJECT_ID = <Your Infura project id>
 *
 * Deployment with Truffle Dashboard (Recommended for best security practice)
 * --------------------------------------------------------------------------
 *
 * Are you concerned about security and minimizing rekt status 🤔?
 * Use this method for best security:
 *
 * Truffle Dashboard lets you review transactions in detail, and leverages
 * MetaMask for signing, so there's no need to copy-paste your mnemonic.
 * More details can be found at 🔎:
 *
 * https://trufflesuite.com/docs/truffle/getting-started/using-the-truffle-dashboard/
 */

require('dotenv').config();

module.exports = {
  // Directory configurations
  contracts_directory: './contracts/',
  migrations_directory: './.cursor/engineering/',
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache-cli, geth or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      network_id: "*",       // Any network (default: none)
    },

    // Mars Credit Network mainnet configuration
    marscredit: {
      provider: () => {
        const HDWalletProvider = require('@truffle/hdwallet-provider');
        return new HDWalletProvider({
          privateKeys: [process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000'],
          providerOrUrl: process.env.RPC_URL || 'https://rpc.marscredit.xyz:443', // Working endpoint with port
          chainId: 110110,
          networkCheckTimeout: 10000,
          timeoutBlocks: 200
        });
      },
      network_id: 110110,
      gas: 3000000,
      gasPrice: 100000000, // 0.1 gwei - very low for Mars Credit Network
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },

    // Mars Credit Network testnet (if available)
    marscredit_testnet: {
      provider: () => {
        const HDWalletProvider = require('@truffle/hdwallet-provider');
        return new HDWalletProvider({
          privateKeys: [process.env.TESTNET_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000'],
          providerOrUrl: process.env.TESTNET_RPC_URL || 'https://testnet-rpc.marscredit.xyz', // This will need to be provided
          chainId: 110110,
          networkCheckTimeout: 10000,
          timeoutBlocks: 200
        });
      },
      network_id: 110110,
      gas: 8000000,
      gasPrice: 20000000000, // 20 gwei
      confirmations: 1,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },

  // Set default mocha options here, use special reporters, etc.
  mocha: {
    timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.20",    // Updated for OpenZeppelin compatibility
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: false     // Disable optimizer for debugging
        },
        evmVersion: "istanbul" // Compatible with EVM 1.10.18
      }
    }
  },

  // Truffle DB is currently disabled by default; to enable it, change enabled:
  // false to enabled: true. The default storage location can also be
  // overridden by specifying the adapter settings, as shown in the commented code below.
  //
  // NOTE: It is not possible to migrate your contracts to truffle DB and you should
  // make a backup of your artifacts to a safe location before enabling this feature.
  //
  // After you backed up your artifacts you can utilize db by running migrate as follows:
  // $ truffle migrate --reset --compile-all
  //
  // db: {
  //   enabled: false,
  //   host: "127.0.0.1",
  //   adapter: {
  //     name: "indexeddb",
  //     settings: {
  //       directory: ".db"
  //     }
  //   }
  // }
};
