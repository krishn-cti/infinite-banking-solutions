
import Decimal from 'decimal.js';

// Calculate a monthly interest rate from a given annual rate
export function monthlyInterest(annual_interest_rate) {
  return annual_interest_rate / 100 / 12;
}

// Reduce (sum) data inside an object based on keys
export function reduceData(data, firstKey, secondKey = null) {
  let reduced = data.reduce(
    (total, balance) =>
      secondKey ? total + balance[firstKey][secondKey] : total + balance[firstKey],
    0
  );
  return reduced;
}

// Round a number to 2 decimal places
export function round(num) {
  return Number(parseFloat(num).toFixed(2));
}

/**
 * Calculates an amortization schedule, accounting for extraPrincipalPayments represented inside the loan object
 * An example of extraPrincipalPayments would be: [{month: 25, amount: 2000}, {month: 52, amount: 5000}]
 *
 * @example
 * const loan = {
 *   "financed_amount": 500000,
 *   "loan_start_date": "01/01/2024",
 *   "loan_length_in_months": 240,
 *   "interest_rate": 3.5,
 *   "calculated_current_loan_balance": 495000,
 *   "calculated_monthly_payment_expense": 2998.57,
 *   "extra_principal_payments": [
 *     {"month": 24, "amount": 5000},
 *     {"month": 120, "amount": 10000}
 *   ]
 * };
 *
 * @param {Object} loan - The loan details
 * @param {number} loan.financed_amount - The amount financed for the loan
 * @param {string} loan.loan_start_date - The start date of the loan
 * @param {number} loan.loan_length_in_months - The length of the loan in months
 * @param {number} loan.interest_rate - The interest rate for the loan
 * @param {number} loan.calculated_current_loan_balance - The calculated current balance of the loan
 * @param {number} loan.calculated_monthly_payment_expense - The calculated monthly payment amount
 * @param {Array} loan.extra_principal_payments - An array of extra principal payments, which is optional
 *
 * @returns {Array} Amortization schedule
 *
 * @example
 * const schedule = calculateAmortizationSchedule(loan);
 *
 */
export function calculateAmortizationSchedule(loan) {
  const loanLength = loan.loan_length_in_months;
  const interestRate = new Decimal(monthlyInterest(loan.interest_rate));
  const monthlyPayment = new Decimal(
    loan.calculated_monthly_payment_expense || 0
  );

  const extraPrincipalPayments = loan.extra_principal_payments || []; // Directly get extra_principal_payments from loan object
  let extraPaymentIndex = 0;

  let schedule = [];
  let startBalance = new Decimal(loan.financed_amount);

  for (let i = 1; i <= loanLength; i++) {
    let interestPayment = startBalance.times(interestRate);
    let principalPayment = monthlyPayment.minus(interestPayment);
    let endBalance = startBalance.minus(principalPayment);

    // Check if there's an extra payment for the current month
    if (
      extraPaymentIndex < extraPrincipalPayments.length &&
      extraPrincipalPayments[extraPaymentIndex].month === i
    ) {
      const extraPayment = new Decimal(
        extraPrincipalPayments[extraPaymentIndex].amount
      );
      endBalance = endBalance.minus(extraPayment);
      principalPayment = principalPayment.plus(extraPayment);
      extraPaymentIndex++;
    }

    if (endBalance.lessThan(0)) {
      principalPayment = principalPayment.plus(endBalance);
      endBalance = new Decimal(0);
    }

    schedule.push({
      month: i,
      start_balance: startBalance.toFixed(2),
      interest_payment: interestPayment.toFixed(2),
      principal_payment: principalPayment.toFixed(2),
      end_balance: endBalance.toFixed(2)
    });

    if (endBalance.equals(0)) {
      break;
    }

    startBalance = endBalance;
  }

  return schedule;
}

// Calculate the current month in a loan object, with an optional offset of monthsOffset to enable future year calculations
export function calculateCurrentMonthInLoan(loan, monthsOffset = 0) {
  const loanStartDate = new Date(loan.loan_start_date);
  const now = new Date();

  const monthsPassed =
    (now.getFullYear() - loanStartDate.getFullYear()) * 12 +
    now.getMonth() -
    loanStartDate.getMonth() +
    monthsOffset;

  return monthsPassed;
}

export function validateLoanMonth(month, startLoanDate) {
  const millisecondsPerMonth = 30.44 * 24 * 60 * 60 * 1000;
  const startDate = new Date(startLoanDate)?.getTime();
  const currentDate = new Date().getTime();
  const monthDiff = Math.floor(
    (currentDate - startDate) / millisecondsPerMonth
  );
  return Number(month) >= monthDiff;
}




// ** PDF GENERATION **

export const GENERATE_PDF = async (html) => {
  const css = getAllCSSStyles();
  try {
    const response = await fetch(PDF_DOWNLOAD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html,
        css
      })
    });
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    throw new Error(error);
  }
};
