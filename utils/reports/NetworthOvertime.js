// utils/reports/NetworthOvertime.js

/**
 * Calculates net worth, assets, and liabilities over time based on the plan data.
 * @param {Array} plan - Array of year-wise financial data from createPlan.
 * @returns {Object} - Object containing arrays of worth, assets, liabilities, and years for graphing.
 */
export default function calculateNetworthOvertime(plan) {
    if (!plan || !Array.isArray(plan)) {
        throw new Error('Invalid plan data provided');
    }

    const worth = [];
    const assets = [];
    const liabilities = [];
    const years = [];

    // Iterate over the plan array up to plan.length - 1 to avoid out-of-bounds
    for (let i = 0; i < plan.length; i++) {
        const currentYearData = plan[i]?.calculations || {};

        // Extract values with fallback to 0 for NaN or undefined
        const currentWorth = parseFloat(currentYearData.ending_net_worth_this_year) || 0;
        const currentAssets = parseFloat(currentYearData.ending_assets_this_year) || 0;
        const currentLiabilities = parseFloat(currentYearData.ending_liabilities_this_year) || 0;

        // Push values to arrays
        worth.push(currentWorth);
        assets.push(currentAssets);
        liabilities.push(currentLiabilities);

        // Add year from the plan data (assuming year is in calculations.year)
        years.push(currentYearData.year || i); // Use plan year or index as fallback
    }

    // Return data structured for graphing
    worth.shift();
    assets.shift();
    liabilities.shift();
    years.shift();
    return {
        worth,
        assets,
        liabilities,
        years,
    };
}