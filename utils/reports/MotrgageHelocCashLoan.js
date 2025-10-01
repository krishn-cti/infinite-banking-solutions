// utils/reports/MotrgageHelocCashLoan.js

/**
 * Calculates the total balances for mortgage, HELOC, and cash loan (policy loan) based on the plan data.
 * @param {Array} plan - Array of year-wise financial data from createPlan.
 * @returns {Object} - Object containing total starting mortgage balance, total starting HELOC balance,
 *                     total ending policy cash value, and total starting policy loan balance.
 */
export default function calculateMortgageHelocCashLoan(plan) {
    if (!plan || !Array.isArray(plan)) {
        throw new Error('Invalid plan data provided');
    }

    // Extract arrays of values, handling NaN or undefined with 0
    const starting_mortgage_balance = plan.map((item) =>
        parseFloat(item.calculations?.starting_mortgage_balance) || 0
    );
    const starting_heloc_balance = plan.map((item) =>
        parseFloat(item.calculations?.starting_heloc_balance) || 0
    );
    const ending_policy_cash_value = plan.map((item) =>
        parseFloat(item.calculations?.ending_policy_cash_value) || 0
    );
    const starting_policy_loan_balance = plan.map((item) =>
        parseFloat(item.calculations?.starting_policy_loan_balance) || 0
    );

    // Calculate totals
    const totalStartingMortgageBalance = starting_mortgage_balance.reduce((sum, value) => sum + value, 0);
    const totalStartingHelocBalance = starting_heloc_balance.reduce((sum, value) => sum + value, 0);
    const totalEndingPolicyCashValue = ending_policy_cash_value.reduce((sum, value) => sum + value, 0);
    const totalStartingPolicyLoanBalance = starting_policy_loan_balance.reduce((sum, value) => sum + value, 0);

    // Return the result as an object with rounded values
    return {
        totalStartingMortgageBalance: Number(totalStartingMortgageBalance.toFixed(2)),
        totalStartingHelocBalance: Number(totalStartingHelocBalance.toFixed(2)),
        totalEndingPolicyCashValue: Number(totalEndingPolicyCashValue.toFixed(2)),
        totalStartingPolicyLoanBalance: Number(totalStartingPolicyLoanBalance.toFixed(2)),
    };
}