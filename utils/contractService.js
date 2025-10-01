import { CONTRACT_ADDRESS, CONTRACT_MODULE, FUNCTIONS } from '../constants';

/**
 * Simple contract service that builds transaction payloads
 * No Aptos SDK needed - just builds the payloads for Petra wallet
 */
export class ContractService {
  constructor() {
    this.contractAddress = CONTRACT_ADDRESS;
    this.moduleAddress = CONTRACT_MODULE;
  }

  /**
   * Initialize user on the blockchain
   */
  initializeUser() {
    return {
      type: 'entry_function_payload',
      function: `${this.moduleAddress}::${FUNCTIONS.INITIALIZE_USER}`,
      arguments: [],
      type_arguments: []
    };
  }

  /**
   * Add a new substance to user's configuration
   */
  addSubstance(name, costPerDayCents, hoursPerDay, quitTimestamp) {
    return {
      type: 'entry_function_payload',
      function: `${this.moduleAddress}::${FUNCTIONS.ADD_SUBSTANCE}`,
      arguments: [
        name,
        costPerDayCents,
        hoursPerDay,
        quitTimestamp
      ],
      type_arguments: []
    };
  }

  /**
   * Remove a substance from user's configuration
   */
  removeSubstance(name) {
    return {
      type: 'entry_function_payload',
      function: `${this.moduleAddress}::${FUNCTIONS.REMOVE_SUBSTANCE}`,
      arguments: [name],
      type_arguments: []
    };
  }

  /**
   * Update an existing substance
   */
  updateSubstance(name, costPerDayCents, hoursPerDay) {
    return {
      type: 'entry_function_payload',
      function: `${this.moduleAddress}::${FUNCTIONS.UPDATE_SUBSTANCE}`,
      arguments: [
        name,
        costPerDayCents,
        hoursPerDay
      ],
      type_arguments: []
    };
  }

  /**
   * Call contract view functions directly via HTTP
   * This calls the real contract without needing the Aptos SDK
   */
  async callViewFunction(functionName, args = []) {
    try {
      // Movement testnet fullnode
      const response = await fetch('https://full.testnet.movementinfra.xyz/v1/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function: `${this.moduleAddress}::${functionName}`,
          arguments: args,
          type_arguments: []
        })
      });

      const data = await response.json();
      return data[0]; // View functions return an array, we want the first element
    } catch (error) {
      console.log('Error calling view function:', error);
      return 0;
    }
  }

  /**
   * Check if user is initialized
   */
  async isUserInitialized(userAddress) {
    try {
      const isInitialized = await this.callViewFunction('is_initialized', [userAddress]);
      return isInitialized;
    } catch (error) {
      console.log('Error checking if user is initialized:', error);
      return false;
    }
  }

  /**
   * Get real savings from the contract
   */
  async getRealSavings(userAddress) {
    try {
      const moneySaved = await this.callViewFunction('calculate_money_saved_dollars', [userAddress]);
      const timeSaved = await this.callViewFunction('calculate_time_saved_hours', [userAddress]);

      return {
        moneySavedDollars: moneySaved,
        timeSavedHours: timeSaved
      };
    } catch (error) {
      console.log('Error getting real savings:', error);
      return { moneySavedDollars: 0, timeSavedHours: 0 };
    }
  }

  /**
   * Fallback local calculation (only used if contract call fails)
   */
  calculateLocalSavings(substances) {
    const now = Math.floor(Date.now() / 1000);
    let totalMoneySaved = 0;
    let totalTimeSaved = 0;

    substances.forEach(substance => {
      if (substance.isActive) {
        const daysSober = Math.floor((now - substance.quitTimestamp) / 86400);
        const moneySaved = daysSober * substance.costPerDayCents;
        const timeSaved = daysSober * substance.hoursPerDay;

        totalMoneySaved += moneySaved;
        totalTimeSaved += timeSaved;
      }
    });

    return {
      moneySavedCents: totalMoneySaved,
      timeSavedHours: totalTimeSaved,
      moneySavedDollars: totalMoneySaved / 100
    };
  }

}

export const contractService = new ContractService();