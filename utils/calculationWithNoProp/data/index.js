import { combinePolicyData } from '../policy/index.js';

import { calculateMonthlyMinimumPaymentExpense } from './steps/3credit.js';
import {
  calculateMonthlyLoanPaymentExpense,
  calculateCurrentLoanBalance
} from './steps/4loans.js';
import {
  calculateTotals,
  calculateMonthlyTotalIncome,
  calculateMonthlyTotalExpenses,
  calculateMonthlyPreliminarySurplusBudget,
  calculateMonthlyTotalReductionInExpenses,
  calculateMonthlyFinalSurplusBudget,
  calculateAnnualPrincipalPayment,
  calculateAnnualBudgetAvailable,
  calculateAnnualBudgetAvailableWithoutHeloc
} from './steps/7totals.js';

export {
  calculateMonthlyMinimumPaymentExpense,
  calculateMonthlyLoanPaymentExpense,
  calculateCurrentLoanBalance,
  calculateTotals,
  calculateMonthlyTotalIncome,
  calculateMonthlyTotalExpenses,
  calculateMonthlyPreliminarySurplusBudget,
  calculateMonthlyTotalReductionInExpenses,
  calculateMonthlyFinalSurplusBudget,
  calculateAnnualPrincipalPayment,
  calculateAnnualBudgetAvailable,
  combinePolicyData,
  calculateAnnualBudgetAvailableWithoutHeloc
};
