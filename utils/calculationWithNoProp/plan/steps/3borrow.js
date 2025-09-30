import { round } from '../../utils.js';
import {
  calculatePolicyLoanAvailable
} from '../helpers/index.js';


// Step 3 - Borrow: Take out policy loan against policy cash value
export function borrow(data, year, policy) {
  const policyLoanAvailable = calculatePolicyLoanAvailable(data, year, policy);

  let policyLoanTaken = 0;

  let remainingCredit = 0;
  data.credit.forEach((credit, index) => {
    remainingCredit += credit.balance_today;
  });

  let remainingLoan = 0;
  data.loans.forEach((loan, index) => {
    remainingLoan += loan.calculated_current_loan_balance;
  });
  let otherPolicyLoan = 0;
  if (
    remainingCredit + remainingLoan > 0 &&
    policyLoanTaken < policyLoanAvailable
  ) {
    otherPolicyLoan = Math.min(
      remainingCredit + remainingLoan,
      policyLoanAvailable - policyLoanTaken
    );
  }

  data.calculations.additional_policy_loan_taken =
    Number(policyLoanTaken) + Number(otherPolicyLoan);

  data.calculations.policy_loan_balance_after_additional_policy_loan_taken =
    Number(data.calculations.starting_policy_loan_balance) +
    Number(policyLoanTaken) +
    Number(otherPolicyLoan);

  data.calculations.ending_policy_loan_balance = round(
    Number(data.calculations.policy_loan_balance_after_additional_policy_loan_taken)
  );
}
