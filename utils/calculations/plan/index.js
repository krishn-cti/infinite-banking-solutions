import { areAllDebtsPaidOff, roundAllNumbersInCalculations } from "./helpers/index.js";
import { initialize } from "./steps/1initialize.js";
import { premium } from "./steps/2premium.js";
import { borrow } from "./steps/3borrow.js";
import { principal } from "./steps/4principal.js";
import { debts } from "./steps/5debts.js";
import { repay } from "./steps/6repay.js";

// Initialize the currentYearData
export function createPlan(data, policy) {
  let plan = [];

  let currentYearData = JSON.parse(JSON.stringify(data));

  currentYearData.year = 0;

  currentYearData.calculations = {
    year: 0,

    supplement_required_for_initial_premium_payment: 0,

    starting_heloc_balance: 0,
    starting_heloc_room: 0,

    first_heloc_draw: 0,
    heloc_balance_after_first_heloc_draw: 0,
    heloc_room_after_first_heloc_draw: 0,

    initial_gross_policy_loan_available: 0,
    starting_policy_loan_balance: 0,
    initial_net_policy_loan_available: 0,

    additional_policy_loan_taken: 0,
    policy_loan_balance_after_additional_policy_loan_taken: 0,
    heloc_room_increase_after_the_additional_principal_payment: 0,

    starting_mortgage_balance: 0,

    additional_mortgage_principal_payment: 0,
    mortgage_balance_after_additional_principal_payment: 0,
    heloc_room_after_additional_principal_payment: 0,

    second_heloc_draw: 0,
    heloc_balance_after_second_heloc_draw: 0,
    heloc_room_after_second_heloc_draw: 0,

    credit_item_initial_monthly_payments: (function () {
      let payments = [];
      let creditItems = data.credit.sort((a, b) => b.interest_rate - a.interest_rate);
      creditItems.forEach((item) => payments.push(item.calculated_monthly_minimum_payment_expense));
      return payments;
    })(),

    loan_item_initial_monthly_payments: (function () {
      let payments = [];
      let loanItems = data.loans.sort((a, b) => b.interest_rate - a.interest_rate);
      loanItems.forEach((item) => payments.push(item.calculated_monthly_payment_expense));
      return payments;
    })(),

    specific_credit_balance_payments_this_year: [],
    specific_loan_balance_payments_this_year: [],

    total_credit_balances_paid_this_year: 0,
    total_loan_balances_paid_this_year: 0,
    total_debt_balances_paid_this_year: 0,

    annualized_credit_payments_redirected_this_year: 0,
    annualized_loan_payments_redirected_this_year: 0,
    annualized_total_debt_payments_redirected_this_year: 0,

    total_annualized_credit_payments_redirected_so_far: 0,
    total_annualized_loan_payments_redirected_so_far: 0,
    total_annualized_debt_payments_redirected_so_far: 0,

    excess_heloc_funds_used_to_pay_back_policy_loan_this_year: 0,

    annual_surplus_budget_available: 0,
    annualized_principal_amount_of_repayments_to_heloc_made_this_year: 0,
    annualized_interest_amount_of_repayments_to_heloc_made_this_year: 0,
    heloc_balance_after_repayments: 0,

    total_heloc_room_increase_after_mortgage_emi_payments_during_the_year: 0,
    total_heloc_room_after_mortgage_emi_payments_during_the_year: 0,

    total_mortgage_emi_interest_paid_this_year: 0,
    ending_mortgage_balance: 0,

    ending_heloc_room: 0,
    ending_heloc_balance: 0,

    ending_policy_loan_balance: 0,
    ending_policy_cash_value: 0,

    ending_assets_this_year: 0,
    ending_liabilities_this_year: 0,
    ending_net_worth_this_year: 0,
  };

  delete currentYearData["policies"];

  plan.push(currentYearData);

  // Continue looping over the years until isDebtsPaidOff returns true - meaning the client is now debt-free
  // while (!areAllDebtsPaidOff(plan[currentYearData.year])) {
  while ((!areAllDebtsPaidOff(plan[currentYearData.year])) && (currentYearData.year < policy.length)) {
    //Calculating Heloc to decide which calculation flow will execute

    // Create a new copy of the current year's data for the new iteration
    currentYearData = JSON.parse(JSON.stringify(plan[currentYearData.year]));

    currentYearData.year++;
    currentYearData.calculations.year++;
    // YEAR START
    // console.log("currentYearData",currentYearData)
    initialize(currentYearData, currentYearData.year, policy);
    premium(currentYearData, currentYearData.year, policy);
    borrow(currentYearData, currentYearData.year, policy);
    principal(currentYearData, currentYearData.year, policy);
    debts(currentYearData, currentYearData.year, policy);
    // YEAR END
    repay(currentYearData, currentYearData.year);

    delete currentYearData["policies"];

    plan.push(currentYearData);
  }

  roundAllNumbersInCalculations(plan);
  return plan;
}
