// utils/reports/MotrgageHelocCashLoan.js

/**
 * Calculates the year-wise balances for mortgage, HELOC, and cash loan (policy loan) based on the plan data.
 * @param {Array} plan - Array of year-wise financial data from createPlan.
 * @returns {Object} - Object containing arrays of starting mortgage balance, starting HELOC balance,
 *                     ending policy cash value, and starting policy loan balance for each year.
 */
export default function calculateMortgageHelocCashLoan(plan) {
    if (!plan || !Array.isArray(plan)) {
        throw new Error('Invalid plan data provided');
    }

    // Extract arrays of values, handling NaN or undefined with 0 and rounding to 2 decimal places
    const starting_mortgage_balance = plan.map((item) =>
        Number((parseFloat(item.calculations?.starting_mortgage_balance) || 0).toFixed(2))
    );
    const starting_heloc_balance = plan.map((item) =>
        Number((parseFloat(item.calculations?.starting_heloc_balance) || 0).toFixed(2))
    );
    const ending_policy_cash_value = plan.map((item) =>
        Number((parseFloat(item.calculations?.ending_policy_cash_value) || 0).toFixed(2))
    );
    const starting_policy_loan_balance = plan.map((item) =>
        Number((parseFloat(item.calculations?.starting_policy_loan_balance) || 0).toFixed(2))
    );

    // Return the result as an object with year-wise arrays
    return {
        startingMortgageBalance: starting_mortgage_balance,
        startingHelocBalance: starting_heloc_balance,
        endingPolicyCashValue: ending_policy_cash_value,
        startingPolicyLoanBalance: starting_policy_loan_balance,
    };
}