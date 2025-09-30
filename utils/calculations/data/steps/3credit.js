import { CREDIT_MINIMUM_PAYMENT_FACTOR } from '../../constants.js';

//================================================================//
// data.credit[i].calculated_monthly_minimum_payment_expense
//================================================================//
export function calculateMonthlyMinimumPaymentExpense(credit) {
  const minimumPayment =
    (credit.balance_today * (credit.interest_rate / 100)) / 12;
  return minimumPayment;
}
