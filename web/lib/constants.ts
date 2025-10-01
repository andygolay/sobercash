export const FULLNODE_URL = 'https://testnet.movementnetwork.xyz/v1';
export const CHAIN_ID = '250';
export const CONTRACT_ADDRESS = '0xbebf677e294f85de30ab41157010eb9953c599d3f2f6ca1210396aa43680eef9';
export const CONTRACT_MODULE = `${CONTRACT_ADDRESS}::sober_cash`;

export const FUNCTIONS = {
  INITIALIZE_USER: 'initialize_user',
  ADD_SUBSTANCE: 'add_substance',
  REMOVE_SUBSTANCE: 'remove_substance',
} as const;

export const VIEW_FUNCTIONS = {
  IS_INITIALIZED: 'is_initialized',
  CALCULATE_MONEY_SAVED_DOLLARS: 'calculate_money_saved_dollars',
  CALCULATE_TIME_SAVED_HOURS: 'calculate_time_saved_hours',
} as const;


