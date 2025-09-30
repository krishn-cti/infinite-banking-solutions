import { round, calculateCurrentMonthInLoan } from '../../utils.js';
import {
  calculateMonthlyMortgagePaymentExpense,
  calculateRoomAvailable,
  calculateTotals,
  calculateCurrentEquity
} from '../../data/index.js';
import {
  calculateCurrentLoanBalanceAndUpdateLength,
  isHelocAvailable
} from '../helpers/index.js';

// Step 4 - Principal: Make an extra mortgage principal payment
export function principal(data, year, policy) {
  const property = data.properties[0];
  const mortgage = property.mortgage;
  const currentYear = year * 12;
  const monthsOffset = currentYear - 12;
  const heloc = property.heloc;

  heloc.calculated_room_available = calculateRoomAvailable(property);

  data.calculations.heloc_room_after_additional_principal_payment = round(
    heloc.calculated_room_available
  );

  if (data.calculations.starting_mortgage_balance <= 0) {
    mortgage.calculated_monthly_payment_expense =
      calculateMonthlyMortgagePaymentExpense(mortgage, currentYear);

    property.mortgage.calculated_current_loan_balance =
      calculateCurrentLoanBalanceAndUpdateLength(mortgage, currentYear);

    // TOTALS SECTION CHAINED CALCULATIONS
    calculateTotals(data);
    return;
  }
  let remainingCredit = 0;
  data.credit.forEach((credit, index) => {
    remainingCredit += credit.balance_today;
  });

  let remainingLoan = 0;
  data.loans.forEach((loan, index) => {
    remainingLoan += loan.calculated_current_loan_balance;
  });

  //Change pending_debts to total_outstanding_debt_balances
  data.calculations.total_outstanding_debt_balances =
    remainingCredit + remainingLoan;

  let extraPrincipalPayment = 0;
  if (
    !isHelocAvailable(data, year, policy) &&
    data.calculations.starting_heloc_room < 0
  ) {
    extraPrincipalPayment =
      round(
        data.calculations.additional_policy_loan_taken -
          (remainingCredit + remainingLoan)
      ) > 0
        ? round(
            data.calculations.additional_policy_loan_taken -
              (remainingCredit + remainingLoan)
          )
        : 0;
    data.calculations.mortgage_balance_after_additional_principal_payment =
      data.calculations.starting_mortgage_balance;

    //return;
  } else {
    extraPrincipalPayment = round(
      data.calculations.additional_policy_loan_taken
    );
  }

  data.calculations.additional_mortgage_principal_payment =
    extraPrincipalPayment;

  const currentMonthInLoan =
    calculateCurrentMonthInLoan(mortgage, monthsOffset) + 1;

  mortgage.extra_principal_payments.push({
    month: currentMonthInLoan,
    amount: extraPrincipalPayment
  });

  const balanceAfterAdditionalPayment =
    calculateCurrentLoanBalanceAndUpdateLength(mortgage, monthsOffset);

  // console.log(balanceAfterAdditionalPayment);

  mortgage.calculated_current_loan_balance = balanceAfterAdditionalPayment;

  data.calculations.mortgage_balance_after_additional_principal_payment =
    balanceAfterAdditionalPayment;

  if (
    data.calculations.starting_mortgage_balance > 0 &&
    data.calculations.mortgage_balance_after_additional_principal_payment <= 0
  ) {
    mortgage.calculated_monthly_payment_expense =
      calculateMonthlyMortgagePaymentExpense(mortgage, currentYear);

    property.mortgage.calculated_current_loan_balance =
      calculateCurrentLoanBalanceAndUpdateLength(mortgage, currentYear);

    // TOTALS SECTION CHAINED CALCULATIONS
    calculateTotals(data);
  }

  heloc.calculated_room_available = calculateRoomAvailable(property);
  data.calculations.heloc_room_after_additional_principal_payment = round(
    heloc.calculated_room_available
  );

  // Increase the current equity by the extraPrincipalPayment.
  property.calculated_current_equity = calculateCurrentEquity(property);

  // Recalculate the room available in the HELOC after the extraPrincipalPayment.
  heloc.calculated_room_available = calculateRoomAvailable(property);
}
