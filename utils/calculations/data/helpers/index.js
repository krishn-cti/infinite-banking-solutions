import {
  calculateAmortizationSchedule,
  calculateCurrentMonthInLoan,
  monthlyInterest
} from '../../utils.js';

export function calculateMonthlyPaymentExpense(loan, monthsOffset = 0) {
  if (monthsOffset === 0) {
    const monthlyRate = monthlyInterest(loan.interest_rate);
    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = loan.financed_amount / loan.loan_length_in_months;
    } else {
      monthlyPayment =
        (loan.financed_amount * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -loan.loan_length_in_months));
    }
    return monthlyPayment;
  }

  // Generate the amortization schedule
  const schedule = calculateAmortizationSchedule(loan);
  // Determine the current month in the loan with offset
  const currentMonth = calculateCurrentMonthInLoan(loan, monthsOffset);

  // In the data that the loan period has ended, return 0
  if (currentMonth > schedule.length) {
    return 0;
  }
  // Use the current month's payment amount
  const monthlyPayment =
    parseFloat(schedule[currentMonth - 1].principal_payment) +
    parseFloat(schedule[currentMonth - 1].interest_payment);

  return monthlyPayment;
}

export function calculateCurrentBalance(loan, monthsOffset = 0) {
  const monthsPassed = calculateCurrentMonthInLoan(loan, monthsOffset);

  if (monthsPassed >= loan.loan_length_in_months) {
    return 0;
  }

  // Calculate the amortization schedule up to the current month
  const schedule = calculateAmortizationSchedule(loan);
  // If we've already calculated the schedule for this month, return the ending balance
  return monthsPassed < schedule.length
    ? parseFloat(schedule[monthsPassed].end_balance)
    : 0;
}
