import { round } from '../../utils.js';
import { calculateRoomAvailable } from '../../data/index.js';
import {
  isHelocTheOnlyDebt,
  calculatePolicyLoanAvailable,
  isPolicyLoanTheOnlyDebt
} from '../helpers/index.js';

// Step 2 - Premium: Make this year's policy premium payment and PUA via a HELOC draw
export function premium(data, year, policy) {
  // console.log("data=>", data.calculations)
  const cost =
    policy[year - 1]?.guaranteed_required_annual_premium +
    policy[year - 1]?.total_deposit;

  const property = data.properties[0];
  const heloc = property.heloc;

  const policyLoanOnlyDebtRemaining = isPolicyLoanTheOnlyDebt(data);

  const policyLoanAvailable = calculatePolicyLoanAvailable(data, year, policy);
  let amountToDraw = 0;
  if (
    !policyLoanOnlyDebtRemaining &&
    !(policyLoanAvailable >= heloc.balance && isHelocTheOnlyDebt(data))
  ) {
    // Normal Case
    amountToDraw = cost;
    if (
      data.calculations.starting_heloc_room < 0 ||
      (data.calculations.starting_heloc_room < cost && year > 1)
    ) {
      //Make payment via annual budget surplus
      makePremuimPaymentFromBudgetInsteadOfHeloc(data, cost);
      amountToDraw = 0;
    } else if (data.calculations.starting_heloc_room < cost && year == 1) {
      // Twilight Case
      if (data.combined?.supplement) {
        amountToDraw = data.calculations.starting_heloc_room;
      }
    }

    heloc.balance = heloc.balance + amountToDraw;
    heloc.calculated_room_available = calculateRoomAvailable(property);
    data.calculations.first_heloc_draw = amountToDraw;
    data.calculations.heloc_balance_after_first_heloc_draw = round(
      heloc.balance
    );
    data.calculations.heloc_room_after_first_heloc_draw = round(
      heloc.calculated_room_available
    );
    data.calculations.ending_heloc_balance = heloc.balance;
    data.calculations.ending_heloc_room = round(
      Number(heloc.calculated_room_available)
    );
  } else {
    makePremuimPaymentFromBudgetInsteadOfHeloc(data, cost);
  }
}

function makePremuimPaymentFromBudgetInsteadOfHeloc(data, cost) {
  // console.log("totals",data.totals)
  // console.log("expense",data.expenses.monthly_policy_premium_expense)
  data.expenses.monthly_policy_premium_expense = cost / 12;
  let newMonthlyBudget = round(
    Number(data.totals.calculated_monthly_final_surplus_budget) -
      Number(data.expenses.monthly_policy_premium_expense)
  );
  newMonthlyBudget = newMonthlyBudget >= 0 ? newMonthlyBudget : 0;

  data.totals.calculated_monthly_final_surplus_budget = Number(newMonthlyBudget);
}
