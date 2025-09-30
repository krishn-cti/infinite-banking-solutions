// import fs from "fs";
// import { readFile } from "fs/promises";

// DATA SECTION
// import { calculateCurrentMortgageBalance, calculateMonthlyMortgagePaymentExpense, calculateCurrentEquity, calculateRoomAvailable } from "../data/steps/2properties.js";
// import { calculateMonthlyMinimumPaymentExpense } from "../data/steps/3credit.js";
// import { calculateCurrentLoanBalance, calculateMonthlyLoanPaymentExpense } from "../data/steps/4loans.js";
// import { calculateTotals } from "../data/steps/7totals.js";

// POLICY SECTION

// PLAN SECTION
import { areAllDebtsPaidOff, roundAllNumbersInCalculations } from "./helpers/index.js";
import { initialize } from "./steps/1initialize.js";
import { borrow } from "./steps/3borrow.js";
import { debts } from "./steps/5debts.js";
import { repay } from "./steps/6repay.js";

// const uncalculatedInputData = JSON.parse(
//   await readFile(new URL('../../reference_input_data.json', import.meta.url))
// );
// const referenceOutputCase = JSON.parse(
//   await readFile(new URL('../../reference_output_data.json', import.meta.url))
// );

// const data = calculatePreliminaryCaseValues(uncalculatedInputData);
// const policy = combinePolicyData1(uncalculatedInputData.data);

// Initialize the currentYearData
export function createPlanWithNoProp(data, policy) {
  let plan = [];

  let currentYearData = JSON.parse(JSON.stringify(data));

  currentYearData.year = 0;

  currentYearData.calculations = {
    year: 0,

    supplement_required_for_initial_premium_payment: 0,

    initial_gross_policy_loan_available: 0,
    starting_policy_loan_balance: 0,
    initial_net_policy_loan_available: 0,

    additional_policy_loan_taken: 0,
    policy_loan_balance_after_additional_policy_loan_taken: 0,

    starting_mortgage_balance: 0,

    additional_mortgage_principal_payment: 0,
    mortgage_balance_after_additional_principal_payment: 0,

    credit_item_initial_monthly_payments: (function () {
      let payments = [];
      let creditItems = data.credit.sort((a, b) => b.interest_rate - a.interest_rate);
      creditItems.forEach((item) => payments.push(item.calculated_monthly_minimum_payment_expense));
      return payments;
    })(),

    loan_item_initial_monthly_payments: (function () {
      let payments = [];
      let loanItems = data.loans.sort(
        (a, b) => a.calculated_current_loan_balance - b.calculated_current_loan_balance
      );
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

    annual_surplus_budget_available: 0,

    total_mortgage_emi_interest_paid_this_year: 0,
    ending_mortgage_balance: 0,

    ending_policy_loan_balance: 0,
    ending_policy_cash_value: 0,

    ending_assets_this_year: 0,
    ending_liabilities_this_year: 0,
    ending_net_worth_this_year: 0,
  };

  delete currentYearData["policies"];

  plan.push(currentYearData);


  // Continue looping over the years until isDebtsPaidOff returns true - meaning the client is now debt-free
  // while (!areAllDebtsPaidOff(plan[currentYearData.year]) ) {
  while ((!areAllDebtsPaidOff(plan[currentYearData.year])) && (currentYearData.year < policy.length)) {
    //Calculating Heloc to decide which calculation flow will execute

    // Create a new copy of the current year's data for the new iteration
    currentYearData = JSON.parse(JSON.stringify(plan[currentYearData.year]));

    currentYearData.year++;
    currentYearData.calculations.year++;
    // YEAR START

    initialize(currentYearData, currentYearData.year, policy);
    borrow(currentYearData, currentYearData.year, policy);
    debts(currentYearData, currentYearData.year, policy);
    // YEAR END
    repay(currentYearData, currentYearData.year, policy);

    delete currentYearData["policies"];

    plan.push(currentYearData);

  }

  roundAllNumbersInCalculations(plan);
  return plan;
}
