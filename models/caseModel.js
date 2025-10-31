import db from "../config/db.js";
import util from "util";

// Convert query to async/await
const queryAsync = util.promisify(db.query).bind(db);

export const getCaseTypes = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM case_types WHERE status = 1 ORDER BY id DESC`;
        db.query(query, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getAllCasesByClientId = (clientId, search, status) => {
    return new Promise((resolve, reject) => {
        let query = `
        SELECT CC.*, CT.type_name AS type_name
        FROM client_cases AS CC
        LEFT JOIN case_types AS CT ON CC.case_type_id = CT.id
        WHERE CC.is_copy = 0 AND CC.client_id = ?
        `;

        const params = [clientId];

        if (search) {
            query += ` AND (CC.full_name LIKE ? OR CC.case_name LIKE ? OR CT.type_name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status !== '' && status !== undefined && status !== null) {
            query += ` AND CC.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY CC.id DESC`;

        db.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// export const getCasesByCaseId = (caseId) => {
//     return new Promise((resolve, reject) => {
//         let query = `
//         SELECT CC.*,
//         CT.type_name AS type_name,
//         CU.created_by AS agent_id,
//         AU.name AS agent_name
//         FROM client_cases AS CC
//         LEFT JOIN case_types AS CT ON CC.case_type_id = CT.id
//         LEFT JOIN users CU ON CC.client_id = CU.id AND CU.role_id = 4
//         LEFT JOIN users AU ON CU.created_by = AU.id AND AU.role_id = 3
//         WHERE CC.id = ?
//         `;

//         db.query(query, caseId, (err, results) => {
//             if (err) return reject(err);
//             resolve(results[0]);
//         });
//     });
// };

export const getCasesByCaseId = async (caseId) => {
    const query = `
        SELECT 
            CC.*,
            CT.type_name AS type_name,
            CU.created_by AS agent_id,
            AU.name AS agent_name
        FROM client_cases AS CC
        LEFT JOIN case_types AS CT ON CC.case_type_id = CT.id
        LEFT JOIN users CU ON CC.client_id = CU.id AND CU.role_id = 4
        LEFT JOIN users AU ON CU.created_by = AU.id AND AU.role_id = 3
        WHERE CC.id = ?
    `;

    const [rows] = await db.promise().query(query, [caseId]);
    return rows[0];
};

export const upsertClientCase = (caseId, caseData) => {
    return new Promise((resolve, reject) => {
        if (caseId) {
            // Update existing case
            db.query("UPDATE client_cases SET ? WHERE id = ?", [caseData, caseId], (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        } else {
            // Insert new case
            db.query("INSERT INTO client_cases SET ?", caseData, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        }
    });
};

export const deleteClientCaseAndCopies = async (caseId) => {
    return new Promise((resolve, reject) => {
        db.query(
            "DELETE FROM client_cases WHERE id = ? OR copied_from_case_id = ?",
            [caseId, caseId],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

export const updateCaseByCaseId = async (caseId, updateObj) => {
    return new Promise((resolve, reject) => {
        db.query(
            "UPDATE client_cases SET ? WHERE id = ?",
            [updateObj, caseId],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

export const insertClientTotals = async (totalData) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO client_totals SET ?", totalData, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const updateClientTotals = async (caseId, totalData) => {
    return new Promise((resolve, reject) => {
        db.query("UPDATE client_totals SET ? WHERE case_id  = ?", [totalData, caseId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const updateCompletedSteps = (case_id, completed_step) => {
    return new Promise((resolve, reject) => {
        let query = '';
        if (completed_step === "final_report_completed") {
            query = `UPDATE client_cases SET completed_step = ?, status = 1 WHERE id = ?`;
        } else {
            query = `UPDATE client_cases SET completed_step = ? WHERE id = ?`;
        }
        db.query(query, [completed_step, case_id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const removeClientPeoples = async (caseId) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM client_peoples WHERE case_id = ?", [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const upsertClientPeoplePolicy = async ({ case_id, client_people_id }) => {
    const checkQuery = `
        SELECT id FROM client_people_policies
        WHERE case_id = ? AND client_people_id = ?
        LIMIT 1
    `;
    const existing = await queryAsync(checkQuery, [case_id, client_people_id]);

    if (existing.length > 0) {
        return true;
    }

    // Insert with defaults
    const insertQuery = `
        INSERT INTO client_people_policies
        (case_id, client_people_id, minimum_recommended_life_coverage, insurance_carrier, policy_interest_rate, policy_start_date, actual_policy_start_date)
        VALUES (?, ?, 0.0, NULL, 0.0, NULL, NULL)
    `;
    return queryAsync(insertQuery, [case_id, client_people_id]);
};


export const insertClientPeople = (data) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO client_peoples SET ?`;
        db.query(query, data, (err, result) => {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};

export const updateClientPeopleById = (id, data) => {
    return new Promise((resolve, reject) => {
        const query = `UPDATE client_peoples SET ? WHERE id = ?`;
        db.query(query, [data, id], (err, result) => {
            if (err) return reject(err);
            resolve(result.affectedRows);
        });
    });
};

export const deleteClientPeopleById = (id) => {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM client_peoples WHERE id = ?`;
        db.query(query, [id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const deleteClientCaseByCaseId = (id) => {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM client_cases WHERE id = ?`;
        db.query(query, [id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const getClientPeopleByCaseId = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM client_peoples WHERE status = 1 AND case_id = ? ORDER BY id DESC`;
        db.query(query, [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const removeClientProperties = async (caseId) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM client_properties WHERE case_id = ?", [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const insertClientProperties = async (caseId, clientProperties) => {
    return new Promise((resolve, reject) => {
        const values = clientProperties.map(item => [
            caseId,
            item.property_name || null,
            item.property_address || null,
            item.current_value || 0.0,
            item.equity || 0.0,
            item.financed_amount || 0.0,
            item.loan_start_date || null,
            item.loan_tenure || null,
            item.interest_rate || 0.0,
            item.current_loan_balance || 0.0,
            item.monthly_payment || 0.0,
            item.heloc_interest_rate || 0.0,
            item.heloc_percent || 0.0,
            item.heloc_monthly_payment || 0.0,
            item.heloc_amount || 0.0,
            item.heloc_current_debt_balance || 0.0,
            item.heloc_room_abvailable || 0.0,
            item.monthly_mortgage_insurance_expense || 0.0,
            item.monthly_mortgage_extra_expense || 0.0,
            item.monthly_property_tax_expense || 0.0,
            item.monthly_property_insurance_expense || 0.0,
            item.monthly_utility_expense || 0.0,
            item.community_condo_fees_expense || 0.0,
            item.notes || null,
        ]);

        const query = `
            INSERT INTO client_properties (
                case_id, property_name, property_address, current_value, equity, financed_amount, loan_start_date, loan_tenure, interest_rate, current_loan_balance, monthly_payment, heloc_interest_rate, heloc_percent, heloc_monthly_payment, heloc_amount, heloc_current_debt_balance, heloc_room_abvailable, monthly_mortgage_insurance_expense, monthly_mortgage_extra_expense, monthly_property_tax_expense, monthly_property_insurance_expense, monthly_utility_expense, community_condo_fees_expense, notes
            ) VALUES ?
        `;

        db.query(query, [values], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const getClientPropertyByCaseId = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM client_properties WHERE status = 1 AND case_id = ? ORDER BY id DESC`;
        db.query(query, [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const removeClientCredits = async (caseId) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM client_credits WHERE case_id = ?", [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const insertClientCredits = async (caseId, clientCredits) => {
    return new Promise((resolve, reject) => {
        const values = clientCredits.map(item => [
            caseId,
            item.credit_type || null,
            item.other_credit || null,
            item.credit_limit || 0.0,
            item.balance || 0.0,
            item.interest_rate || 0.0,
            item.terms || 0,
            item.monthly_payment || 0.0,
            item.total_payable_amount || 0.0
        ]);

        const query = `
            INSERT INTO client_credits (
                case_id, credit_type, other_credit, credit_limit, balance, interest_rate, terms, monthly_payment, total_payable_amount
            ) VALUES ?
        `;

        db.query(query, [values], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const getClientCreditByCaseId = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM client_credits WHERE status = 1 AND case_id = ? ORDER BY id DESC`;
        db.query(query, [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const removeClientLoans = async (caseId) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM client_loans WHERE case_id = ?", [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const insertClientLoans = async (caseId, clientLoans) => {
    return new Promise((resolve, reject) => {
        const values = clientLoans.map(item => [
            caseId,
            item.loan_name || null,
            item.financed_amount || 0.0,
            item.start_date || null,
            item.terms || null,
            item.interest_rate || 0.0,
            item.current_balance || 0.0,
            item.monthly_emi || 0.0
        ]);

        const query = `
            INSERT INTO client_loans (
                case_id, loan_name, financed_amount, start_date, terms, interest_rate, current_balance, monthly_emi
            ) VALUES ?
        `;

        db.query(query, [values], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const getClientLoanByCaseId = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM client_loans WHERE status = 1 AND case_id = ? ORDER BY id DESC`;
        db.query(query, [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const removeClientInvestments = async (caseId) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM client_investments WHERE case_id = ?", [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const insertClientInvestments = async (caseId, clientInvestments) => {
    return new Promise((resolve, reject) => {
        const values = clientInvestments.map(item => [
            caseId,
            item.investment_name || null,
            item.balance_amount || 0.0,
            item.monthly_allotment || 0.0,
            item.increase_percent || 0.0,
            item.projected_amount || 0.0
        ]);

        const query = `
            INSERT INTO client_investments (
                case_id, investment_name, balance_amount, monthly_allotment, increase_percent, projected_amount
            ) VALUES ?
        `;

        db.query(query, [values], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const getClientInvestmentByCaseId = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM client_investments WHERE status = 1 AND case_id = ? ORDER BY id DESC`;
        db.query(query, [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const removeClientExpenses = async (caseId) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM client_expenses WHERE case_id = ?", [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const insertClientExpenses = async (caseId, clientExpenses) => {
    return new Promise((resolve, reject) => {
        const values = clientExpenses.map(item => [
            caseId,
            item.food || 0.0,
            item.clothing_personal_items || 0.0,
            item.entertainment || 0.0,
            item.travel || 0.0,
            item.fees_and_education || 0.0,
            item.term_life_insurance || 0.0,
            item.di_ci_insurance || 0.0,
            item.health_gym_fees || 0.0,
            item.kids_activities_sports || 0.0,
            item.day_care || 0.0,
            item.child_support || 0.0,
            item.vehicle_insurance || 0.0,
            item.vehicle_gas || 0.0,
            item.vehicle_maintenance || 0.0,
            item.vehicle_leases || 0.0,
            item.tax_installment || 0.0,
            item.cell_phones_and_subscriptions || 0.0,
            item.gifts || 0.0,
            item.additional_expenses || 0.0,
            item.others || 0.0,
        ]);

        const query = `
            INSERT INTO client_expenses (
                case_id, food, clothing_personal_items, entertainment, travel, fees_and_education, term_life_insurance, di_ci_insurance, health_gym_fees, kids_activities_sports, day_care, child_support, vehicle_insurance, vehicle_gas, vehicle_maintenance, vehicle_leases, tax_installment, cell_phones_and_subscriptions, gifts, additional_expenses, others
            ) VALUES ?
        `;

        db.query(query, [values], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const getClientExpenseByCaseId = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM client_expenses WHERE status = 1 AND case_id = ?`;
        db.query(query, [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getClientTotalByCaseId = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM client_totals WHERE status = 1 AND case_id = ?`;
        db.query(query, [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]);
        });
    });
};

export const removeClientReductions = async (caseId) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM client_reductions WHERE case_id = ?", [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const insertClientReductions = async (clientReductions) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO client_reductions SET ?", clientReductions, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const updateInvestmentCheckedStatus = (investmentId, isChecked) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE client_investments
            SET is_checked = ?
            WHERE id = ?
        `;
        db.query(query, [isChecked ? 1 : 0, investmentId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const updateOrInsertExpenseStatus = (caseId, expenseName, isChecked) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO client_expense_statuses (case_id, expense_name, is_checked)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE is_checked = VALUES(is_checked)
        `;
        db.query(query, [caseId, expenseName, isChecked ? 1 : 0], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const getClientReductionByCaseId = (caseId) => {
    return new Promise((resolve, reject) => {
        const queryReduction = `SELECT * FROM client_reductions WHERE status = 1 AND case_id = ? ORDER BY id DESC`;
        const queryInvestments = `
            SELECT id, investment_name, balance_amount, monthly_allotment, increase_percent, projected_amount, is_checked 
            FROM client_investments 
            WHERE status = 1 AND case_id = ?
        `;
        const queryExpenses = `SELECT * FROM client_expenses WHERE status = 1 AND case_id = ?`;
        const queryExpenseStatuses = `SELECT expense_name, is_checked FROM client_expense_statuses WHERE is_checked = 1 AND case_id = ?`;
        const queryProperty = `SELECT * FROM client_properties WHERE status = 1 AND case_id = ?`;
        const queryCredit = `SELECT monthly_payment FROM client_credits WHERE status = 1 AND case_id = ?`;
        const queryLoan = `SELECT monthly_emi FROM client_loans WHERE status = 1 AND case_id = ?`;

        db.query(queryReduction, [caseId], (err1, reductions) => {
            if (err1) return reject(err1);

            db.query(queryInvestments, [caseId], (err2, investments) => {
                if (err2) return reject(err2);

                db.query(queryExpenses, [caseId], (err3, expenses) => {
                    if (err3) return reject(err3);

                    db.query(queryExpenseStatuses, [caseId], (errStatuses, expenseStatuses) => {
                        if (errStatuses) return reject(errStatuses);

                        db.query(queryProperty, [caseId], (err4, properties) => {
                            if (err4) return reject(err4);

                            db.query(queryCredit, [caseId], (err5, credits) => {
                                if (err5) return reject(err5);

                                db.query(queryLoan, [caseId], (err6, loans) => {
                                    if (err6) return reject(err6);

                                    // Total investment
                                    const total_investment = investments.reduce(
                                        (sum, inv) => sum + parseFloat(inv.monthly_allotment || 0),
                                        0
                                    );

                                    // Expense check status map
                                    const expenseStatusMap = {};
                                    expenseStatuses.forEach(status => {
                                        expenseStatusMap[status.expense_name] = status.is_checked;
                                    });

                                    // Base expense fields
                                    const baseFields = [
                                        'food', 'clothing_personal_items', 'entertainment', 'travel',
                                        'fees_and_education', 'term_life_insurance', 'di_ci_insurance',
                                        'health_gym_fees', 'kids_activities_sports', 'day_care',
                                        'child_support', 'vehicle_insurance', 'vehicle_gas',
                                        'vehicle_maintenance', 'vehicle_leases', 'tax_installment',
                                        'cell_phones_and_subscriptions', 'gifts', 'additional_expenses', 'others'
                                    ];

                                    const base_expense = {};
                                    for (const field of baseFields) base_expense[field] = 0;

                                    expenses.forEach(row => {
                                        baseFields.forEach(field => {
                                            base_expense[field] += parseFloat(row[field] || 0);
                                        });
                                    });

                                    const total_base_expense = Object.values(base_expense).reduce((a, b) => a + b, 0);

                                    // Property expense breakdown
                                    const property_expense = {
                                        property_monthly_payment: 0,
                                        heloc_monthly_payment: 0,
                                        monthly_mortgage_insurance_expense: 0,
                                        monthly_mortgage_extra_expense: 0,
                                        monthly_property_tax_expense: 0,
                                        monthly_property_insurance_expense: 0,
                                        monthly_utility_expense: 0,
                                        community_condo_fees_expense: 0
                                    };

                                    properties.forEach(row => {
                                        property_expense.property_monthly_payment += parseFloat(row.monthly_payment || 0);
                                        property_expense.heloc_monthly_payment += parseFloat(row.heloc_monthly_payment || 0);
                                        property_expense.monthly_mortgage_insurance_expense += parseFloat(row.monthly_mortgage_insurance_expense || 0);
                                        property_expense.monthly_mortgage_extra_expense += parseFloat(row.monthly_mortgage_extra_expense || 0);
                                        property_expense.monthly_property_tax_expense += parseFloat(row.monthly_property_tax_expense || 0);
                                        property_expense.monthly_property_insurance_expense += parseFloat(row.monthly_property_insurance_expense || 0);
                                        property_expense.monthly_utility_expense += parseFloat(row.monthly_utility_expense || 0);
                                        property_expense.community_condo_fees_expense += parseFloat(row.community_condo_fees_expense || 0);
                                    });

                                    const total_property_expense = Object.values(property_expense).reduce((a, b) => a + b, 0);

                                    // Credit & loan expenses
                                    const credit_expense = {
                                        monthly_payment: credits.reduce((sum, row) => sum + parseFloat(row.monthly_payment || 0), 0)
                                    };

                                    const loan_expense = {
                                        monthly_emi: loans.reduce((sum, row) => sum + parseFloat(row.monthly_emi || 0), 0)
                                    };

                                    // Final expense combination
                                    const allExpenseFields = {
                                        ...base_expense,
                                        ...property_expense,
                                        credit_monthly_payment: credit_expense.monthly_payment,
                                        loan_monthly_emi: loan_expense.monthly_emi
                                    };

                                    const merged_expenses = {};
                                    Object.entries(allExpenseFields).forEach(([field, amount]) => {
                                        const isChecked = expenseStatusMap[field] === 1 ? 1 : 0;
                                        merged_expenses[field] = [parseFloat(amount || 0), isChecked];
                                    });

                                    const total_expense =
                                        total_base_expense + total_property_expense + credit_expense.monthly_payment + loan_expense.monthly_emi;

                                    resolve({
                                        reductions: reductions.length > 0 ? reductions[0] : null,
                                        investments,
                                        expenses: merged_expenses,
                                        total_investment,
                                        total_expense: parseFloat(total_expense.toFixed(2))
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

export const insertClientFinalTotals = async (finalTotalData) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO client_final_totals SET ?", finalTotalData, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const updateClientFinalTotals = async (caseId, finalTotalData) => {
    return new Promise((resolve, reject) => {
        db.query("UPDATE client_final_totals SET ? WHERE case_id  = ?", [finalTotalData, caseId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const getClientFinalTotalByCaseId = (caseId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM client_final_totals WHERE case_id = ?", [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0] || {});
        });
    });
};

export const upsertClientPeoplePolicies = async (caseId, clientPolicies) => {
    return new Promise(async (resolve, reject) => {
        if (!Array.isArray(clientPolicies) || clientPolicies.length === 0) {
            return resolve(false);
        }

        try {
            for (const item of clientPolicies) {
                const {
                    policy_id, // optional
                    client_people_id,
                    minimum_recommended_life_coverage = 0.0,
                    insurance_carrier = null,
                    policy_interest_rate = 0.0,
                    policy_start_date = null,
                    actual_policy_start_date = null
                } = item;

                if (policy_id) {
                    // UPDATE
                    await queryAsync(`
                        UPDATE client_people_policies
                        SET
                            client_people_id = ?,
                            minimum_recommended_life_coverage = ?,
                            insurance_carrier = ?,
                            policy_interest_rate = ?,
                            policy_start_date = ?,
                            actual_policy_start_date = ?
                        WHERE id = ? AND case_id = ?
                    `, [
                        client_people_id,
                        minimum_recommended_life_coverage,
                        insurance_carrier,
                        policy_interest_rate,
                        policy_start_date,
                        actual_policy_start_date,
                        policy_id,
                        caseId
                    ]);
                } else {
                    // INSERT
                    await queryAsync(`
                        INSERT INTO client_people_policies (
                            case_id,
                            client_people_id,
                            minimum_recommended_life_coverage,
                            insurance_carrier,
                            policy_interest_rate,
                            policy_start_date,
                            actual_policy_start_date
                        ) VALUES (?, ?, ?, ?, ?)
                    `, [
                        caseId,
                        client_people_id,
                        minimum_recommended_life_coverage,
                        insurance_carrier,
                        policy_interest_rate,
                        policy_start_date,
                        actual_policy_start_date
                    ]);
                }
            }

            resolve(true);
        } catch (err) {
            reject(err);
        }
    });
};

export const getClientPeoplePolicyByCaseId = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                CP.id AS client_people_id,
                CP.first_name,
                CP.last_name,
                CP.people_type,
                CONCAT(CP.first_name, ' ', CP.last_name) AS people_full_name,
                CPP.id AS policy_id,
                CPP.minimum_recommended_life_coverage,
                CPP.insurance_carrier,
                CPP.policy_interest_rate,
                CPP.policy_start_date,
                CPP.actual_policy_start_date,
                CPP.policy_file_name
            FROM client_peoples CP
            LEFT JOIN client_people_policies CPP 
                ON CPP.client_people_id = CP.id 
                AND CPP.case_id = CP.case_id 
                AND CPP.status = 1
            WHERE CP.case_id = ?
            ORDER BY CP.id ASC
        `;

        db.query(query, [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getAgentClientIds = (agentId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT id FROM users WHERE created_by = ?`;
        db.query(query, [agentId], (err, results) => {
            if (err) return reject(err);
            const clientIds = results.map(row => row.id);
            resolve(clientIds);
        });
    });
};

export const getCasesOfAgent = (clientIds, search, status) => {
    return new Promise((resolve, reject) => {
        if (!clientIds || clientIds.length === 0) {
            return resolve([]);
        }

        const placeholders = clientIds.map(() => '?').join(', ');
        let query = `
            SELECT 
                CC.*,
                CU.name AS client_name,
                CT.type_name,
                AU.name AS agent_name
            FROM client_cases CC
            LEFT JOIN users CU ON CC.client_id = CU.id AND CU.role_id = 4
            LEFT JOIN users AU ON CC.created_by = AU.id AND AU.role_id = 3
            LEFT JOIN case_types CT ON CC.case_type_id = CT.id
            WHERE CC.client_id IN (${placeholders})
        `;

        const params = [...clientIds];

        if (search) {
            query += ` AND (
                CC.full_name LIKE ? OR 
                CC.case_name LIKE ? OR 
                CT.type_name LIKE ?
            )`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status !== '' && status !== undefined && status !== null) {
            query += ` AND CC.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY CC.id DESC`;

        db.query(query, params, (err, results) => {
            if (err) return reject(err);

            const mappedResults = results.map(row => ({
                ...row,
                agent_name: row.created_by ? row.agent_name : 'Self'
            }));

            resolve(mappedResults);
        });
    });
};

export const getAllCases = (search = '', status = '') => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                CC.*,
                CU.name AS client_name,
                CT.type_name,
                AU.name AS agent_name
            FROM client_cases CC
            LEFT JOIN users CU ON CC.client_id = CU.id AND CU.role_id = 4
            LEFT JOIN users AU ON CC.created_by = AU.id AND AU.role_id = 3
            LEFT JOIN case_types CT ON CC.case_type_id = CT.id
            WHERE 1 = 1
        `;

        const params = [];

        // Optional search filter
        if (search && search.trim() !== '') {
            query += ` AND (
                CC.full_name LIKE ? OR 
                CC.case_name LIKE ? OR 
                CU.name LIKE ? OR 
                CT.type_name LIKE ? OR 
                AU.name LIKE ?
            )`;
            const keyword = `%${search}%`;
            params.push(keyword, keyword, keyword, keyword, keyword);
        }

        // Optional status filter
        if (status !== '' && status !== undefined && status !== null) {
            query += ` AND CC.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY CC.id DESC`;

        db.query(query, params, (err, results) => {
            if (err) return reject(err);

            const mappedResults = results.map(row => ({
                ...row,
                agent_name: row.created_by ? row.agent_name : 'Self'
            }));

            resolve(mappedResults);
        });
    });
};

export const createCaseWithAllData = async (caseData, relatedData) => {
    return new Promise((resolve, reject) => {
        db.beginTransaction(async (err) => {
            if (err) return reject(err);

            try {
                // 1. Insert main case
                const result = await queryAsync(`
                    INSERT INTO client_cases 
                    (case_name, case_type_id, full_name, client_id, created_by, completed_step, status)
                    VALUES (?, ?, ?, ?, ?, ?, 0)
                `, [
                    caseData.case_name,
                    caseData.case_type_id,
                    caseData.full_name,
                    caseData.client_id,
                    caseData.created_by,
                    caseData.completed_step,
                ]);

                const caseId = result.insertId;

                // 2. Peoples
                for (const person of relatedData.peoples || []) {
                    await queryAsync(`
                        INSERT INTO client_peoples
                        (case_id, first_name, last_name, email, phone_number, date_of_birth, monthly_net_income, monthly_bonuses_dividends,
                        monthly_other_incomes, total_amount, increase_percent, projected_amount, people_type, notes, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `, [
                        caseId, person.first_name, person.last_name, person.email, person.phone_number, person.date_of_birth,
                        person.monthly_net_income, person.monthly_bonuses_dividends, person.monthly_other_incomes,
                        person.total_amount, person.increase_percent, person.projected_amount, person.people_type, person.notes
                    ]);
                }

                // 3. Credits
                for (const credit of relatedData.credits || []) {
                    await queryAsync(`
                        INSERT INTO client_credits
                        (case_id, credit_type, other_credit, credit_limit, balance, interest_rate, terms, monthly_payment, total_payable_amount, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `, [
                        caseId, credit.credit_type, credit.other_credit, credit.credit_limit, credit.balance,
                        credit.interest_rate, credit.terms, credit.monthly_payment, credit.total_payable_amount
                    ]);
                }

                // 4. Loans
                for (const loan of relatedData.loans || []) {
                    await queryAsync(`
                        INSERT INTO client_loans
                        (case_id, loan_name, financed_amount, start_date, terms, interest_rate, current_balance, monthly_emi, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `, [
                        caseId, loan.loan_name, loan.financed_amount, loan.start_date, loan.terms,
                        loan.interest_rate, loan.current_balance, loan.monthly_emi
                    ]);
                }

                // 5. Properties
                for (const prop of relatedData.properties || []) {
                    await queryAsync(`
                        INSERT INTO client_properties
                        (case_id, property_name, property_address, current_value, equity, financed_amount,
                         loan_start_date, loan_tenure, interest_rate, current_loan_balance, monthly_payment,
                         heloc_interest_rate, heloc_percent, heloc_monthly_payment, heloc_amount, heloc_current_debt_balance, heloc_room_abvailable,
                         monthly_mortgage_insurance_expense, monthly_mortgage_extra_expense, monthly_property_tax_expense,
                         monthly_property_insurance_expense, monthly_utility_expense, community_condo_fees_expense,
                         notes, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `, [
                        caseId, prop.property_name, prop.property_address, prop.current_value, prop.equity, prop.financed_amount,
                        prop.loan_start_date, prop.loan_tenure, prop.interest_rate, prop.current_loan_balance, prop.monthly_payment,
                        prop.heloc_interest_rate, prop.heloc_percent, prop.heloc_monthly_payment, prop.heloc_amount, prop.heloc_current_debt_balance, prop.heloc_room_abvailable,
                        prop.monthly_mortgage_insurance_expense, prop.monthly_mortgage_extra_expense, prop.monthly_property_tax_expense,
                        prop.monthly_property_insurance_expense, prop.monthly_utility_expense, prop.community_condo_fees_expense,
                        prop.notes
                    ]);
                }

                // 6. Investments
                for (const inv of relatedData.investments || []) {
                    await queryAsync(`
                        INSERT INTO client_investments
                        (case_id, investment_name, balance_amount, monthly_allotment, increase_percent, projected_amount, status)
                        VALUES (?, ?, ?, ?, ?, ?, 1)
                    `, [
                        caseId, inv.investment_name, inv.balance_amount, inv.monthly_allotment, inv.increase_percent, inv.projected_amount
                    ]);
                }

                // 7. Expenses (single row per case)
                if (relatedData.expenses) {
                    const e = relatedData.expenses;
                    await queryAsync(`
                        INSERT INTO client_expenses
                        (case_id, food, clothing_personal_items, entertainment, travel, fees_and_education, term_life_insurance,
                         di_ci_insurance, health_gym_fees, kids_activities_sports, day_care, child_support, vehicle_insurance,
                         vehicle_gas, vehicle_maintenance, vehicle_leases, tax_installment, cell_phones_and_subscriptions,
                         gifts, additional_expenses, others, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `, [
                        caseId, e.food, e.clothing_personal_items, e.entertainment, e.travel, e.fees_and_education,
                        e.term_life_insurance, e.di_ci_insurance, e.health_gym_fees, e.kids_activities_sports, e.day_care,
                        e.child_support, e.vehicle_insurance, e.vehicle_gas, e.vehicle_maintenance, e.vehicle_leases,
                        e.tax_installment, e.cell_phones_and_subscriptions, e.gifts, e.additional_expenses, e.others
                    ]);
                }

                // 8. Insert into client_totals
                await queryAsync(`
                    INSERT INTO client_totals 
                    (case_id, total_income, total_investment, total_expense, preliminary_surplus) 
                    VALUES (?, 0.0, 0.0, 0.0, 0.0)
                `, [caseId]);

                db.commit((err) => {
                    if (err) return db.rollback(() => reject(err));
                    resolve(true);
                });

            } catch (e) {
                db.rollback(() => reject(e));
            }
        });
    });
};
// export const insertPolicyExcelData_old = async (policies) => {
//     return new Promise((resolve, reject) => {
//         if (!policies.length) return resolve(false);

//         const values = policies.map(p => [
//             p.policy_id,
//             p.case_id,
//             p.year,
//             p.age,
//             p.guaranteed_premium,
//             p.deposit,
//             p.cash_premiums,
//             p.dividend,
//             p.cash_increase,
//             p.total_cash,
//             p.total_death
//         ]);

//         const query = `
//             INSERT INTO client_people_policy_details (
//                 policy_id, case_id, year, age,
//                 guaranteed_premium, deposit, cash_premiums,
//                 dividend, cash_increase, total_cash, total_death
//             ) VALUES ?
//             ON DUPLICATE KEY UPDATE
//                 age = VALUES(age),
//                 guaranteed_premium = VALUES(guaranteed_premium),
//                 deposit = VALUES(deposit),
//                 cash_premiums = VALUES(cash_premiums),
//                 dividend = VALUES(dividend),
//                 cash_increase = VALUES(cash_increase),
//                 total_cash = VALUES(total_cash),
//                 total_death = VALUES(total_death)
//         `;

//         db.query(query, [values], (err, result) => {
//             if (err) return reject(err);
//             resolve(true);
//         });
//     });
// };

export const insertPolicyExcelData = async (policies) => {
    return new Promise((resolve, reject) => {
        if (!policies.length) return resolve(false);

        const values = policies.map(p => [
            p.policy_id,
            p.case_id,
            p.year,
            p.age,
            p.guaranteed_premium,
            p.guaranteed_cash_value,
            p.guaranteed_death_benefit,
            p.cash_premiums,
            p.cash_premiums_current_1,
            p.cash_premiums_current_2,
            p.premiums_paid_by_dividends,
            p.premiums_paid_by_dividends_current_1,
            p.premiums_paid_by_dividends_current_2,
            p.dividend,
            p.annual_dividend_current_1,
            p.annual_dividend_current_2,
            p.cash_increase,
            p.total_cash_value_current_1,
            p.total_cash_value_current_2,
            p.total_death,
            p.total_death_benefit_current_1,
            p.total_death_benefit_current_2,
            p.capital_dividend_account_credit,
            p.capital_dividend_account_credit_current_1,
            p.capital_dividend_account_credit_current_2,
            p.deposit,
            p.death_benefit_paid_up_additions,
            p.cash_value_paid_up_additions,
            p.reduced_paid_up_death_benefit,
            p.acb_adjusted_cost_basis,
            p.acb_adjusted_cost_basis_current_1,
            p.acb_adjusted_cost_basis_current_2,
            p.ncpi_net_cost_pure_insurance,
            p.ncpi_net_cost_pure_insurance_current_1,
            p.ncpi_net_cost_pure_insurance_current_2,
            p.taxable_portion_of_dividends,
            p.taxable_gain_on_surrender,
            p.irr_cash_value,
            p.irr_cash_value_current_1,
            p.irr_cash_value_current_2,
            p.irr_death_benefit,
            p.irr_death_benefit_current_1,
            p.irr_death_benefit_current_2,
            p.compassionate_advance,
            p.bereavement_counselling_benefit,
            p.snap_advance,
            p.living_benefit
        ]);

        const query = `
        INSERT INTO client_people_policy_details (
            policy_id, case_id, year, age,
            guaranteed_premium, guaranteed_cash_value, guaranteed_death_benefit,
            cash_premiums, cash_premiums_current_1, cash_premiums_current_2,
            premiums_paid_by_dividends, premiums_paid_by_dividends_current_1, premiums_paid_by_dividends_current_2,
            dividend, annual_dividend_current_1, annual_dividend_current_2,
            cash_increase, total_cash_value_current_1, total_cash_value_current_2,
            total_death, total_death_benefit_current_1, total_death_benefit_current_2,
            capital_dividend_account_credit, capital_dividend_account_credit_current_1, capital_dividend_account_credit_current_2,
            deposit,
            death_benefit_paid_up_additions, cash_value_paid_up_additions,
            reduced_paid_up_death_benefit,
            acb_adjusted_cost_basis, acb_adjusted_cost_basis_current_1, acb_adjusted_cost_basis_current_2,
            ncpi_net_cost_pure_insurance, ncpi_net_cost_pure_insurance_current_1, ncpi_net_cost_pure_insurance_current_2,
            taxable_portion_of_dividends, taxable_gain_on_surrender,
            irr_cash_value, irr_cash_value_current_1, irr_cash_value_current_2,
            irr_death_benefit, irr_death_benefit_current_1, irr_death_benefit_current_2,
            compassionate_advance, bereavement_counselling_benefit, snap_advance, living_benefit
            ) VALUES ?
            ON DUPLICATE KEY UPDATE
            age = VALUES(age),
            guaranteed_premium = VALUES(guaranteed_premium),
            guaranteed_cash_value = VALUES(guaranteed_cash_value),
            guaranteed_death_benefit = VALUES(guaranteed_death_benefit),
            cash_premiums = VALUES(cash_premiums),
            cash_premiums_current_1 = VALUES(cash_premiums_current_1),
            cash_premiums_current_2 = VALUES(cash_premiums_current_2),
            premiums_paid_by_dividends = VALUES(premiums_paid_by_dividends),
            premiums_paid_by_dividends_current_1 = VALUES(premiums_paid_by_dividends_current_1),
            premiums_paid_by_dividends_current_2 = VALUES(premiums_paid_by_dividends_current_2),
            dividend = VALUES(dividend),
            annual_dividend_current_1 = VALUES(annual_dividend_current_1),
            annual_dividend_current_2 = VALUES(annual_dividend_current_2),
            cash_increase = VALUES(cash_increase),
            total_cash_value_current_1 = VALUES(total_cash_value_current_1),
            total_cash_value_current_2 = VALUES(total_cash_value_current_2),
            total_death = VALUES(total_death),
            total_death_benefit_current_1 = VALUES(total_death_benefit_current_1),
            total_death_benefit_current_2 = VALUES(total_death_benefit_current_2),
            capital_dividend_account_credit = VALUES(capital_dividend_account_credit),
            capital_dividend_account_credit_current_1 = VALUES(capital_dividend_account_credit_current_1),
            capital_dividend_account_credit_current_2 = VALUES(capital_dividend_account_credit_current_2),
            deposit = VALUES(deposit),
            death_benefit_paid_up_additions = VALUES(death_benefit_paid_up_additions),
            cash_value_paid_up_additions = VALUES(cash_value_paid_up_additions),
            reduced_paid_up_death_benefit = VALUES(reduced_paid_up_death_benefit),
            acb_adjusted_cost_basis = VALUES(acb_adjusted_cost_basis),
            acb_adjusted_cost_basis_current_1 = VALUES(acb_adjusted_cost_basis_current_1),
            acb_adjusted_cost_basis_current_2 = VALUES(acb_adjusted_cost_basis_current_2),
            ncpi_net_cost_pure_insurance = VALUES(ncpi_net_cost_pure_insurance),
            ncpi_net_cost_pure_insurance_current_1 = VALUES(ncpi_net_cost_pure_insurance_current_1),
            ncpi_net_cost_pure_insurance_current_2 = VALUES(ncpi_net_cost_pure_insurance_current_2),
            taxable_portion_of_dividends = VALUES(taxable_portion_of_dividends),
            taxable_gain_on_surrender = VALUES(taxable_gain_on_surrender),
            irr_cash_value = VALUES(irr_cash_value),
            irr_cash_value_current_1 = VALUES(irr_cash_value_current_1),
            irr_cash_value_current_2 = VALUES(irr_cash_value_current_2),
            irr_death_benefit = VALUES(irr_death_benefit),
            irr_death_benefit_current_1 = VALUES(irr_death_benefit_current_1),
            irr_death_benefit_current_2 = VALUES(irr_death_benefit_current_2),
            compassionate_advance = VALUES(compassionate_advance),
            bereavement_counselling_benefit = VALUES(bereavement_counselling_benefit),
            snap_advance = VALUES(snap_advance),
            living_benefit = VALUES(living_benefit)
        `;

        db.query(query, [values], (err, result) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const updateClientPeoplePolicies = async (policy_id, file_name) => {
    const query = `
        UPDATE client_people_policies
        SET policy_file_name = ?
        WHERE id = ?
    `;
    return queryAsync(query, [file_name, policy_id]);
};

export const getCombinedPolicy = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                PPD.year,
                PPD.age,
                SUM(PPD.guaranteed_premium) AS total_guaranteed_premium,
                SUM(PPD.deposit) AS total_deposit,
                SUM(PPD.cash_premiums) AS total_cash_premiums,
                SUM(PPD.dividend) AS total_dividend,
                SUM(PPD.cash_increase) AS total_cash_increase,
                SUM(PPD.total_cash) AS total_cash,
                SUM(PPD.total_death) AS total_death
            FROM client_people_policy_details PPD
            WHERE PPD.case_id = ?
            GROUP BY PPD.year, PPD.age
            ORDER BY PPD.year ASC
        `;

        db.query(query, [caseId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getPolicyWiseDetail = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
            CPP.id AS policy_id,
            CPP.client_people_id,
            CP.first_name,
            CP.last_name,
            CPP.insurance_carrier,
            CPP.minimum_recommended_life_coverage,
            CPP.policy_interest_rate,
            CPP.policy_start_date,
            CPP.actual_policy_start_date,
            CPP.policy_file_name,
            CPPD.year,
            CPPD.age,
            CPPD.guaranteed_premium,
            CPPD.deposit,
            CPPD.cash_premiums,
            CPPD.dividend,
            CPPD.cash_increase,
            CPPD.total_cash,
            CPPD.total_death
        FROM client_people_policies CPP
        LEFT JOIN client_peoples CP ON CPP.client_people_id = CP.id
        LEFT JOIN client_people_policy_details CPPD ON CPP.id = CPPD.policy_id
        WHERE CPP.case_id = ?
        ORDER BY CPP.id DESC, CPPD.year ASC
        `;

        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);

            const grouped = {};

            for (const row of rows) {
                const key = row.policy_id;
                if (!grouped[key]) {
                    grouped[key] = {
                        policy_id: row.policy_id,
                        client_people_id: row.client_people_id,
                        first_name: row.first_name,
                        last_name: row.last_name,
                        insurance_carrier: row.insurance_carrier,
                        minimum_recommended_life_coverage: row.minimum_recommended_life_coverage,
                        policy_interest_rate: row.policy_interest_rate,
                        policy_start_date: row.policy_start_date,
                        actual_policy_start_date: row.actual_policy_start_date,
                        policy_file_name: row.policy_file_name,
                        policy_details: []
                    };
                }

                // Add detail row if present
                if (row.year !== null && row.age !== null) {
                    grouped[key].policy_details.push({
                        year: row.year,
                        age: row.age,
                        guaranteed_premium: row.guaranteed_premium,
                        deposit: row.deposit,
                        cash_premiums: row.cash_premiums,
                        dividend: row.dividend,
                        cash_increase: row.cash_increase,
                        total_cash: row.total_cash,
                        total_death: row.total_death
                    });
                }
            }

            resolve(Object.values(grouped));
        });
    });
};

export const getFinalReportDetail = (caseId) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT 
            CPP.id AS policy_id,
            CPP.client_people_id,
            CP.first_name,
            CP.last_name,
            CPP.insurance_carrier,
            CPP.minimum_recommended_life_coverage,
            CPP.policy_interest_rate,
            CPP.policy_start_date,
            CPP.actual_policy_start_date,
            CPP.policy_file_name,
            CPPD.year,
            CPPD.age,
            CPPD.guaranteed_premium,
            CPPD.deposit,
            CPPD.cash_premiums,
            CPPD.dividend,
            CPPD.cash_increase,
            CPPD.total_cash,
            CPPD.total_death
        FROM client_people_policies CPP
        LEFT JOIN client_peoples CP ON CPP.client_people_id = CP.id
        LEFT JOIN client_people_policy_details CPPD ON CPP.id = CPPD.policy_id
        WHERE CPP.case_id = ?
        ORDER BY CPP.id DESC, CPPD.year ASC
        `;

        db.query(query, [caseId], (err, rows) => {
            if (err) return reject(err);

            const grouped = {};

            for (const row of rows) {
                const key = row.policy_id;
                if (!grouped[key]) {
                    grouped[key] = {
                        policy_id: row.policy_id,
                        client_people_id: row.client_people_id,
                        first_name: row.first_name,
                        last_name: row.last_name,
                        insurance_carrier: row.insurance_carrier,
                        minimum_recommended_life_coverage: row.minimum_recommended_life_coverage,
                        policy_interest_rate: row.policy_interest_rate,
                        policy_start_date: row.policy_start_date,
                        actual_policy_start_date: row.actual_policy_start_date,
                        policy_file_name: row.policy_file_name,
                        policy_details: []
                    };
                }

                // Add detail row if present
                if (row.year !== null && row.age !== null) {
                    grouped[key].policy_details.push({
                        year: row.year,
                        age: row.age,
                        guaranteed_premium: row.guaranteed_premium,
                        deposit: row.deposit,
                        cash_premiums: row.cash_premiums,
                        dividend: row.dividend,
                        cash_increase: row.cash_increase,
                        total_cash: row.total_cash,
                        total_death: row.total_death
                    });
                }
            }

            resolve(Object.values(grouped));
        });
    });
};

const tablesToCopy = [
    'client_peoples',
    'client_properties',
    'client_credits',
    'client_loans',
    'client_investments',
    'client_expenses',
    'client_expense_statuses',
    'client_totals',
    'client_reductions',
    'client_final_totals'
];

export const copyCase = (caseId, agentId) => {
    return new Promise((resolve, reject) => {
        db.beginTransaction(err => {
            if (err) return reject(err);

            // Check if a copy already exists
            db.query(
                `SELECT id FROM client_cases WHERE copied_from_case_id = ? AND is_copy = 1`,
                [caseId],
                (err, copyRows) => {
                    if (err) return db.rollback(() => reject(err));

                    const hadOldCopy = copyRows.length > 0;

                    const removeOldCopy = (callback) => {
                        if (!hadOldCopy) return callback();

                        const copyCaseId = copyRows[0].id;

                        db.query(`DELETE FROM client_cases WHERE id = ?`, [copyCaseId], (err) => {
                            if (err) return db.rollback(() => reject(err));
                            callback();
                        });
                    };

                    removeOldCopy(() => {
                        db.query(`SELECT * FROM client_cases WHERE id = ?`, [caseId], (err, caseRows) => {
                            if (err) return db.rollback(() => reject(err));
                            if (!caseRows.length) return db.rollback(() => reject(new Error('Original case not found')));

                            const originalCase = caseRows[0];

                            // Insert new copy
                            const insertQuery = `INSERT INTO client_cases (copied_from_case_id, client_id, case_type_id, case_name, full_name, completed_step, created_by,  status, plan_start_date, created_at, updated_at, is_copy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)`;

                            const insertValues = [
                                caseId,
                                originalCase.client_id,
                                originalCase.case_type_id,
                                originalCase.case_name + ' (Copy)',
                                originalCase.full_name,
                                originalCase.completed_step,
                                agentId,
                                originalCase.status,
                                originalCase.plan_start_date
                            ];

                            db.query(insertQuery, insertValues, (err, insertResult) => {
                                if (err) return db.rollback(() => reject(err));
                                const newCaseId = insertResult.insertId;

                                // Update has_copy on original case
                                db.query(`UPDATE client_cases SET has_copy = 1 WHERE id = ?`, [caseId], (err) => {
                                    if (err) return db.rollback(() => reject(err));

                                    // Copy child tables
                                    let tableIndex = 0;

                                    const copyNextTable = () => {
                                        if (tableIndex >= tablesToCopy.length) {
                                            return db.commit(err => {
                                                if (err) return db.rollback(() => reject(err));
                                                resolve({
                                                    newCaseId,
                                                    action: hadOldCopy ? 'copy_recreated' : 'copy_created'
                                                });
                                            });
                                        }

                                        const table = tablesToCopy[tableIndex];
                                        db.query(`SELECT * FROM ${table} WHERE case_id = ?`, [caseId], (err, rows) => {
                                            if (err) return db.rollback(() => reject(err));

                                            let rowIndex = 0;
                                            const copyNextRow = () => {
                                                if (rowIndex >= rows.length) {
                                                    tableIndex++;
                                                    return copyNextTable();
                                                }

                                                const row = rows[rowIndex];
                                                delete row.id;
                                                row.case_id = newCaseId;

                                                const columns = Object.keys(row);
                                                const values = Object.values(row);

                                                db.query(
                                                    `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
                                                    values,
                                                    (err) => {
                                                        if (err) return db.rollback(() => reject(err));
                                                        rowIndex++;
                                                        copyNextRow();
                                                    }
                                                );
                                            };
                                            copyNextRow();
                                        });
                                    };

                                    copyNextTable();
                                });
                            });
                        });
                    });
                }
            );
        });
    });
};