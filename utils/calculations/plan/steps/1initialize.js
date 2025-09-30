import { round } from '../../utils.js';
import { calculateCurrentMortgageBalance } from '../../data/index.js';
import {
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateNetWorth,
  calculatePolicyLoanAvailable,
  calculateSubsequentCaseValues
} from '../helpers/index.js';
import {
  ANNUAL_INCOME_GROWTH_RATE,
  ANNUAL_INVESTMENTS_GROWTH_RATE
} from '../../constants.js';
import Decimal from 'decimal.js';

// Step 1 - Initialize: Set year start values (and check which loans are paid off and redirect payments) and initialize previous *year end* values to be equal to current *year start* values
export function initialize(data, year, policy) {
  if (year < policy.length) {
    if (year > 1) {
      grow(data);
    }

    data.calculations.supplement_required_for_initial_premium_payment = 0;

    data.calculations.starting_heloc_balance = 0;
    data.calculations.starting_heloc_room = 0;

    data.calculations.first_heloc_draw = 0;
    data.calculations.heloc_balance_after_first_heloc_draw = 0;
    data.calculations.heloc_room_after_first_heloc_draw = 0;

    data.calculations.initial_gross_policy_loan_available = 0;
    data.calculations.starting_policy_loan_balance = 0;
    data.calculations.initial_net_policy_loan_available = 0;

    data.calculations.additional_policy_loan_taken = 0;
    data.calculations.policy_loan_balance_after_additional_policy_loan_taken = 0;
    data.calculations.heloc_room_increase_after_the_additional_principal_payment = 0;

    data.calculations.starting_mortgage_balance = 0;

    data.calculations.additional_mortgage_principal_payment = 0;
    data.calculations.mortgage_balance_after_additional_principal_payment = 0;
    data.calculations.heloc_room_after_additional_principal_payment = 0;

    data.calculations.second_heloc_draw = 0;
    data.calculations.heloc_balance_after_second_heloc_draw = 0;
    data.calculations.heloc_room_after_second_heloc_draw = 0;

    data.calculations.specific_credit_balance_payments_this_year = [];
    data.calculations.specific_loan_balance_payments_this_year = [];

    data.calculations.total_credit_balances_paid_this_year = 0;
    data.calculations.total_loan_balances_paid_this_year = 0;
    data.calculations.total_debt_balances_paid_this_year = 0;
    data.calculations.total_outstanding_debt_balances = 0;

    data.calculations.annualized_credit_payments_redirected_this_year = 0;
    data.calculations.annualized_loan_payments_redirected_this_year = 0;
    data.calculations.annualized_total_debt_payments_redirected_this_year = 0;

    data.calculations.excess_heloc_funds_used_to_pay_back_policy_loan_this_year = 0;

    data.calculations.annual_surplus_budget_available = 0;
    data.calculations.annualized_principal_amount_of_repayments_to_heloc_made_this_year = 0;
    data.calculations.annualized_interest_amount_of_repayments_to_heloc_made_this_year = 0;
    data.calculations.heloc_balance_after_repayments = 0;

    data.calculations.total_heloc_room_increase_after_mortgage_emi_payments_during_the_year = 0;
    data.calculations.total_heloc_room_after_mortgage_emi_payments_during_the_year = 0;

    data.calculations.total_mortgage_emi_interest_paid_this_year = 0;
    data.calculations.ending_mortgage_balance = 0;

    data.calculations.ending_heloc_room = 0;
    data.calculations.ending_heloc_balance = 0;

    data.calculations.ending_assets_this_year = 0;
    data.calculations.ending_liabilities_this_year = 0;
    data.calculations.ending_net_worth_this_year = 0;

    data = calculateSubsequentCaseValues(data, year * 12 - 12);

    data.calculations.ending_assets_this_year = calculateTotalAssets(data);
    data.calculations.ending_liabilities_this_year =
      calculateTotalLiabilities(data);
    data.calculations.ending_net_worth_this_year = calculateNetWorth(data);

    const property = data.properties[0];
    const heloc = property.heloc;
    const mortgage = property.mortgage;
    data.calculations.starting_heloc_room = round(
      heloc.calculated_room_available
    );

    data.calculations.initial_gross_policy_loan_available = round(
      calculatePolicyLoanAvailable(data, year, policy)
    );

    data.calculations.ending_policy_cash_value = round(
      policy[year - 1].total_cash_value
    );

    const monthsOffset = year * 12;

    if (year > 0) {
      const endingBalance = isNaN(Number(data.calculations?.ending_policy_loan_balance))
        ? 0 : Number(data.calculations.ending_policy_loan_balance);

      data.calculations.starting_policy_loan_balance = round(endingBalance);
      data.calculations.ending_policy_loan_balance = round(endingBalance);

      data.calculations.initial_net_policy_loan_available = round(
        Number(data.calculations.initial_gross_policy_loan_available) -
        Number(data.calculations.starting_policy_loan_balance)
      );

      data.calculations.starting_heloc_balance = heloc.balance;
      data.calculations.ending_heloc_balance = heloc.balance;

      mortgage.calculated_current_loan_balance = calculateCurrentMortgageBalance(
        mortgage,
        monthsOffset - 12
      );

      data.calculations.starting_mortgage_balance =
        mortgage.calculated_current_loan_balance;
    }
  }
}

// Apply growth values during step 1.
function grow(data) {
  // Apply income growth
  data.people.forEach((person) => {
    if (person.year_on_year_growth !== undefined) {
      person.monthly_net_income =
        person.monthly_net_income * (person.year_on_year_growth / 100 + 1);
      person.monthly_bonuses_dividends_income =
        Number(person.monthly_bonuses_dividends_income) *
        (person.year_on_year_growth / 100 + 1);
      person.monthly_other_income =
        person.monthly_other_income * (person.year_on_year_growth / 100 + 1);
    } else {
      person.monthly_net_income *= ANNUAL_INCOME_GROWTH_RATE; // 3% growth rate
      person.monthly_bonuses_dividends_income *= ANNUAL_INCOME_GROWTH_RATE;
      person.monthly_other_income *= ANNUAL_INCOME_GROWTH_RATE;
    }
    // Round to 2 decimal places
    person.monthly_net_income = person.monthly_net_income;
    person.monthly_bonuses_dividends_income = round(
      Number(person.monthly_bonuses_dividends_income)
    );
    person.monthly_other_income = person.monthly_other_income;
  });

  // Apply property appreciation
  // data.properties.forEach((property) => {
  //   property.current_value *= 1.03; // 3% appreciation rate

  //   // Round to 2 decimal places
  //   property.current_value = property.current_value;
  // });

  // Apply investment growth
  data.investments.forEach((investment) => {
    if (investment?.year_on_year_growth) {
      investment.balance =
        investment.balance * (investment?.year_on_year_growth / 100 + 1);
    } else {
      investment.balance *= ANNUAL_INVESTMENTS_GROWTH_RATE; // 4% growth rate
    }
    // Round to 2 decimal places
    investment.balance = investment.balance;
  });

}
