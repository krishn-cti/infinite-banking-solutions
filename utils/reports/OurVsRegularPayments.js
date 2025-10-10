// utils/reports/OurVsRegularPayments.js
import { calculateAmortizationSchedule, calculateCurrentMonthInLoan } from '../calculations/utils.js'; // Adjust path as needed

/**
 * Calculates "our" interest payments vs. "regular" interest payments based on the plan data.
 * @param {Object} output - Object containing plan and data (e.g., from createClientPlan).
 * @returns {Object} - Object containing arrays of our interest (graphMortgage) and regular interest (graphBalances) for graphing.
 */
export default function calculateOurVsRegularPayments(output) {
    if (!output || !output.plan || !Array.isArray(output.plan)) {
        throw new Error('Invalid output data provided: plan must be an array');
    }
    if (!output.data?.properties?.[0]) {
        output.data.properties = [{}];
    }

    let hasPlanZeroOccurred = false;

    // Calculate "our" interest (custom plan)
    const ourInterest = output.plan.map((item) => {
        const mortgageInterest = parseFloat(item.calculations?.total_mortgage_emi_interest_paid_this_year) || 0;
        const helocInterest = parseFloat(item.calculations?.annualized_interest_amount_of_repayments_to_heloc_made_this_year) || 0;
        return mortgageInterest + helocInterest;
    });

    const totalOurInterest = ourInterest
        .reduce((accum, item) => accum + item, 0)
        .toFixed(2);

    // Filter mortgage balances based on starting_mortgage_balance
    const mortgageBalances = output.plan
        .filter((item) => {
            const balance = parseFloat(item.calculations?.starting_mortgage_balance) || 0;
            if (balance === 0) {
                if (!hasPlanZeroOccurred) {
                    hasPlanZeroOccurred = true;
                    return true;
                }
                return false;
            }
            return true;
        })
        .map((item) => parseFloat(item.calculations?.starting_mortgage_balance) || 0);

    // Handle no-property case or missing mortgage
    let schedule = [];
    let totalCurrentInterest = "0.00";
    let graphBalances = [0];
    if (output.data.properties[0].mortgage) {
        schedule = calculateAmortizationSchedule(output.data.properties[0].mortgage);
        if (schedule && schedule.length) {
            totalCurrentInterest = schedule
                .reduce((accum, item) => accum + parseFloat(item.interest_payment) || 0, 0)
                .toFixed(2);

            const monthsPassed = calculateCurrentMonthInLoan(output.data.properties[0].mortgage) || 0;
            schedule = schedule.slice(Math.max(0, monthsPassed));

            const interval = 12; // Annual data points
            graphBalances = schedule
                .filter((item, index) => (index + 1) % interval === 0 || parseFloat(item.end_balance) === 0)
                .map((item) => parseFloat(item.start_balance) || 0);

            if (graphBalances.length > 0 && schedule.length > 1) {
                graphBalances.unshift(parseFloat(schedule[1].start_balance) || 0);
            }
            if (graphBalances.length > 0) {
                graphBalances[graphBalances.length - 1] = 0; // Set final balance to 0
            }
        }
    }

    let graphMortgage = [...mortgageBalances];
    let lengthDifference = graphBalances.length - mortgageBalances.length;

    if (lengthDifference > 0) {
        graphMortgage.push(...Array(lengthDifference).fill(0));
    }

    // Return data structured for graphing
    return {
        graphMortgage,
        graphBalances,
        totalOurInterest,
        totalCurrentInterest,
    };
}