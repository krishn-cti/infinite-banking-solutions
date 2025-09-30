import { round } from '../../utils.js';
import { calculateRoomAvailable } from '../../data/index.js';
import {
  calculateMonthlyHelocInterest,
  calculateNextYearEmiPrincipalPortion,
  calculateNextYearEmiInterestPortion,
  calculateMonthlyPolicyLoanInterest,
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateNetWorth
} from '../helpers/index.js';

// Step 6 - Repay: Policy loan & HELOC repayments
// Redirect the total annualized amount of would-be monthly debt payments that no longer apply (as a result of Step 4) to repay the policy loan or HELOC (calculated at end of year).
// Put Surplus Monthly Budget towards HELOC Balance and Policy Loan Balance (calculated at end of year).
export function repay(data, year) {
  const monthlyDebtPaymentsToRedirect =
    isNaN(Number(data.calculations.total_annualized_debt_payments_redirected_so_far) ? 0 : Number(data.calculations.total_annualized_debt_payments_redirected_so_far)) / 12;

  for (let month = 0; month < 12; month++) {
    const property = data.properties[0];
    const heloc = property.heloc;

    let policyLoanRepayment = 0;
    let monthlySurplusBudget =
      data.totals.calculated_monthly_final_surplus_budget;

    data.calculations.annual_surplus_budget_available = round(
      monthlySurplusBudget * 12
    );

    // Calculate interest on policy loan balance
    const monthlyPolicyLoanInterest = calculateMonthlyPolicyLoanInterest(data);

    // Add interest on policy loan to the balance
    let endingBalance = Number(data.calculations.ending_policy_loan_balance) || 0;
    let interest = Number(monthlyPolicyLoanInterest) || 0;

    endingBalance += round(interest);

    data.calculations.ending_policy_loan_balance = endingBalance;

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

    // Any excess from monthlyDebtPaymentsToRedirect goes towards reducing the HELOC balance,
    // only if there is no policy loan balance remaining
    let excessPayment = 0;

    if (
      Number(data.calculations.ending_policy_loan_balance) <= 0 &&
      heloc.balance > 0
    ) {
      excessPayment = Number(monthlyDebtPaymentsToRedirect) - Number(policyLoanRepayment);
      // console.log(
      //   "MONTH",
      //   month + 1,
      //   "PAYMENT REDIRECTED TO HELOC BC PL PAID OFF",
      //   excessPayment
      // );
    }

    // 1. Calculate the monthly HELOC interest
    const monthlyHelocInterest = calculateMonthlyHelocInterest(property);

    // year === 4
    //   ? console.log(
    //       "YEAR 4 MONTH",
    //       month + 1,
    //       "HELOC INTEREST PAYMENT",
    //       monthlyHelocInterest
    //     )
    //   : null;

    // 2. Add the monthly interest to the balance
    heloc.balance += monthlyHelocInterest;

    // Put Surplus Monthly Budget and excess from debt redirections towards HELOC Balance and Policy Loan Balance
    if (heloc.balance > 0 && monthlySurplusBudget > 0) {
      const paymentToHeloc = Math.min(
        heloc.balance,
        monthlySurplusBudget + excessPayment
      );

      data.calculations.annualized_principal_amount_of_repayments_to_heloc_made_this_year =
        round(
          Number(data.calculations
            .annualized_principal_amount_of_repayments_to_heloc_made_this_year) +
          paymentToHeloc -
          monthlyHelocInterest
        );
      data.calculations.annualized_interest_amount_of_repayments_to_heloc_made_this_year =
        round(
          data.calculations
            .annualized_interest_amount_of_repayments_to_heloc_made_this_year +
          monthlyHelocInterest
        );

      // year === 4
      //   ? console.log(
      //       "YEAR 4 MONTH",
      //       month + 1,
      //       "HELOC TOTAL REPAYMENT",
      //       paymentToHeloc
      //     )
      //   : null;

      heloc.balance -= paymentToHeloc;
      heloc.balance = heloc.balance;
      data.calculations.ending_heloc_balance = heloc.balance;

      heloc.calculated_room_available = calculateRoomAvailable(property);
      data.calculations.ending_heloc_room = heloc.calculated_room_available;

      monthlySurplusBudget -= paymentToHeloc; // Update the surplus budget after making a payment to the HELOC
    }

    if (
      monthlySurplusBudget > 0 &&
      Number(data.calculations.ending_policy_loan_balance) > 0
    ) {
      const paymentToPolicyLoan = Math.min(
        Number(data.calculations.ending_policy_loan_balance),
        Number(monthlySurplusBudget)
      );
      data.calculations.ending_policy_loan_balance -= Number(paymentToPolicyLoan);
      data.calculations.ending_policy_loan_balance = round(
        Number(data.calculations.ending_policy_loan_balance)
      );
    }

    // 3. Deduct the monthly repayment from the balance
    if (heloc.balance > 0 && monthlySurplusBudget > 0) {
      const paymentToHeloc = Math.min(heloc.balance, monthlySurplusBudget);
      heloc.balance = heloc.balance - paymentToHeloc;
      data.calculations.ending_heloc_balance = heloc.balance;

      heloc.calculated_room_available = calculateRoomAvailable(property);
      data.calculations.ending_heloc_room = heloc.calculated_room_available;

      monthlySurplusBudget -= paymentToHeloc; // Update the surplus budget after making a payment to the HELOC
    }
  }

  // Update HELOC room at end of year to account for principal portion of mortgage payments
  const property = data.properties[0];
  const mortgage = property.mortgage;

  const principalPortionOfEmiForNextYear = calculateNextYearEmiPrincipalPortion(
    mortgage,
    year * 12 - 12 + 1
  );
  const interestPortionOfEmiForNextYear = calculateNextYearEmiInterestPortion(
    mortgage,
    year * 12 - 12 + 1
  );

  property.heloc.calculated_room_available = calculateRoomAvailable(property);

  data.calculations.heloc_balance_after_repayments = property.heloc.balance;

  data.calculations.total_heloc_room_after_mortgage_emi_payments_during_the_year =
    round(
      property.heloc.calculated_room_available +
      principalPortionOfEmiForNextYear
    );

  data.calculations.total_heloc_room_increase_after_mortgage_emi_payments_during_the_year =
    principalPortionOfEmiForNextYear;

  data.calculations.total_mortgage_emi_interest_paid_this_year = round(
    interestPortionOfEmiForNextYear
  );

  data.calculations.ending_mortgage_balance = round(
    mortgage.calculated_current_loan_balance
  );

  data.calculations.ending_assets_this_year = calculateTotalAssets(data);
  data.calculations.ending_liabilities_this_year =
    calculateTotalLiabilities(data);
  data.calculations.ending_net_worth_this_year = calculateNetWorth(data);
}
