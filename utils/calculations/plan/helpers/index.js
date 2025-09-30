
import {
  monthlyInterest,
  reduceData,
  calculateAmortizationSchedule,
  calculateCurrentMonthInLoan,
  round
} from '../../utils.js';
import {
  calculateMonthlyMortgagePaymentExpense,
  calculateCurrentMortgageBalance,
  calculateCurrentEquity,
  calculateRoomAvailable,
  calculateMonthlyMinimumPaymentExpense,
  calculateMonthlyLoanPaymentExpense,
  calculateCurrentLoanBalance,
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
// export function areAllDebtsPaidOff(data) {
//   return (
//     data.properties[0].mortgage.calculated_current_loan_balance === 0 &&
//     data.properties[0].heloc.balance === 0 &&
//     data.calculations.ending_policy_loan_balance === 0 &&
//     data.credit.every((credit) => credit.balance_today === 0) &&
//     data.loans.every((loan) => loan.calculated_current_loan_balance === 0)
//   );
// }

export function areAllDebtsPaidOff(data) {
  if (!data || !data.properties?.length) return false;

  const property = data.properties[0];

  return (
    Number(property.mortgage?.calculated_current_loan_balance || 0) === 0 &&
    Number(property.heloc?.balance || 0) === 0 &&
    Number(data.calculations?.ending_policy_loan_balance || 0) === 0 &&
    data.credit?.every((credit) => Number(credit.balance_today || 0) === 0) &&
    data.loans?.every((loan) => Number(loan.calculated_current_loan_balance || 0) === 0)
  );
}


// Calculate the monthly interest due on the HELOC at any given month
export function calculateMonthlyHelocInterest(property) {
  const monthlyInterestRate = monthlyInterest(property.heloc.interest_rate);
  const interest = property.heloc.balance * monthlyInterestRate;
  return interest;
}

// Check if the HELOC is the only debt remaining
export function isHelocTheOnlyDebt(data) {
  return (
    Number(data.properties[0].mortgage.calculated_current_loan_balance) === 0 &&
    Number(data.properties[0].heloc.balance) > 0 &&
    Number(data.calculations.ending_policy_loan_balance) === 0 &&
    data.credit.every((credit) => Number(credit.balance_today) === 0) &&
    data.loans.every((loan) => Number(loan.calculated_current_loan_balance) === 0)
  );
}

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
  // Calculate total property equity
  let totalPropertyEquity = reduceData(data.properties, 'current_value');

  // Calculate total investment balances
  let totalInvestments = reduceData(data.investments, 'balance_amount');

  // Calculate total policy cash value
  let totalPolicyCashValue = data.calculations.ending_policy_cash_value;

  // Calculate total assets

  // console.log(totalPropertyEquity,totalInvestments,totalPolicyCashValue)
  return totalPropertyEquity + totalInvestments + totalPolicyCashValue;

}

export function calculateTotalLiabilities(data) {
  // Calculate total mortgage balance
  let totalMortgageBalance = reduceData(
    data.properties,
    'mortgage',
    'calculated_current_loan_balance'
  );

  // Calculate total heloc balance
  let totalHelocBalance = reduceData(data.properties, 'heloc', 'balance');

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
  return (
    Number(totalMortgageBalance) +
    Number(totalHelocBalance) +
    Number(totalCreditBalance) +
    Number(totalLoanBalance) +
    Number(totalPolicyLoanBalance)
  );
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
  const annualRate = Number(
    data?.totals?.policy_interest_rate ?? POLICY_LOAN_INTEREST_RATE
  );

  const monthlyInterestRate = isNaN(annualRate) ? 0 : monthlyInterest(annualRate);

  const endingBalance = Number(data.calculations?.ending_policy_loan_balance) || 0;

  const interest = endingBalance * monthlyInterestRate;

  return interest;
}

export function isHelocAvailable(data, year, policy) {
  const cost =
    policy[year - 1].guaranteed_required_annual_premium +
    policy[year - 1].total_deposit;
  return data.calculations.starting_heloc_room >= cost;
}

// Calculate the available policy loan amount
export function calculatePolicyLoanAvailable(data, year, policy) {
  let policyLoanAvailable = 0;

  const cost =
    policy[year - 1]?.guaranteed_required_annual_premium +
    policy[year - 1]?.total_deposit;
  if (year === 1) {
    if (
      data.calculations.starting_heloc_room > cost ||
      data.combined?.supplement
    ) {
      policyLoanAvailable =
        POLICY_LOAN_FACTOR_YEAR_ONE *
        policy[year - 1].total_deposit;
    } else {
      policyLoanAvailable = 0;
    }
  }

  if (year > 1) {
    //Normal Case

    policyLoanAvailable =
      POLICY_LOAN_FACTOR_OTHER_YEARS * policy[year - 2]?.total_cash_value +
      POLICY_LOAN_FACTOR_YEAR_ONE *
      policy[year - 2]?.total_deposit -
      data.calculations.starting_policy_loan_balance;

    policyLoanAvailable = policyLoanAvailable;
  }

  return policyLoanAvailable;
}

// Check if the policy loan is the only debt remaining
// export function isPolicyLoanTheOnlyDebt(data) {
//   return (
//     data.properties[0].mortgage.calculated_current_loan_balance === 0 &&
//     data.properties[0].heloc.balance === 0 &&
//     data.calculations.ending_policy_loan_balance > 0 &&
//     data.credit.every((credit) => credit.balance_today === 0) &&
//     data.loans.every((loan) => loan.calculated_current_loan_balance === 0)
//   );
// }

export function isPolicyLoanTheOnlyDebt(data) {
  if (!data || !data.properties?.length) return false;

  const property = data.properties[0];

  return (
    Number(property.mortgage?.calculated_current_loan_balance || 0) === 0 &&
    Number(property.heloc?.balance || 0) === 0 &&
    Number(data.calculations?.ending_policy_loan_balance || 0) > 0 &&
    data.credit?.every((credit) => Number(credit.balance_today || 0) === 0) &&
    data.loans?.every((loan) => Number(loan.calculated_current_loan_balance || 0) === 0)
  );
}

export function calculatePreliminaryCaseValues(allData) {
  let data = allData.data;

  // Process each property
  // data.properties.forEach((property) => {
  //   // Calculate monthly payment expense for each property
  //   property.mortgage.calculated_monthly_payment_expense =
  //     calculateMonthlyMortgagePaymentExpense(property.mortgage);

  //   // Calculate current loan balance for each property
  //   property.mortgage.calculated_current_loan_balance =
  //     calculateCurrentMortgageBalance(property.mortgage);

  //   // Calculate current equity for each property
  //   property.calculated_current_equity = calculateCurrentEquity(property);

  //   // Calculate room available for each property
  //   property.heloc.calculated_room_available = calculateRoomAvailable(property);
  // });

  // // Process each loan
  // data.loans.forEach((loan) => {
  //   // Calculate monthly payment expense for each loan
  //   loan.calculated_monthly_payment_expense =
  //     calculateMonthlyLoanPaymentExpense(loan);

  //   // Calculate current loan balance for each loan
  //   loan.calculated_current_loan_balance = calculateCurrentLoanBalance(loan);
  // });

  // // Process each credit
  // data.credit.forEach((credit) => {
  //   // Calculate monthly minimum payment expense for each credit
  //   credit.calculated_monthly_minimum_payment_expense =
  //     calculateMonthlyMinimumPaymentExpense(credit);
  // });

  // TOTALS SECTION CHAINED CALCULATIONS
  // calculateTotals(data);

  // Return the modified data as a JSON object
  return { ...data, combined: allData.policy };
}

export function calculateSubsequentCaseValues(
  allData,
  monthsOffsetFromStart = 0
) {
  let data = allData.data || allData;

  // Process each property
  data.properties.forEach((property) => {
    // Calculate monthly payment expense for each property
    property.mortgage.calculated_monthly_payment_expense =
      calculateMonthlyMortgagePaymentExpense(
        property.mortgage,
        monthsOffsetFromStart
      );

    // Calculate current loan balance for each property
    property.mortgage.calculated_current_loan_balance =
      calculateCurrentMortgageBalance(property.mortgage, monthsOffsetFromStart);

    // Calculate current equity for each property
    property.calculated_current_equity = calculateCurrentEquity(property);

    // Calculate room available for each property
    property.heloc.calculated_room_available = calculateRoomAvailable(property);
  });

  // Process each credit
  data.credit.forEach((credit) => {
    // Calculate monthly minimum payment expense for each credit
    credit.calculated_monthly_minimum_payment_expense =
      calculateMonthlyMinimumPaymentExpense(credit);
  });

  // TOTALS SECTION CHAINED CALCULATIONS
  calculateTotals(data);

  // Return the modified data as a JSON object
  return data;
}

