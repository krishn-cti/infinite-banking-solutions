import {
  round,
  calculateAmortizationSchedule,
  calculateCurrentMonthInLoan
} from '../../utils.js';
import {

  calculateMonthlyMinimumPaymentExpense
} from '../../data/index.js';
import {
  isPolicyLoanTheOnlyDebt
} from '../helpers/index.js';

// Step 5 - Debts: Use the increase in HELOC available room (USE NO MORE THAN JUST THE INCREASE as a result of the additional principal payment) to pay down other debts
export function debts(data, year, policy) {
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

  // The additional policy taken is equivilant to the amount that the heloc room is increased when we made the extra principal payment using the policy loan
  let availableFunds = data.calculations.additional_policy_loan_taken;

  let creditPaymentsRedirectedThisYear = 0;
  let loanPaymentsRedirectedThisYear = 0;

  // Sort credit debts and loans by interest rates in descending order
  data.credit.sort((a, b) => b.interest_rate - a.interest_rate);
  data.loans.sort(
    (a, b) =>
      a.calculated_current_loan_balance - b.calculated_current_loan_balance
  );

  // Pay down credit debts
  data.credit.forEach((credit, index) => {
    if (availableFunds > 0 && credit.balance_today > 0 && year > 0) {
      const payment = Math.min(availableFunds, credit.balance_today);
      const oldMinimumPayment =
        data.calculations.credit_item_initial_monthly_payments[index];
      credit.balance_today = credit.balance_today - payment;

      if (credit.balance_today == 0) {
        credit.calculated_monthly_minimum_payment_expense = 0;
        credit.redirected_monthly_minimum_payment_expense = oldMinimumPayment;

        creditPaymentsRedirectedThisYear +=
          credit.redirected_monthly_minimum_payment_expense;
      } else {
        credit.calculated_monthly_minimum_payment_expense =
          calculateMonthlyMinimumPaymentExpense(credit);
        credit.redirected_monthly_minimum_payment_expense =
          oldMinimumPayment - credit.calculated_monthly_minimum_payment_expense;

        creditPaymentsRedirectedThisYear +=
          credit.redirected_monthly_minimum_payment_expense;
      }

      data.calculations.specific_credit_balance_payments_this_year.push({
        [credit.name]: payment,
        fully_paid: credit.calculated_monthly_minimum_payment_expense === 0
      });

      availableFunds -= payment;
    }
  });

  // Calculate total credit debt payments redirected
  data.calculations.total_annualized_credit_payments_redirected_so_far = round(
    data.credit
      .map((credit) => credit.redirected_monthly_minimum_payment_expense * 12)
      .reduce((a, b) => a + b, 0)
  );

  // Pay down loan debts
  data.loans.forEach((loan, index) => {
    if (availableFunds > 0 && loan.calculated_current_loan_balance > 0) {
      const payment = Math.min(
        availableFunds,
        loan.calculated_current_loan_balance
      );

      const oldMonthlyPayment =
        data.calculations.loan_item_initial_monthly_payments[index];

      // Add extra principal payment
      const currentMonthInLoan =
        calculateCurrentMonthInLoan(loan, year * 12 - 12) + 1;
      loan.extra_principal_payments.push({
        month: currentMonthInLoan,
        amount: payment
      });

      // Recalculate loan balance
      loan.calculated_current_loan_balance =
        loan.calculated_current_loan_balance - payment;

      if (loan.calculated_current_loan_balance == 0) {
        loan.calculated_monthly_payment_expense = 0;
        loan.redirected_monthly_payment_expense = oldMonthlyPayment;
        loanPaymentsRedirectedThisYear +=
          loan.redirected_monthly_payment_expense;
      } else {
        const newAmortizationSchedule = calculateAmortizationSchedule(loan);
        loan.loan_length_in_months = newAmortizationSchedule.length;
        loan.redirected_monthly_payment_expense =
          oldMonthlyPayment - loan.calculated_monthly_payment_expense;

        loanPaymentsRedirectedThisYear +=
          loan.redirected_monthly_payment_expense;
      }

      data.calculations.specific_loan_balance_payments_this_year.push({
        [loan.name]: payment,
        fully_paid: loan.calculated_monthly_payment_expense === 0
      });

      data.calculations.annualized_credit_payments_redirected_this_year = round(
        creditPaymentsRedirectedThisYear * 12
      );
      data.calculations.annualized_loan_payments_redirected_this_year = round(
        loanPaymentsRedirectedThisYear * 12
      );

      data.calculations.annualized_total_debt_payments_redirected_this_year =
        round(
          creditPaymentsRedirectedThisYear * 12 +
            loanPaymentsRedirectedThisYear * 12
        );

      availableFunds -= payment;
    }
  });

  // Calculate total loan debt payments redirected
  data.calculations.total_annualized_loan_payments_redirected_so_far = round(
    data.loans
      .map((loan) => Number(loan.redirected_monthly_payment_expense) * 12)
      .reduce((a, b) => a + b, 0)
  );

  // Pay down policy loan debt
  if (Number(availableFunds) > 0 && Number(data.calculations.ending_policy_loan_balance) > 0) {
    // Check if policy loan is the only remaining debt
    const policyLoanOnlyDebtRemaining = isPolicyLoanTheOnlyDebt(data);

    if (policyLoanOnlyDebtRemaining) {
      const payment = Math.min(
        Number(availableFunds),
        Number(data.calculations.ending_policy_loan_balance)
      );

      data.calculations.ending_policy_loan_balance = round(
        Number(data.calculations.ending_policy_loan_balance) - Number(payment)
      );
    }
  }

  // Update total debt paydowns for this year only
  let creditSum =
    data.calculations.specific_credit_balance_payments_this_year.reduce(
      (acc, item) => {
        let key = Object.keys(item)[0];
        return acc + item[key];
      },
      0
    );

  let loanSum =
    data.calculations.specific_loan_balance_payments_this_year.reduce(
      (acc, item) => {
        let key = Object.keys(item)[0];
        return acc + item[key];
      },
      0
    );

  const sumOfPaymentsThisYear = creditSum + loanSum;

  data.calculations.total_credit_balances_paid_this_year = creditSum;
  data.calculations.total_loan_balances_paid_this_year = loanSum;
  data.calculations.total_debt_balances_paid_this_year = round(
    sumOfPaymentsThisYear
  );

  // Update total debt burden redirected
  data.calculations.total_annualized_debt_payments_redirected_so_far = round(
    Number(data.calculations.total_annualized_credit_payments_redirected_so_far) +
      Number(data.calculations.total_annualized_loan_payments_redirected_so_far)
  );
}
