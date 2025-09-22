// Contract address - will be updated after deployment
export const CONTRACT_ADDRESS = "0xae9d7dbe2f49ba692cb6e81db6bfd6b7adb17cf5ee7a855f86af3c7336878a6d";

// Contract module and function names
export const CONTRACT_MODULE = "0xae9d7dbe2f49ba692cb6e81db6bfd6b7adb17cf5ee7a855f86af3c7336878a6d::sober_cash";

// Function names
export const FUNCTIONS = {
  INITIALIZE_USER: "initialize_user",
  ADD_SUBSTANCE: "add_substance",
  REMOVE_SUBSTANCE: "remove_substance",
  UPDATE_SUBSTANCE: "update_substance",
};

// View function names
export const VIEW_FUNCTIONS = {
  IS_INITIALIZED: "is_initialized",
  GET_ACTIVE_SUBSTANCES_COUNT: "get_active_substances_count",
  GET_TOTAL_SUBSTANCES_COUNT: "get_total_substances_count",
  GET_SUBSTANCE: "get_substance",
  CALCULATE_MONEY_SAVED_DOLLARS: "calculate_money_saved_dollars",
  CALCULATE_TIME_SAVED_HOURS: "calculate_time_saved_hours",
  GET_GLOBAL_STATS: "get_global_stats",
};

// Common substance types for quick setup
export const COMMON_SUBSTANCES = {
  CIGARETTES: {
    name: "Cigarettes",
    cost_per_day_cents: 1000, // $10.00
    hours_per_day: 2,
  },
  ALCOHOL: {
    name: "Alcohol",
    cost_per_day_cents: 2000, // $20.00
    hours_per_day: 3,
  },
  COFFEE: {
    name: "Coffee",
    cost_per_day_cents: 500, // $5.00
    hours_per_day: 1,
  },
  MARIJUANA: {
    name: "Marijuana",
    cost_per_day_cents: 1500, // $15.00
    hours_per_day: 2,
  },
};
