// utils/reports/index.js

// Import the four calculation files
import calculateMortgageHelocCashLoan from './MotrgageHelocCashLoan.js';
import calculateNetworthOvertime from './NetworthOvertime.js';
import calculateOurVsRegularPayments from './OurVsRegularPayments.js';
import calculateTotalDespositsVsTotalCash from './TotalDespositsVsTotalCash.js';

// Main function to generate the report based on the plan response
export function generateReport(plan, policy, data) {
    const output = { plan, data }; // Combine plan and data into an output object

    // Execute calculations from each file using the plan and policy data
    const mortgageHelocCashLoan = calculateMortgageHelocCashLoan(plan);
    const networthOvertime = calculateNetworthOvertime(plan);
    const ourVsRegularPayments = calculateOurVsRegularPayments(output);
    const totalDespositsVsTotalCash = calculateTotalDespositsVsTotalCash(policy);

    // Combine results into a single report object
    const report = {
        mortgageHelocCashLoan,
        networthOvertime,
        ourVsRegularPayments,
        totalDespositsVsTotalCash,
    };

    return report;
}

// Export individual functions if needed for direct access
export {
    calculateMortgageHelocCashLoan,
    calculateNetworthOvertime,
    calculateOurVsRegularPayments,
    calculateTotalDespositsVsTotalCash,
};