import db from "../config/db.js";

// 1. Get People
export const getPeople = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
            id AS client_people_id,
            first_name,
            last_name,
            date_of_birth AS birthday,
            monthly_net_income,
            monthly_other_incomes AS monthly_other_income,
            monthly_bonuses_dividends AS monthly_bonuses_dividends_income,
            increase_percent AS year_on_year_growth,
            phone_number AS phone,
            email,
            people_type AS child
        FROM client_peoples
        WHERE case_id = ?
        `;
        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

// 2. Get Properties with mortgages, heloc, and expenses
export const getProperties = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
            id,
            property_name AS name,
            property_address AS address,
            current_value,
            equity AS calculated_current_equity,
            financed_amount,
            loan_start_date,
            loan_tenure AS loan_length_in_months,
            interest_rate AS mortgage_interest_rate,
            current_loan_balance AS calculated_current_loan_balance,
            monthly_payment AS calculated_monthly_payment_expense,
            heloc_amount AS heloc_balance,
            heloc_interest_rate,
            heloc_room_abvailable AS calculated_room_available,
            monthly_mortgage_insurance_expense,
            monthly_property_tax_expense,
            monthly_utility_expense AS monthly_utilities_expense,
            monthly_property_insurance_expense,
            community_condo_fees_expense AS monthly_community_fees_expense,
            monthly_mortgage_extra_expense
        FROM client_properties
        WHERE case_id = ?
        `;
        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);

            const properties = rows.map(row => ({
                name: row.name,
                address: row.address,
                current_value: row.current_value,
                calculated_current_equity: row.calculated_current_equity,
                mortgage: {
                    financed_amount: row.financed_amount,
                    loan_start_date: row.loan_start_date,
                    loan_length_in_months: row.loan_length_in_months,
                    interest_rate: row.mortgage_interest_rate,
                    calculated_current_loan_balance: row.calculated_current_loan_balance,
                    calculated_monthly_payment_expense: row.calculated_monthly_payment_expense,
                    extra_principal_payments: []
                },
                heloc: {
                    balance: row.heloc_balance,
                    interest_rate: row.heloc_interest_rate,
                    calculated_room_available: row.calculated_room_available,
                },
                expenses: {
                    monthly_mortgage_insurance_expense: row.monthly_mortgage_insurance_expense,
                    monthly_property_tax_expense: row.monthly_property_tax_expense,
                    monthly_utilities_expense: row.monthly_utilities_expense,
                    monthly_property_insurance_expense: row.monthly_property_insurance_expense,
                    monthly_community_fees_expense: row.monthly_community_fees_expense,
                    monthly_mortgage_extra_expense: row.monthly_mortgage_extra_expense,
                }
            }));

            resolve(properties);
        });
    });
};

// 3. Get Credit
export const getCredits = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
            credit_type AS name,
            credit_limit,
            balance AS balance_today,
            interest_rate,
            monthly_payment AS calculated_monthly_minimum_payment_expense,
            total_payable_amount AS redirected_monthly_minimum_payment_expense
        FROM client_credits
        WHERE case_id = ?
        `;
        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

// 4. Get Loans
export const getLoans = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
            financed_amount,
            start_date AS loan_start_date,
            terms AS loan_length_in_months,
            interest_rate,
            current_balance AS calculated_current_loan_balance,
            monthly_emi AS calculated_monthly_payment_expense
        FROM client_loans
        WHERE case_id = ?
        `;
        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);

            const loans = rows.map(row => ({
                ...row,
                extra_principal_payments: []
            }));

            resolve(loans);
        });
    });
};

// 5. Get Investments
export const getInvestments = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT
            investment_name,
            balance_amount,
            monthly_allotment,
            increase_percent,
            projected_amount
        FROM client_investments
        WHERE case_id = ?
        `;
        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    })
}

// 6. Get Monthly Expenses
export const getMonthlyExpenses = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT
            food,
            clothing_personal_items,
            entertainment,
            travel,
            fees_and_education,
            term_life_insurance,
            di_ci_insurance,
            health_gym_fees,
            kids_activities_sports,
            day_care,
            child_support,
            vehicle_insurance,
            vehicle_gas,
            vehicle_maintenance,
            vehicle_leases,
            tax_installment,
            cell_phones_and_subscriptions,
            gifts,
            additional_expenses,
            others
        FROM client_expenses
        WHERE case_id = ?
        `;
        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    })
}

// 7. Get Total
export const getTotals = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT
            total_income,
            total_investment,
            total_expense,
            preliminary_surplus
        FROM client_totals
        WHERE case_id = ?
        `;
        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    })
}

// 8. Get Expense Reductions
export const getExpenseReductions = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT
            monthly_total_investment_allotment,
            monthly_investment_reduction,
            monthly_total_expense,
            monthly_expense_reduction
        FROM client_reductions
        WHERE case_id = ?
        `;
        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    })
}

// 9. Get Final Total
export const getFinalTotals = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT
            final_total_income,
            total_expense_reduction,
            final_monthly_surplus_budget,
            annual_budget_available,
            heloc_room
        FROM client_final_totals
        WHERE case_id = ?
        `;
        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    })
}

// 10. Combined Fetch
export const getCaseFinancialData = async (caseId) => {
    const [people, properties, credit, loans, investments, monthlyExpenses, totals, expenseReduction, finalTotals] = await Promise.all([
        getPeople(caseId),
        getProperties(caseId),
        getCredits(caseId),
        getLoans(caseId),
        getInvestments(caseId),
        getMonthlyExpenses(caseId),
        getTotals(caseId),
        getExpenseReductions(caseId),
        getFinalTotals(caseId)
    ]);

    return {
        people,
        properties,
        credit,
        loans,
        investments,
        monthlyExpenses,
        totals,
        expenseReduction,
        finalTotals
    };
};
