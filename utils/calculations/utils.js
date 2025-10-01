// utils/calculations/utils.js
import Decimal from "decimal.js";

// Calculate a monthly interest rate from a given annual rate
export function monthlyInterest(annual_interest_rate) {
    return Number(annual_interest_rate) / 100 / 12;
}

// Reduce (sum) data inside an object based on keys
export function reduceData(data, firstKey, secondKey = null) {
    let reduced = data.reduce(
        (total, balance) =>
            secondKey ? total + balance[firstKey][secondKey] : total + balance[firstKey],
        0
    );
    return reduced;
}

// Round a number to 2 decimal places
export function round(num) {
    return Number(parseFloat(num).toFixed(2));
}

/**
 * Calculates an amortization schedule, accounting for extraPrincipalPayments represented inside the loan object
 * An example of extraPrincipalPayments would be: [{month: 25, amount: 2000}, {month: 52, amount: 5000}]
 *
 * @example
 * const loan = {
 *   "financed_amount": 500000,
 *   "loan_start_date": "01/01/2024",
 *   "loan_length_in_months": 240,
 *   "interest_rate": 3.5,
 *   "calculated_current_loan_balance": 495000,
 *   "calculated_monthly_payment_expense": 2998.57,
 *   "extra_principal_payments": [
 *     {"month": 24, "amount": 5000},
 *     {"month": 120, "amount": 10000}
 *   ]
 * };
 *
 * @param {Object} loan - The loan details
 * @param {number} loan.financed_amount - The amount financed for the loan
 * @param {string} loan.loan_start_date - The start date of the loan
 * @param {number} loan.loan_length_in_months - The length of the loan in months
 * @param {number} loan.interest_rate - The interest rate for the loan
 * @param {number} loan.calculated_current_loan_balance - The calculated current balance of the loan
 * @param {number} loan.calculated_monthly_payment_expense - The calculated monthly payment amount
 * @param {Array} loan.extra_principal_payments - An array of extra principal payments, which is optional
 *
 * @returns {Array} Amortization schedule
 *
 * @example
 * const schedule = calculateAmortizationSchedule(loan);
 *
 */
export function calculateAmortizationSchedule(loan) {
    if (!loan || typeof loan !== "object") {
        return [];
    }

    const loanLength = parseInt(loan.loan_length_in_months) || 0;
    const interestRate = new Decimal(monthlyInterest(parseFloat(loan.interest_rate) || 0));
    const monthlyPayment = new Decimal(parseFloat(loan.calculated_monthly_payment_expense) || 0);
    const financedAmount = new Decimal(parseFloat(loan.financed_amount) || 0);

    if (loanLength <= 0 || financedAmount.lessThan(0)) {
        return [];
    }

    const extraPrincipalPayments = loan.extra_principal_payments || [];
    let extraPaymentIndex = 0;

    let schedule = [];
    let startBalance = financedAmount;

    for (let i = 1; i <= loanLength; i++) {
        let interestPayment = startBalance.times(interestRate);
        let principalPayment = monthlyPayment.minus(interestPayment);
        let endBalance = startBalance.minus(principalPayment);

        // Check if there's an extra payment for the current month
        if (
            extraPaymentIndex < extraPrincipalPayments.length &&
            extraPrincipalPayments[extraPaymentIndex].month === i
        ) {
            const extraPayment = new Decimal(parseFloat(extraPrincipalPayments[extraPaymentIndex].amount) || 0);
            endBalance = endBalance.minus(extraPayment);
            principalPayment = principalPayment.plus(extraPayment);
            extraPaymentIndex++;
        }

        if (endBalance.lessThan(0)) {
            principalPayment = principalPayment.plus(endBalance);
            endBalance = new Decimal(0);
        }

        schedule.push({
            month: i,
            start_balance: endBalance.lessThan(0) ? "0.00" : endBalance.toFixed(2),
            interest_payment: interestPayment.toFixed(2),
            principal_payment: principalPayment.toFixed(2),
            end_balance: endBalance.toFixed(2),
        });

        if (endBalance.equals(0)) {
            break;
        }

        startBalance = endBalance;
    }

    return schedule;
}

// Calculate the current month in a loan object, with an optional offset of monthsOffset to enable future year calculations
export function calculateCurrentMonthInLoan(loan, monthsOffset = 0) {
    if (!loan || !loan.loan_start_date) {
        return 0;
    }

    const loanStartDate = new Date(loan.loan_start_date);
    if (isNaN(loanStartDate.getTime())) {
        return 0;
    }

    const now = new Date();
    const monthsPassed =
        (now.getFullYear() - loanStartDate.getFullYear()) * 12 +
        now.getMonth() -
        loanStartDate.getMonth() +
        monthsOffset;

    return Math.max(0, monthsPassed);
}

export function validateLoanMonth(month, startLoanDate) {
    if (!startLoanDate || isNaN(new Date(startLoanDate).getTime())) {
        return false;
    }

    const millisecondsPerMonth = 30.44 * 24 * 60 * 60 * 1000;
    const startDate = new Date(startLoanDate).getTime();
    const currentDate = new Date().getTime();
    const monthDiff = Math.floor((currentDate - startDate) / millisecondsPerMonth);
    return Number(month) >= monthDiff;
}

// ** PDF GENERATION FUNCTIONS ** //

// ** CONVERT JSX TO RAW HTML FOR PUPPETEER PDF GENERATION **
// Recursive function to render components and their descendants

// ** GET RAW CSS FROM DOM FOR PUPPETEER PDF GENERATION **
// !DON'T USE THIS FUNCTION INSIDE PAGES FOLDER

// ** PDF GENERATION **

// ** CSV data generation **
export const GENERATE_CSV = async (type, csvData) => {
    const { people, properties, credit, loans, investments, expenses, totals } = csvData;

    //!! PEOPLE
    const peopleHeader = [
        "People",
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Birthday",
        "Monthly Net Income",
        "Monthly Bonuses Dividends Income",
        "Monthly Other Income",
    ];
    const peopleData = people.map((people, index) => [
        index + 1,
        people.first_name || "",
        people.last_name || "",
        people.email || "",
        people.phone || "",
        people.birthday || "",
        people.monthly_net_income || 0,
        people.monthly_bonuses_dividends_income || 0,
        people.monthly_other_income || 0,
    ]);

    //!! CREDIT
    const creditCardsHeader = [
        "Credit",
        "Name",
        "Credit Limit",
        "Balance Today",
        "Interest Rate",
        "Calculated Monthly Minimum Payment Expense",
    ];
    const creditCardsData = credit.map((card, index) => [
        index + 1,
        card.name || "",
        card.credit_limit || 0,
        card.balance_today || 0,
        card.interest_rate || 0,
        card.calculated_monthly_minimum_payment_expense || 0,
    ]);

    //!! LOANS
    const loansHeader = [
        "Loans",
        "Name",
        "Loan Length in Months",
        "Loan Start Date",
        ...loans.map((ele, index) => "Extra Principal Payments - " + (index + 1)),
        "Calculated Current Loan Balance",
        "Interest Rate",
        "Financed Amount",
        "Calculated Monthly Payment Expense",
    ];

    const loansData = loans.map((loan, index) => [
        index + 1,
        loan.name || "",
        loan.loan_length_in_months || 0,
        loan.loan_start_date || "",
        ...(loan.extra_principal_payments || []),
        loan.calculated_current_loan_balance || 0,
        loan.interest_rate || 0,
        loan.financed_amount || 0,
        loan.calculated_monthly_payment_expense || 0,
    ]);

    //!! INVESTMENT
    const investmentHeader = ["Investments", "Name", "Monthly Allotment Expense", "Balance"];

    const investmentData = investments.map((account, index) => [
        index + 1,
        account.name || "",
        account.monthly_allotment_expense || 0,
        account.balance || 0,
    ]);

    //!! EXPENSE
    const expensesHeader = [
        "Expenses",
        "Monthly Additional Expected Expenditures Expense",
        "Monthly Vehicles Gas Expense",
        "Monthly Term Life Insurance Expense",
        "Monthly Clothing Peopleal Items Expense",
        "Monthly DI CI Insurance Expense",
        "Monthly Entertainment Expense",
        "Monthly Income Tax Expense",
        "Monthly Vehicles Insurance Expense",
        "Monthly Travel Expense",
        "Monthly Vehicles Lease Expense",
        "Monthly Education Expense",
        "Monthly Food Expense",
        "Monthly Gifts Expense",
        "Monthly Kids Activities Expenses Expense",
        "Monthly Child Support Expense",
        "Monthly Daycare Expense",
        "Monthly Other Expense",
        "Monthly Vehicles Maintenance Expense",
        "Monthly Health Gym Fees Expense",
        "Monthly Professional Fees Expense",
    ];

    const expensesData = expenses.map((expense, index) => [
        index + 1,
        expense.monthly_additional_expected_expenditures_expense || 0,
        expense.monthly_vehicles_gas_expense || 0,
        expense.monthly_term_life_insurance_expense || 0,
        expense.monthly_clothing_peopleal_items_expense || 0,
        expense.monthly_di_ci_insurance_expense || 0,
        expense.monthly_entertainment_expense || 0,
        expense.monthly_income_tax_expense || 0,
        expense.monthly_vehicles_insurance_expense || 0,
        expense.monthly_travel_expense || 0,
        expense.monthly_vehicles_lease_expense || 0,
        expense.monthly_education_expense || 0,
        expense.monthly_food_expense || 0,
        expense.monthly_gifts_expense || 0,
        expense.monthly_kids_activities_expenses_expense || 0,
        expense.monthly_child_support_expense || 0,
        expense.monthly_daycare_expense || 0,
        expense.monthly_other_expense || 0,
        expense.monthly_vehicles_maintenance_expense || 0,
        expense.monthly_health_gym_fees_expense || 0,
        expense.monthly_professional_fees_expense || 0,
    ]);

    //!! TOTALS
    const totalsHeader = [
        "Totals",
        "Monthly Reduction on Investment Accounts Allotment",
        "Calculated Annual Principal Payment",
        "Calculated Monthly Total Reduction in Expenses",
        "Calculated Monthly Total Expenses",
        "Calculated Monthly Final Surplus Budget",
        ...totals.recommended_insurance_amounts.map(
            (ele, index) => "Recommended Insurance Amounts - " + (index + 1)
        ),
        "Calculated Monthly Preliminary Surplus Budget",
        "Monthly Reduction on Replaced Insurance Expenses",
        "Calculated Monthly Total Income",
        "Calculated Annual Budget Available",
        "Calculated Monthly Total Investment Allotments",
    ];

    const totalsData = [
        1,
        totals.monthly_reduction_on_investment_accounts_allotment || 0,
        totals.calculated_annual_principal_payment || 0,
        totals.calculated_monthly_total_reduction_in_expenses || 0,
        totals.calculated_monthly_total_expenses || 0,
        totals.calculated_monthly_final_surplus_budget || 0,
        ...(totals.recommended_insurance_amounts || []),
        totals.calculated_monthly_preliminary_surplus_budget || 0,
        totals.monthly_reduction_on_replaced_insurance_expenses || 0,
        totals.calculated_monthly_total_income || 0,
        totals.calculated_annual_budget_available || 0,
        totals.calculated_monthly_total_investment_allotments || 0,
    ];

    //!! PROPERTIES
    const propertiesHeaderCA = [
        "Properties",
        "Name",
        "Address",
        "Current Value",
        "Calculated Current Equity",
        "Mortgage Calculated Monthly Payment Expense",
        "Expenses Monthly Mortgage Extra Expense",
        "Expenses Monthly Property Tax Expense",
        "Expenses Monthly Mortgage Insurance Expense",
        "Expenses Monthly Property Insurance Expense",
        "Expenses Monthly Community Fees Expense",
        "Expenses Monthly Utilities Expense",
        "Mortgage Extra Principal Payments",
        "Mortgage Loan Length in Months",
        "Mortgage Next Mortgage Renewal Date",
        "Mortgage Interest Rate",
        "Mortgage Loan Start Date",
        "Mortgage Calculated Current Loan Balance",
        "HELOC Balance",
        "HELOC Calculated Room Available",
        "HELOC Interest Rate",
    ];

    const propertiesDataCA = properties.map((property, index) => [
        index + 1,
        property?.name || "",
        property?.address || "",
        property?.current_value || 0,
        property?.calculated_current_equity || 0,
        property?.mortgage?.calculated_monthly_payment_expense || 0,
        property?.expenses?.monthly_mortgage_extra_expense || 0,
        property?.expenses?.monthly_property_tax_expense || 0,
        property?.expenses?.monthly_mortgage_insurance_expense || 0,
        property?.expenses?.monthly_property_insurance_expense || 0,
        property?.expenses?.monthly_community_fees_expense || 0,
        property?.expenses?.monthly_utilities_expense || 0,
        property?.mortgage?.extra_principal_payments || [],
        property?.mortgage?.loan_length_in_months || 0,
        property?.mortgage?.next_mortgage_renewal_date || "N/A",
        property?.mortgage?.interest_rate || 0,
        property?.mortgage?.loan_start_date || "",
        property?.mortgage?.calculated_current_loan_balance || 0,
        property?.heloc?.balance || 0,
        property?.heloc?.calculated_room_available || 0,
        property?.heloc?.interest_rate || 0,
    ]);

    const propertiesHeaderUS = [
        "Properties",
        "Name",
        "Address",
        "Current Value",
        "Calculated Current Equity",
        "Mortgage Calculated Monthly Payment Expense",
        "Expenses Monthly Mortgage Extra Expense",
        "Expenses Monthly Property Tax Expense",
        "Expenses Monthly Mortgage Insurance Expense",
        "Expenses Monthly Property Insurance Expense",
        "Expenses Monthly Community Fees Expense",
        "Expenses Monthly Utilities Expense",
        "Mortgage Extra Principal Payments",
        "Mortgage Loan Length in Months",
        "Mortgage Interest Rate",
        "Mortgage Loan Start Date",
        "Mortgage Calculated Current Loan Balance",
    ];

    const propertiesDataUS = properties.map((property, index) => [
        index + 1,
        property?.name || "",
        property?.address || "",
        property?.current_value || 0,
        property?.calculated_current_equity || 0,
        property?.mortgage?.calculated_monthly_payment_expense || 0,
        property?.expenses?.monthly_mortgage_extra_expense || 0,
        property?.expenses?.monthly_property_tax_expense || 0,
        property?.expenses?.monthly_mortgage_insurance_expense || 0,
        property?.expenses?.monthly_property_insurance_expense || 0,
        property?.expenses?.monthly_community_fees_expense || 0,
        property?.expenses?.monthly_utilities_expense || 0,
        property?.mortgage?.extra_principal_payments || [],
        property?.mortgage?.loan_length_in_months || 0,
        property?.mortgage?.interest_rate || 0,
        property?.mortgage?.loan_start_date || "",
        property?.mortgage?.calculated_current_loan_balance || 0,
    ]);

    const modifiedData = [
        [""],
        peopleHeader,
        ...peopleData,
        [""],
        type === "ca" ? propertiesHeaderCA : propertiesHeaderUS,
        ...(type === "ca" ? propertiesDataCA : propertiesDataUS),
        [""],
        creditCardsHeader,
        ...creditCardsData,
        [""],
        loansHeader,
        ...loansData,
        [""],
        investmentHeader,
        ...investmentData,
        [""],
        expensesHeader,
        ...expensesData,
        [""],
        totalsHeader,
        [...totalsData],
    ];

    const csvContent =
        "data:text/csv;charset=utf-8," + modifiedData.map((row) => row.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "heloc-data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};