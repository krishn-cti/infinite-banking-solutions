import { round,  } from '../../utils.js';
import {

  calculateMonthlyPolicyLoanInterest,
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateNetWorth
} from '../helpers/index.js';

// Step 6 - Repay: Policy loan & HELOC repayments
// Redirect the total annualized amount of would-be monthly debt payments that no longer apply (as a result of Step 4) to repay the policy loan or HELOC (calculated at end of year).
// Put Surplus Monthly Budget towards HELOC Balance and Policy Loan Balance (calculated at end of year).

export function repay(data, year, policy) {
  const monthlyDebtPaymentsToRedirect =
    Number(data.calculations.total_annualized_debt_payments_redirected_so_far) / 12;
  for (let month = 0; month < 12; month++) {
    let policyLoanRepayment = 0;

 
    let monthlySurplusBudget =

      (Number(data.totals.calculated_annual_budget_available) -
        Number(policy[0].total_cash_premiums)) /
      12;



    data.calculations.annual_surplus_budget_available = round(
      monthlySurplusBudget * 12
    );

    // Calculate interest on policy loan balance
    const monthlyPolicyLoanInterest = calculateMonthlyPolicyLoanInterest(data);
    // Add interest on policy loan to the balance
    data.calculations.ending_policy_loan_balance += round(
      Number(monthlyPolicyLoanInterest)
    );

    if (Number(data.calculations.ending_policy_loan_balance) > 0) {
      policyLoanRepayment = Math.min(
        Number(data.calculations.ending_policy_loan_balance),
        Number(monthlyDebtPaymentsToRedirect)
      );

      // Deduct the loan repayment from the policy loan balance
      data.calculations.ending_policy_loan_balance = round(
        Number(data.calculations.ending_policy_loan_balance) - Number(policyLoanRepayment)
      );
    }

    // only if there is no policy loan balance remaining
    let paymentToPolicyLoan = 0;
    if (
      Number(monthlySurplusBudget) > 0 &&
      Number(data.calculations.ending_policy_loan_balance) > 0
    ) {
      paymentToPolicyLoan = Math.min(
        Number(data.calculations.ending_policy_loan_balance),
        Number(monthlySurplusBudget)
      );
      data.calculations.ending_policy_loan_balance -= Number(paymentToPolicyLoan);
      data.calculations.ending_policy_loan_balance = round(
        Number(data.calculations.ending_policy_loan_balance)
      );
    }

    // 3. Deduct the monthly repayment from the balance
  }

  data.calculations.ending_assets_this_year = calculateTotalAssets(data);
  data.calculations.ending_liabilities_this_year =
    calculateTotalLiabilities(data);
  data.calculations.ending_net_worth_this_year = calculateNetWorth(data);
}
