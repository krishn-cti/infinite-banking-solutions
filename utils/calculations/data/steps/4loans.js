import {
  calculateMonthlyPaymentExpense,
  calculateCurrentBalance
} from '../helpers/index.js';

//================================================================//
//data.loans[i].calculated_monthly_payment_expense
//================================================================//
// Calculate the monthly payment expense for any loan object, with an optional offset of monthsOffset to enable future year calculations
export function calculateMonthlyLoanPaymentExpense(loan, monthsOffset = 0) {
  return calculateMonthlyPaymentExpense(loan, monthsOffset);
}

//================================================================//
//data.loans[i].calculated_current_loan_balance
//================================================================//
// Calculate the current balance of any given loan object, with an optional offset
export function calculateCurrentLoanBalance(loan, monthsOffset = 0) {
  return calculateCurrentBalance(loan, monthsOffset);
}
