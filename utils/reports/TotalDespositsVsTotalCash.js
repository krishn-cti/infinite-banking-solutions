// utils/reports/TotalDespositsVsTotalCash.js

/**
 * Calculates total deposits (cash premiums) and total cash value over time based on policy data.
 * @param {Array} policy - Array of policy data containing cash_premiums and total_cash_value.
 * @returns {Object} - Object containing arrays of deposits and cash values for graphing.
 */
export default function calculateTotalDespositsVsTotalCash(policy) {
    if (!policy || !Array.isArray(policy)) {
        throw new Error('Invalid policy data provided');
    }

    // Calculate deposits (cash premiums) with cumulative sum
    let deposits = policy.map((item) =>
        item?.cash_premiums ? parseFloat(item.cash_premiums.toFixed(0)) : 0
    );
    let cumulativeDeposits = [];
    let sum = 0;
    deposits.forEach((value) => {
        sum += value;
        cumulativeDeposits.push(sum);
    });

    // Calculate cash values
    let cash = policy.map((item) =>
        item?.total_cash_value ? parseFloat(item.total_cash_value.toFixed(0)) : 0
    );

    // Ensure arrays are of equal length (pad with 0 if necessary)
    const maxLength = Math.max(cumulativeDeposits.length, cash.length);
    while (cumulativeDeposits.length < maxLength) cumulativeDeposits.push(0);
    while (cash.length < maxLength) cash.push(0);

    // Return data structured for graphing
    return {
        deposits: cumulativeDeposits,
        cash,
        years: policy.map((item, index) => index), // Use index as a fallback year (replace with actual years if available)
    };
}