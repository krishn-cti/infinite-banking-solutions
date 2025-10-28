// utils/stepCalculations/index.js
import { calculateAnnualPrincipalPayment } from '../calculations/data/index.js';

/**
 * Generates year-wise financial step data for mortgage, HELOC, and policy payments.
 * @param {Array} plan - Array of year-wise financial data from createPlan.
 * @param {Object} data - Financial data containing properties, mortgage, and policy details.
 * @param {number|string} case_type_id - The case type ID to determine the principal payment function.
 * @returns {Object} - Object containing step data for general and Property+Mortgage+HELOC cases.
 */
export function stepCalculationData(plan, data, case_type_id, policy) {
    // Validate inputs
    if (!plan || !Array.isArray(plan)) {
        console.warn('Invalid plan data provided, returning empty step data');
        return {
            stepOneCalculation: [],
            stepTwoCalculation: [],
            stepThreeCalculation: 0,
        };
    }
    if (!data?.properties?.[0]?.mortgage && case_type_id !== '4') {
        console.warn('No mortgage data provided, returning empty step data');
        return {
            stepOneCalculation: [],
            stepTwoCalculation: [],
            stepThreeCalculation: 0,
        };
    }

    const output = { plan, data, policy };

    let stepOneCalculation = [];
    let stepTwoCalculation = [];
    let stepThreeCalculation = 0;

    // Step 1 (General): Annual principal payments for years with non-zero mortgage balance
    if (case_type_id == 1) {
        stepOneCalculation = output.plan.map((element, index) => {
            if (element?.calculations?.starting_mortgage_balance) {
                try {
                    const principalPayment = Math.round(
                        calculateAnnualPrincipalPayment(output.data, index)
                    );
                    return {
                        year: index + 1,
                        principalPayment,
                    };
                } catch (error) {
                    console.error(`Error calculating principal payment for year ${index + 1}:`, error.message);
                    return null;
                }
            }
            return null;
        }).filter(item => item !== null);

        // Step 2 (General): Monthly surplus budget payments for all years
        stepTwoCalculation = output.plan.map((element, index) => ({
            year: index + 1,
            monthlySurplus: Math.round((element?.calculations?.annual_surplus_budget_available ?? 0) / 12),
        }));
    } else if (case_type_id == 2) {
        // Step 1 (Property+Mortgage+HELOC): Normal payments flag
        stepOneCalculation = true;

        // Step 2 (Property+Mortgage+HELOC): Monthly surplus plus redirected debt payments
        stepTwoCalculation = output.plan.map((element, index) => ({
            year: index + 1,
            monthlySurplusWithDebt: Math.round(
                ((element?.calculations?.annual_surplus_budget_available ?? 0) +
                    (element?.calculations?.total_annualized_debt_payments_redirected_so_far ?? 0)) / 12
            ),
        }));
    }

    // Step 3 (General): Policy cash premium
    stepThreeCalculation = Math.round(output.policy?.[0]?.total_cash_premiums ?? 0);

    return {
        stepOneCalculation,
        stepTwoCalculation,
        stepThreeCalculation
    };
}