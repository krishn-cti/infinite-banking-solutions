import { round } from "../../utils.js";
import {
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateNetWorth,
  calculatePolicyLoanAvailable,
  calculateSubsequentCaseValues,
} from "../helpers/index.js";
import { ANNUAL_INCOME_GROWTH_RATE, ANNUAL_INVESTMENTS_GROWTH_RATE } from "../../constants.js";

// Step 1 - Initialize: Set year start values (and check which loans are paid off and redirect payments) and initialize previous *year end* values to be equal to current *year start* values
export function initialize(data, year, policy) {
  if (year < policy.length) {
    if (year > 1) {
      grow(data);
    }

    data.calculations.supplement_required_for_initial_premium_payment = 0;

    data.calculations.initial_gross_policy_loan_available = 0;
    data.calculations.starting_policy_loan_balance = 0;
    data.calculations.starting_liabilities_this_year = calculateTotalLiabilities(data);
    data.calculations.initial_net_policy_loan_available = 0;

    data.calculations.additional_policy_loan_taken = 0;
    data.calculations.policy_loan_balance_after_additional_policy_loan_taken = 0;

    data.calculations.specific_credit_balance_payments_this_year = [];
    data.calculations.specific_loan_balance_payments_this_year = [];

    data.calculations.total_credit_balances_paid_this_year = 0;
    data.calculations.total_loan_balances_paid_this_year = 0;
    data.calculations.total_debt_balances_paid_this_year = 0;
    data.calculations.total_outstanding_debt_balances = 0;

    data.calculations.annualized_credit_payments_redirected_this_year = 0;
    data.calculations.annualized_loan_payments_redirected_this_year = 0;
    data.calculations.annualized_total_debt_payments_redirected_this_year = 0;

    data.calculations.annual_surplus_budget_available = 0;

    data.calculations.ending_assets_this_year = 0;
    data.calculations.ending_liabilities_this_year = 0;
    data.calculations.ending_net_worth_this_year = 0;

    data = calculateSubsequentCaseValues(data, year * 12 - 12);

    data.calculations.ending_assets_this_year = calculateTotalAssets(data);
    data.calculations.ending_liabilities_this_year = calculateTotalLiabilities(data);
    data.calculations.ending_net_worth_this_year = calculateNetWorth(data);

    data.calculations.initial_gross_policy_loan_available = round(
      calculatePolicyLoanAvailable(data, year, policy)
    );


    data.calculations.ending_policy_cash_value = round(policy[year - 1].total_cash_value);
    const monthsOffset = year * 12;

    if (year > 0) {
      data.calculations.starting_policy_loan_balance = round(
        Number(data.calculations.ending_policy_loan_balance)
      );

      data.calculations.ending_policy_loan_balance = round(
        Number(data.calculations.starting_policy_loan_balance)
      );

      data.calculations.initial_net_policy_loan_available = round(
        Number(data.calculations.initial_gross_policy_loan_available)
      );
    }
  }
}

function grow(data) {
  // Apply income growth
  data.people.forEach((person) => {
    if (person.year_on_year_growth !== undefined) {
      person.monthly_net_income =
        person.monthly_net_income * (person.year_on_year_growth / 100 + 1);
      person.monthly_bonuses_dividends_income =
        Number(person.monthly_bonuses_dividends_income) * (person.year_on_year_growth / 100 + 1);
      person.monthly_other_income =
        person.monthly_other_income * (person.year_on_year_growth / 100 + 1);
    } else {
      person.monthly_net_income *= ANNUAL_INCOME_GROWTH_RATE; // 3% growth rate
      person.monthly_bonuses_dividends_income *= ANNUAL_INCOME_GROWTH_RATE;
      person.monthly_other_income *= ANNUAL_INCOME_GROWTH_RATE;
    }
    // Round to 2 decimal places
    person.monthly_net_income = person.monthly_net_income;
    person.monthly_bonuses_dividends_income = round(Number(person.monthly_bonuses_dividends_income));
    person.monthly_other_income = person.monthly_other_income;
  });

  // Apply investment growth
  data.investments.forEach((investment) => {
    if (investment?.year_on_year_growth) {
      investment.balance = investment.balance * (investment?.year_on_year_growth / 100 + 1);
    } else {
      investment.balance *= ANNUAL_INVESTMENTS_GROWTH_RATE; // 4% growth rate
    }
    // Round to 2 decimal places
    investment.balance = investment.balance;
  });
}
