import {
  monthlyInterest,
  reduceData,
  calculateAmortizationSchedule,
  calculateCurrentMonthInLoan,
  round
} from '../../utils.js';
import {
  calculateTotals
} from '../../data/index.js';
import {
  POLICY_LOAN_INTEREST_RATE,
  POLICY_LOAN_FACTOR_YEAR_ONE,
  POLICY_LOAN_FACTOR_OTHER_YEARS
} from '../../constants.js';

// Modify plan object to round all numbers inside plan[i].calculations for each item in plan
export function roundAllNumbersInCalculations(plan) {
  function roundRecursively(obj) {
    if (typeof obj === 'number') {
      return round(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(roundRecursively);
    } else if (typeof obj === 'object' && obj !== null) {
      let newObj = {};
      for (let key in obj) {
        newObj[key] = roundRecursively(obj[key]);
      }
      return newObj;
    }
    return obj;
  }

  for (let i = 0; i < plan.length; i++) {
    if (plan[i].hasOwnProperty('calculations')) {
      plan[i].calculations = roundRecursively(plan[i].calculations);
    }
  }

  return plan;
}

// Check if all debts are fully paid off (this indicates the end of the process)
export function areAllDebtsPaidOff(data) {
  return (
    Number(data.calculations.ending_policy_loan_balance) === 0 &&
    data.credit.every((credit) => Number(credit.balance_today) === 0) &&
    data.loans.every((loan) => Number(loan.calculated_current_loan_balance) === 0)
  );
}

// Calculate the monthly interest due on the HELOC at any given month

// Check if the HELOC is the only debt remaining

// Calculate the current balance of any given loan object and update the length of the loan, with an optional offset
export function calculateCurrentLoanBalanceAndUpdateLength(
  loan,
  monthsOffset = 0
) {
  const monthsPassed = calculateCurrentMonthInLoan(loan, monthsOffset);

  if (monthsPassed >= loan.loan_length_in_months) {
    return 0;
  }

  // Calculate the amortization schedule up to the current month
  const schedule = calculateAmortizationSchedule(loan);
  loan.loan_length_in_months = schedule.length;

  // If the loan is not over, return the ending balance, otherwise return 0
  return monthsPassed < schedule.length
    ? parseFloat(schedule[monthsPassed].end_balance)
    : 0;
}

// Calculate the next year's EMI for a mortgage object, but only the total principal portion of it, with an optional offset
export function calculateNextYearEmiPrincipalPortion(
  mortgage,
  monthsOffset = 0
) {
  const currentMonth = calculateCurrentMonthInLoan(mortgage, monthsOffset);

  const remainingMonths = mortgage.loan_length_in_months - currentMonth;
  const monthsToCalculate = remainingMonths > 12 ? 12 : remainingMonths;

  const schedule = calculateAmortizationSchedule(mortgage);
  const nextYearSchedule = schedule.slice(
    currentMonth,
    currentMonth + monthsToCalculate
  );

  const nextYearPrincipalPortion = nextYearSchedule.reduce(
    (total, month) => total + parseFloat(month.principal_payment),
    0
  );

  return nextYearPrincipalPortion >= 0 ? nextYearPrincipalPortion : 0;
}

export function calculateNextYearEmiInterestPortion(
  mortgage,
  monthsOffset = 0
) {
  const currentMonth = calculateCurrentMonthInLoan(mortgage, monthsOffset);

  const remainingMonths = mortgage.loan_length_in_months - currentMonth;
  const monthsToCalculate = remainingMonths > 12 ? 12 : remainingMonths;

  const schedule = calculateAmortizationSchedule(mortgage);
  const nextYearSchedule = schedule.slice(
    currentMonth,
    currentMonth + monthsToCalculate
  );

  const nextYearInterestPortion = nextYearSchedule.reduce(
    (total, month) => total + parseFloat(month.interest_payment),
    0
  );

  return nextYearInterestPortion >= 0 ? nextYearInterestPortion : 0;
}

export function calculateTotalAssets(data) {
  // Calculate total investment balances
  let totalInvestments = reduceData(data.investments, 'balance_amount');

  // Calculate total policy cash value
  let totalPolicyCashValue = data.calculations.ending_policy_cash_value;

  // Calculate total assets
  return totalInvestments + totalPolicyCashValue;
}

export function calculateTotalLiabilities(data) {
  // Calculate total mortgage balance

  // Calculate total heloc balance

  // Calculate total credit balances
  let totalCreditBalance = reduceData(data.credit, 'balance_today');

  // Calculate total loan balances
  let totalLoanBalance = reduceData(
    data.loans,
    'calculated_current_loan_balance'
  );

  // Calculate total policy loan balance
  let totalPolicyLoanBalance = Number(data.calculations.ending_policy_loan_balance);

  // Calculate total liabilities
  return totalCreditBalance + totalLoanBalance + totalPolicyLoanBalance;
}

export function calculateNetWorth(data) {
  // Calculate total assets
  let totalAssets = calculateTotalAssets(data);

  // Calculate total liabilities
  let totalLiabilities = calculateTotalLiabilities(data);

  // Calculate net worth
  let netWorth = totalAssets - totalLiabilities;

  return netWorth;
}

// Calculate the monthly interest due on the policy loan at any given month
export function calculateMonthlyPolicyLoanInterest(data) {
  const monthlyInterestRate = monthlyInterest(
    data?.totals?.policy_interest_rate || POLICY_LOAN_INTEREST_RATE
  );
  const interest =
    Number(data.calculations.ending_policy_loan_balance) * Number(monthlyInterestRate);
  return interest;
}

// Calculate the available policy loan amount
export function calculatePolicyLoanAvailable(data, year, policy) {
  let policyLoanAvailable = 0;
  if (year === 1) {
 
      policyLoanAvailable =
        POLICY_LOAN_FACTOR_YEAR_ONE *
        policy[year - 1].total_deposit;
  }

  if (year > 1) {
    //Normal Case

    policyLoanAvailable =
      POLICY_LOAN_FACTOR_OTHER_YEARS * policy[year - 2].total_cash_value +
      POLICY_LOAN_FACTOR_YEAR_ONE *
        policy[year - 2].total_deposit -
      data.calculations.starting_policy_loan_balance;

    policyLoanAvailable = policyLoanAvailable;
  }

  return policyLoanAvailable;
}

// Check if the policy loan is the only debt remaining
export function isPolicyLoanTheOnlyDebt(data) {
  return (
    Number(data.calculations.ending_policy_loan_balance) > 0 &&
    data.credit.every((credit) => Number(credit.balance_today) === 0) &&
    data.loans.every((loan) => Number(loan.calculated_current_loan_balance) === 0)
  );
}

export function calculatePreliminaryCaseValues(allData) {
  let data = allData.data;

  return { ...data, combined: allData.policy };
}

export function calculateSubsequentCaseValues(
  allData,
  monthsOffsetFromStart = 0
) {
  let data = allData.data || allData;

  // Process each credit
  // data.credit.forEach((credit) => {
  //   // Calculate monthly minimum payment expense for each credit
  //   credit.calculated_monthly_minimum_payment_expense =
  //     calculateMonthlyMinimumPaymentExpense(credit);
  // });

  // TOTALS SECTION CHAINED CALCULATIONS
  calculateTotals(data);

  // Return the modified data as a JSON object
  return data;
}
