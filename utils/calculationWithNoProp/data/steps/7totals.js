import { RECOMMENDED_INSURANCE_AMOUNT_INCOME_CALCULATION_FACTOR } from '../../constants.js';
import { calculateAmortizationSchedule, reduceData } from '../../utils.js';

export function calculateTotals(data) {
  // Calculate total expenses
  data.totals.calculated_monthly_total_expenses =
    calculateMonthlyTotalExpenses(data);

  // Calculate total investment allotments
  data.totals.calculated_monthly_total_investment_allotments =
    calculateMonthlyTotalInvestmentAllotments(data);

  // Calculate total income
  data.totals.calculated_monthly_total_income =
    calculateMonthlyTotalIncome(data);

  // Calculate preliminary surplus budget
  data.totals.calculated_monthly_preliminary_surplus_budget =
    calculateMonthlyPreliminarySurplusBudget(data);

  // Calculate total reduction in expenses
  data.totals.calculated_monthly_total_reduction_in_expenses =
    calculateMonthlyTotalReductionInExpenses(data);

  // Calculate final surplus budget
  data.totals.calculated_monthly_final_surplus_budget =
    calculateMonthlyFinalSurplusBudget(data);

  // Calculate annual principal payment

  // Calculate annual budget available
  data.totals.calculated_annual_budget_available =
    calculateAnnualBudgetAvailable(data);
}

// data.totals.calculated_monthly_total_income
export function calculateMonthlyTotalIncome(data) {
  const totalIncome = data.people.reduce(
    (total, income) =>
      Number(total) +
      Number(income.monthly_net_income) +
      Number(income.monthly_bonuses_dividends_income) +
      Number(income.monthly_other_income),
    0
  );
  return totalIncome;
}

// data.totals.calculated_monthly_total_expenses
export function calculateMonthlyTotalExpenses(data) {
  let totalExpenses = 0;

  function iterate(obj) {
    for (let property in obj) {
      if (obj.hasOwnProperty(property)) {
        if (typeof obj[property] === 'object' && obj[property] !== null) {
          iterate(obj[property]);
        } else if (
          property.endsWith('_expense') ||
          property === 'monthly_allotment_expense'
        ) {
          totalExpenses += parseFloat(obj[property]);
        }
      }
    }
  }

  iterate(data);

  return (
    totalExpenses -
    data.totals.monthly_reduction_on_investment_accounts_allotment
  );
}

// data.totals.calculated_monthly_total_investment_allotments
export function calculateMonthlyTotalInvestmentAllotments(data) {
  let totalExpenses = 0;

  function iterate(obj) {
    for (let property in obj) {
      if (obj.hasOwnProperty(property)) {
        if (typeof obj[property] === 'object' && obj[property] !== null) {
          iterate(obj[property]);
        } else if (property === 'monthly_allotment_expense') {
          totalExpenses += parseFloat(obj[property]);
        }
      }
    }
  }

  iterate(data);

  return totalExpenses;
}

// data.totals.calculated_monthly_preliminary_surplus_budget
export function calculateMonthlyPreliminarySurplusBudget(data) {
  const surplusBudget =
    calculateMonthlyTotalIncome(data) -
    data.totals.calculated_monthly_total_expenses;
  return surplusBudget;
}

// data.totals.calculated_monthly_total_reduction_in_expenses
export function calculateMonthlyTotalReductionInExpenses(data) {
  const totalReduction =
    data.totals.monthly_reduction_on_replaced_insurance_expenses;
  return totalReduction;
}

// data.totals.calculated_monthly_final_surplus_budget
export function calculateMonthlyFinalSurplusBudget(data) {

  const finalSurplusBudget =
    calculateMonthlyPreliminarySurplusBudget(data) +
    calculateMonthlyTotalReductionInExpenses(data);
  return finalSurplusBudget;
}

// data.totals.calculated_annual_principal_payment
export function calculateAnnualPrincipalPayment(data) {
  let annualPrincipalPayment = 0;

  // Go through all properties
  data.properties.forEach((property) => {
    // Get the loan for the property
    const loan = property.mortgage;

    // Calculate the amortization schedule for the loan
    const schedule = calculateAmortizationSchedule(loan);

    // Determine the current month of the loan
    const loanStartDate = new Date(loan.loan_start_date);
    const now = new Date();
    const monthsPassed =
      (now.getFullYear() - loanStartDate.getFullYear()) * 12 +
      now.getMonth() -
      loanStartDate.getMonth();
    const currentMonth =
      monthsPassed >= loan.loan_length_in_months
        ? loan.loan_length_in_months
        : monthsPassed;

    // Ensure there's enough remaining payments
    const remainingPayments = schedule.length - currentMonth;
    const monthsToCalculate = remainingPayments > 12 ? 12 : remainingPayments;

    // Calculate the sum of principal payments for the next 12 months from current month
    const principalPaymentForYear = schedule
      .slice(currentMonth, currentMonth + monthsToCalculate)
      .reduce((total, month) => total + parseFloat(month.principal_payment), 0);

    // Add the principal payment for the year for the current property to the total
    annualPrincipalPayment += principalPaymentForYear;
  });

  return annualPrincipalPayment;
}

// data.totals.calculated_annual_budget_available
export function calculateAnnualBudgetAvailable(data) {
  const annualBudget = calculateMonthlyFinalSurplusBudget(data) * 12;
  return annualBudget;
}

export function calculateAnnualBudgetAvailableWithoutHeloc(data) {
  const annualBudget = calculateMonthlyFinalSurplusBudget(data) * 12;
  return annualBudget;
}
const calculateTotalDebt = (data) => {
  let totalDebt = 0;
  totalDebt += data.properties[0].mortgage.calculated_current_loan_balance;

  totalDebt += reduceData(data.credit, 'balance_today');

  totalDebt += reduceData(data.loans, 'calculated_current_loan_balance');

  return totalDebt;
};

const calculateTotalAnnualDebtPayments = (data) => {
  let totalDebtPayments = 0;
  totalDebtPayments +=
    12 * data.properties[0].mortgage.calculated_monthly_payment_expense;

  totalDebtPayments +=
    12 * reduceData(data.credit, 'calculated_monthly_minimum_payment_expense');

  totalDebtPayments +=
    12 * reduceData(data.loans, 'calculated_monthly_payment_expense');

  return totalDebtPayments;
};

// calculates the recommended Insurance in Amount
export function calculateRecommendedInsuranceAmount(data) {
  // Step 1: Calculate annual expenses and debts
  const annualExpenses = data.totals.calculated_monthly_total_expenses * 12;
  const annualDebtPayments = calculateTotalAnnualDebtPayments(data);
  const adjustedAnnualExpenses = annualExpenses - annualDebtPayments; // expenses minus debts

  // Step 2: Calculate the base insurance amount
  const baseInsuranceAmount = calculateTotalDebt(data);

  // Step 3: Assess each person's ability to afford the expenses independently and calculate their deficit
  const people = data.people
    .filter((person) => !person.child)
    .map((person) => {
      const annualIncome =
        (person.monthly_net_income +
          person.monthly_other_income +
          Number(person.monthly_bonuses_dividends_income)) *
        12;
      const deficit = adjustedAnnualExpenses - annualIncome;
      return {
        ...person,
        annualIncome,
        canAffordIndependently: annualIncome >= adjustedAnnualExpenses,
        deficit
      };
    });

  // Step 4: Determine how many people can afford expenses independently
  const canAffordIndependentlyCount = people.filter(
    (person) => person.canAffordIndependently
  ).length;

  // Step 5: Compute insurance amount for each person
  const recommendedInsuranceAmount = people.map((person, index) => {
    let totalInsuranceAmount = baseInsuranceAmount;

    if (canAffordIndependentlyCount > 0) {
      if (person.canAffordIndependently) {
        const maxDeficit = Math.max(
          ...people
            .filter((p) => !p.canAffordIndependently)
            .map((p) => p.deficit),
          0
        );
        totalInsuranceAmount +=
          maxDeficit / RECOMMENDED_INSURANCE_AMOUNT_INCOME_CALCULATION_FACTOR;
      }
    } else if (people.length === 2) {
      // If both can't afford and there are exactly two people, calculate based on the other person's deficit
      const otherPerson = people[(index + 1) % 2];
      totalInsuranceAmount +=
        otherPerson.deficit /
        RECOMMENDED_INSURANCE_AMOUNT_INCOME_CALCULATION_FACTOR;
    } else {
      const maxDeficit = Math.max(...people.map((p) => p.deficit));
      totalInsuranceAmount +=
        maxDeficit / RECOMMENDED_INSURANCE_AMOUNT_INCOME_CALCULATION_FACTOR;
    }

    return Math.round(totalInsuranceAmount);
  });

  return recommendedInsuranceAmount;
}
