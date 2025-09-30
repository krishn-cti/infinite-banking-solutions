import { round } from '../../utils.js';
import {
  isHelocTheOnlyDebt,
  calculatePolicyLoanAvailable
} from '../helpers/index.js';

import { calculateRoomAvailable } from '../../data/index.js';

// Step 3 - Borrow: Take out policy loan against policy cash value
export function borrow(data, year, policy) {
  let policyLoanAvailable = calculatePolicyLoanAvailable(data, year, policy);

  const property = data.properties[0];
  const heloc = property.heloc;

  let policyLoanTaken = 0;
  let remainingCredit = 0;
  data.credit.forEach((credit, index) => {
    remainingCredit += credit.balance_today;
  });

  let remainingLoan = 0;
  data.loans.forEach((loan, index) => {
    remainingLoan += loan.calculated_current_loan_balance;
  });
  if (
    data.calculations.starting_mortgage_balance +
    remainingCredit +
    remainingLoan >
    0
  ) {
    if (
      policyLoanAvailable >=
      data.calculations.starting_mortgage_balance +
      remainingCredit +
      remainingLoan
    ) {
      policyLoanTaken =
        data.calculations.starting_mortgage_balance +
        remainingCredit +
        remainingLoan;
    } else {
      policyLoanTaken = policyLoanAvailable;
    }
  }
  // If policy loan available is greater than the HELOC balance, use policy loan to pay down the entire HELOC
  if (policyLoanAvailable >= heloc.balance && isHelocTheOnlyDebt(data)) {
    policyLoanTaken = heloc.balance;
    heloc.balance = 0;
    data.calculations.ending_heloc_balance = 0;
    data.calculations.ending_heloc_room = calculateRoomAvailable(property);
  }

  data.calculations.additional_policy_loan_taken = Number(policyLoanTaken);
  data.calculations.heloc_room_increase_after_the_additional_principal_payment =
    Number(policyLoanTaken);
  data.calculations.policy_loan_balance_after_additional_policy_loan_taken =
    Number(data.calculations.starting_policy_loan_balance) + Number(policyLoanTaken);

  data.calculations.ending_policy_loan_balance = round(
    isNaN(Number(data.calculations?.policy_loan_balance_after_additional_policy_loan_taken))
      ? 0
      : Number(data.calculations.policy_loan_balance_after_additional_policy_loan_taken)
  );

}
