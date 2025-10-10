// utils/reportCalculations/index.js
import { calculateAmortizationSchedule } from "../calculations/utils.js";

// Fallback for calculateAmortizationScheduleWithNoProp
let calculateAmortizationScheduleWithNoProp = calculateAmortizationSchedule; // Default fallback
(async () => {
    try {
        const module = await import("../calculationWithNoProp/utils.js");
        calculateAmortizationScheduleWithNoProp = module.calculateAmortizationScheduleWithNoProp || calculateAmortizationSchedule;
    } catch (error) {
        console.warn(
            "Failed to import calculateAmortizationScheduleWithNoProp, using calculateAmortizationSchedule as fallback:",
            error.message
        );
    }
})();

/**
 * Generates report data with year-wise calculations for mortgage and HELOC completion.
 * @param {Array} plan - Array of year-wise financial data from createPlan.
 * @param {Object} data - Financial data containing properties and mortgage details.
 * @param {number|string} case_type_id - The case type ID to determine the amortization function.
 * @returns {Object} - Object containing mortgage, HELOC, and debt completion years and amounts.
 */
export function generateReportData(plan, data, case_type_id) {
    // Validate inputs
    if (!plan || !Array.isArray(plan)) {
        return {
            mortgageYearByOurPlan: 0,
            helocYearByOurPlan: 0,
            helocYearByRegularPlan: 0,
            propertyNoHelocYearByOurPlan: 0,
            propertyNoHelocYearByRegularPlan: 0,
            creditAndLoanYearByOurPlan: 0,
            onlyHelocYearByOurPlan: 0,
            onlyHelocAmountByOurPlan: 0,
        };
    }
    if (!data?.properties?.[0]?.mortgage && case_type_id !== '4') {
        return {
            mortgageYearByOurPlan: 0,
            helocYearByOurPlan: 0,
            helocYearByRegularPlan: 0,
            propertyNoHelocYearByOurPlan: 0,
            propertyNoHelocYearByRegularPlan: 0,
            creditAndLoanYearByOurPlan: 0,
            onlyHelocYearByOurPlan: 0,
            onlyHelocAmountByOurPlan: 0,
        };
    }

    const output = { plan, data };

    // Calculate mortgage completion year based on our plan
    const mortgageYearByOurPlan = Math.floor(
        output?.plan
            .slice(1)
            .findLast(
                (element) =>
                    element.calculations.starting_mortgage_balance != 0
            )?.year || 1
    )

    // Calculate HELOC completion year based on our plan
    const helocYearByOurPlan = Math.floor(
        output?.plan.findLast(
            (element) => element.calculations.starting_heloc_balance > 0
        )?.year || 1
    )

    // Select amortization function based on case_type_id
    const amortizationFunction =
        case_type_id === '3' || case_type_id === '4'
            ? calculateAmortizationScheduleWithNoProp
            : calculateAmortizationSchedule;

    // Calculate HELOC completion year based on regular plan
    const helocYearByRegularPlan = Math.floor(
        amortizationFunction(
            output?.data.properties[0].mortgage
        ).length /
        12 -
        output?.plan.findLast(
            (element) =>
                element.calculations.starting_heloc_balance +
                element.calculations.starting_mortgage_balance >
                0
        )?.year || 1
    )

    // Calculation for property but no HELOC
    const propertyNoHelocYearByOurPlan = Math.floor(
        output?.plan.findLast(
            (element) => element.calculations.starting_mortgage_balance > 0
        )?.year || 1
    )

    const propertyNoHelocYearByRegularPlan = Math.floor(
        amortizationFunction(
            output?.data.properties[0].mortgage
        ).length /
        12 -
        output?.plan.findLast(
            (element) =>
                element.calculations.starting_mortgage_balance > 0
        )?.year || 1
    )

    // Calculate credits and loans year based on our plan
    const creditAndLoanYearByOurPlan = Math.floor(
        output?.plan.find(
            (element) =>
                element.calculations.total_outstanding_debt_balances == 0
        )?.year - 1 || 1
    )

    // Calculate only if HELOC is available in the case
    let onlyHelocYearByOurPlan = 0;
    let onlyHelocAmountByOurPlan = 0;

    if (case_type_id == 2) {
        // HELOC year calculation
        onlyHelocYearByOurPlan = Math.floor(
            output?.plan.find(
                (element) =>
                    element.calculations.total_outstanding_debt_balances == 0
            )?.year || 1
        )

        // HELOC amount calculation
        const debtFreeYear = onlyHelocYearByOurPlan;
        if (debtFreeYear > 0 && output.plan[debtFreeYear - 1]) {
            onlyHelocAmountByOurPlan = Math.round(
                output?.plan[
                    Math.floor(
                        output?.plan.find(
                            (element) =>
                                element.total_outstanding_debt_balances == 0
                        )?.year - 1 || 1
                    )
                ].calculations.annual_surplus_budget_available +
                output?.plan[
                    Math.floor(
                        output?.plan.find(
                            (element) =>
                                element.total_outstanding_debt_balances == 0
                        )?.year - 1 || 1
                    )
                ].calculations.total_annualized_debt_payments_redirected_so_far
            )
        }
    }

    const allDebtsYearByOurPlan = Math.floor(
        output?.plan[output?.plan.length - 1]?.year || 1
    )

    const firstMoneyCalculation = Math.round(output?.plan[1]?.calculations.ending_net_worth_this_year)

    const secondMoneyCalculation = Math.round(
        output?.plan[output?.plan.length - 1]
            ?.calculations.ending_net_worth_this_year
    )

    return {
        mortgageYearByOurPlan,
        helocYearByOurPlan,
        helocYearByRegularPlan,
        propertyNoHelocYearByOurPlan,
        propertyNoHelocYearByRegularPlan,
        creditAndLoanYearByOurPlan,
        onlyHelocYearByOurPlan,
        onlyHelocAmountByOurPlan,
        allDebtsYearByOurPlan,
        firstMoneyCalculation,
        secondMoneyCalculation
    };
}