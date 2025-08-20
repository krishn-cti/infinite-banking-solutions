import MSG from "../utils/message.js";
import fs from "fs";
import xlsx from 'xlsx';
import dayjs from "dayjs";
import csv from "csv-parser";
import { upsertClientCase, getCaseTypes, getClientPeopleByCaseId, getAllCasesByClientId, updateCompletedSteps, removeClientCredits, insertClientCredits, getClientCreditByCaseId, removeClientLoans, insertClientLoans, getClientLoanByCaseId, getClientInvestmentByCaseId, removeClientInvestments, insertClientInvestments, removeClientExpenses, insertClientExpenses, getClientExpenseByCaseId, getClientTotalByCaseId, removeClientProperties, insertClientProperties, getClientPropertyByCaseId, insertClientTotals, updateClientTotals, getClientPeoplePolicyByCaseId, getClientReductionByCaseId, removeClientReductions, insertClientReductions, updateClientFinalTotals, getClientFinalTotalByCaseId, insertClientFinalTotals, getCasesByCaseId, createCaseWithAllData, getAgentClientIds, getCasesOfAgent, updateClientPeopleById, insertClientPeople, deleteClientPeopleById, insertPolicyExcelData, getCombinedPolicy, updateClientPeoplePolicies, upsertClientPeoplePolicies, getPolicyWiseDetail, upsertClientPeoplePolicy, updateInvestmentCheckedStatus, updateOrInsertExpenseStatus, getAllCases, deleteClientCaseByCaseId, getFinalReportDetail, copyCase, updateCaseByCaseId, deleteClientCaseAndCopies } from '../models/caseModel.js';
import { getUserById } from "../models/userModel.js";

function convertDate(csvDate) {
    const [day, month, year] = csvDate.split('-');
    return `${year}-${month}-${day}`; // YYYY-MM-DD
}

// function for heloc annual calculation
function calculateYearlyHelocPrincipal(property, year = new Date().getFullYear()) {
    const startDate = new Date(property.loan_start_date);
    const tenureMonths = Number(property.loan_tenure);
    const annualRate = parseFloat(property.interest_rate); // annual %
    let balance = parseFloat(property.heloc_amount); // principal

    if (!balance || !annualRate || !tenureMonths || isNaN(startDate.getTime())) return 0;

    const monthlyRate = annualRate / 12 / 100;

    // Calculate monthly payment using amortization formula
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    const monthlyPayment = (balance * monthlyRate * factor) / (factor - 1);

    let currentDate = new Date(startDate);
    let totalPrincipal = 0;

    for (let i = 1; i <= tenureMonths; i++) {
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance -= principal;

        // Sum principal only if current month is in the target year
        if (currentDate.getFullYear() === year) {
            totalPrincipal += principal;
        }

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return parseFloat(totalPrincipal.toFixed(2));
}

// get the full amortizations
// function generateAmortizations() {
//     const schedule = [];

//     const startDate = new Date("2016-01-01");
//     const tenureMonths = Number("300");
//     const annualRate = parseFloat("5");
//     let balance = parseFloat("600000");

//     if (!balance || !annualRate || !tenureMonths || isNaN(startDate.getTime())) return [];

//     const monthlyRate = annualRate / 12 / 100;

//     // Monthly payment using amortization formula
//     const factor = Math.pow(1 + monthlyRate, tenureMonths);
//     const monthlyPayment = (balance * monthlyRate * factor) / (factor - 1);

//     let currentDate = new Date(startDate);

//     for (let i = 1; i <= tenureMonths; i++) {
//         const interest = balance * monthlyRate;
//         const principal = monthlyPayment - interest;
//         balance = balance - principal;

//         schedule.push({
//             month: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
//             year: currentDate.getFullYear(),
//             payment: parseFloat(monthlyPayment.toFixed(2)),
//             principal: parseFloat(principal.toFixed(2)),
//             interest: parseFloat(interest.toFixed(2)),
//             balance: parseFloat(balance > 0 ? balance.toFixed(2) : '0.00')
//         });

//         currentDate.setMonth(currentDate.getMonth() + 1);
//     }

//     // Get current year principal total
//     const currentYear = new Date().getFullYear();
//     const currentYearPrincipalTotal = schedule
//         .filter(row => row.year === currentYear)
//         .reduce((sum, row) => sum + row.principal, 0);

//     return {
//         schedule,
//         currentYearPrincipalTotal: parseFloat(currentYearPrincipalTotal.toFixed(2))
//     };
// }

// Get All Case Types
export const getAllCaseTypes = async (req, res) => {
    try {
        const caseTypes = await getCaseTypes();

        if (!caseTypes || caseTypes.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_TYPE_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: caseTypes,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for create case
export const createClientCase = async (req, res) => {
    const {
        client_case_id,
        client_id,
        case_type_id,
        case_name,
        full_name,
        completed_step,
        agent_id
    } = req.body;

    const clientInfo = await getUserById(client_id);

    try {
        const caseData = {
            client_id,
            case_type_id,
            case_name,
            full_name: full_name ?? clientInfo.name,
            completed_step,
            created_by: agent_id ?? null
        };

        const response = await upsertClientCase(client_case_id, caseData);

        if (response.affectedRows > 0) {
            const caseId = client_case_id || response.insertId;

            const totalData = {
                case_id: caseId,
                total_income: 0.0,
                total_investment: 0.0,
                total_expense: 0.0,
                preliminary_surplus: 0.0,
            };

            if (!client_case_id) {
                await insertClientTotals(totalData);
            } else {
                await updateClientTotals(caseId, totalData);
            }

            return res.status(201).json({
                client_case_id: caseId,
                success: true,
                message: client_case_id ? MSG.CASE_UPDATED : MSG.CASE_CREATED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: client_case_id ? MSG.CASE_UPDATE_FAILED : MSG.CASE_CREATION_FAILED
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

// API for get client cases
export const getClientCases = async (req, res) => {
    const { client_id, search = '', status = '' } = req.body;
    // const client_id = req.user.id;
    try {
        const cases = await getAllCasesByClientId(client_id, search, status);

        if (!cases || cases.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: cases,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for get client case detail
export const getClientCaseDetail = async (req, res) => {
    const { case_id } = req.body;
    try {
        const cases = await getCasesByCaseId(case_id);

        if (!cases || cases.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: cases,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for create client people
// export const createClientPeople = async (req, res) => {
//     const { case_id, completed_step, peoples } = req.body;

//     if (!case_id || !Array.isArray(peoples)) {
//         return res.status(400).json({
//             success: false,
//             message: "Invalid request",
//         });
//     }

//     try {
//         for (const person of peoples) {
//             const {
//                 id,
//                 first_name, last_name, email, phone_number,
//                 date_of_birth, monthly_net_income, monthly_bonuses_dividends,
//                 monthly_other_incomes, total_amount, increase_percent,
//                 projected_amount, people_type, notes
//             } = person;

//             const data = {
//                 case_id,
//                 first_name: first_name || null,
//                 last_name: last_name || null,
//                 email: email || null,
//                 phone_number: phone_number || null,
//                 date_of_birth: date_of_birth || null,
//                 monthly_net_income: monthly_net_income || 0.0,
//                 monthly_bonuses_dividends: monthly_bonuses_dividends || 0.0,
//                 monthly_other_incomes: monthly_other_incomes || 0.0,
//                 total_amount: total_amount || 0.0,
//                 increase_percent: increase_percent || 0.0,
//                 projected_amount: projected_amount || 0.0,
//                 people_type: people_type || null,
//                 notes: notes || null
//             };

//             if (id) {
//                 await updateClientPeopleById(id, data);
//             } else {
//                 await insertClientPeople(data);
//             }
//         }

//         const peopleAdded = await updateCompletedSteps(case_id, completed_step);

//         if (peopleAdded && peopleAdded.affectedRows > 0) {
//             return res.status(201).json({
//                 client_case_id: case_id,
//                 success: true,
//                 message: MSG.PEOPLE_ADDED,
//             });
//         } else {
//             return res.status(500).json({
//                 success: false,
//                 message: MSG.PEOPLE_ADDITION_FAILED,
//             });
//         }

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: MSG.INTERNAL_SERVER_ERROR,
//             error: error.message,
//         });
//     }
// };

export const createClientPeople = async (req, res) => {
    const { case_id, completed_step, peoples } = req.body;

    if (!case_id || !Array.isArray(peoples)) {
        return res.status(400).json({
            success: false,
            message: "Invalid request",
        });
    }

    try {
        for (const person of peoples) {
            const {
                id,
                first_name, last_name, email, phone_number,
                date_of_birth, monthly_net_income, monthly_bonuses_dividends,
                monthly_other_incomes, total_amount, increase_percent,
                projected_amount, people_type, notes
            } = person;

            const data = {
                case_id,
                first_name: first_name || null,
                last_name: last_name || null,
                email: email || null,
                phone_number: phone_number || null,
                date_of_birth: date_of_birth || null,
                monthly_net_income: monthly_net_income || 0.0,
                monthly_bonuses_dividends: monthly_bonuses_dividends || 0.0,
                monthly_other_incomes: monthly_other_incomes || 0.0,
                total_amount: total_amount || 0.0,
                increase_percent: increase_percent || 0.0,
                projected_amount: projected_amount || 0.0,
                people_type: people_type || null,
                notes: notes || null
            };

            let personId = id;

            if (personId) {
                await updateClientPeopleById(personId, data);
            } else {
                personId = await insertClientPeople(data);
            }

            // Only proceed with policy if person is an adult
            if (String(people_type).toLowerCase() === 'adult') {
                await upsertClientPeoplePolicy({ case_id, client_people_id: personId });
            }
        }

        const peopleAdded = await updateCompletedSteps(case_id, completed_step);

        if (peopleAdded && peopleAdded.affectedRows > 0) {
            return res.status(201).json({
                client_case_id: case_id,
                success: true,
                message: MSG.PEOPLE_ADDED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.PEOPLE_ADDITION_FAILED,
            });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

export const removeClientPeople = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Client people ID is required"
        });
    }

    try {
        const result = await deleteClientPeopleById(id);

        if (result && result.affectedRows > 0) {
            return res.status(200).json({
                success: true,
                message: MSG.PEOPLE_DELETED
            });
        } else {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_PEOPLE_NOT_FOUND
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

// export const removeClientCase = async (req, res) => {
//     const { case_id } = req.body;

//     if (!case_id) {
//         return res.status(400).json({
//             success: false,
//             message: "Client case_id is required"
//         });
//     }

//     try {
//         const cases = await getCasesByCaseId(case_id);
        
//         const result = await deleteClientCaseByCaseId(case_id);

//         if (result && result.affectedRows > 0) {
//             return res.status(200).json({
//                 success: true,
//                 message: MSG.CASE_DELETED
//             });
//         } else {
//             return res.status(404).json({
//                 success: false,
//                 message: MSG.CASE_NOT_FOUND
//             });
//         }
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             success: false,
//             message: MSG.INTERNAL_SERVER_ERROR,
//             error: error.message
//         });
//     }
// };

export const removeClientCase = async (req, res) => {
    const { case_id } = req.body;

    if (!case_id) {
        return res.status(400).json({
            success: false,
            message: "Client case_id is required"
        });
    }

    try {
        const caseData = await getCasesByCaseId(case_id);

        if (!caseData) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_NOT_FOUND
            });
        }

        let result;

        if (caseData.is_copy === 0) {
            // Case is an ORIGINAL
            // Delete original + all copies
            result = await deleteClientCaseAndCopies(case_id);

        } else if (caseData.is_copy === 1) {
            // Case is a COPY
            // Update original to has_copy = 0
            if (caseData.copied_from_case_id) {
                await updateCaseByCaseId(caseData.copied_from_case_id, { has_copy: 0 });
            }

            // Delete only this copy
            result = await deleteClientCaseByCaseId(case_id);
        }

        if (result && result.affectedRows > 0) {
            return res.status(200).json({
                success: true,
                message: MSG.CASE_DELETED
            });
        } else {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_NOT_FOUND
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message
        });
    }
};

// API for get client peoples
export const getClientPeoples = async (req, res) => {
    const { case_id } = req.body;
    try {
        let casePeoples = await getClientPeopleByCaseId(case_id);

        if (!casePeoples || casePeoples.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_PEOPLE_NOT_FOUND
            });
        }

        casePeoples = casePeoples.map(people => {
            if (people.date_of_birth) {
                people.date_of_birth = dayjs(people.date_of_birth).format('YYYY-MM-DD');
            }
            return people;
        });

        return res.status(200).json({
            success: true,
            data: casePeoples,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for create client property
export const createClientProperty = async (req, res) => {
    const { case_id, completed_step, properties } = req.body;

    try {
        // Remove existing properties
        await removeClientProperties(case_id);

        if (Array.isArray(properties) && properties.length > 0) {
            await insertClientProperties(case_id, properties);
        }

        const propertyAdded = await updateCompletedSteps(case_id, completed_step);

        if (propertyAdded && propertyAdded.affectedRows > 0) {
            return res.status(201).json({
                client_case_id: case_id,
                success: true,
                message: MSG.PROPERTY_ADDED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.PROPERTY_ADDITION_FAILED,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for get client properties
export const getClientProperties = async (req, res) => {
    const { case_id } = req.body;
    try {
        let caseProperties = await getClientPropertyByCaseId(case_id);

        if (!caseProperties || caseProperties.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_PROPERTY_NOT_FOUND
            });
        }

        caseProperties = caseProperties.map(property => {
            if (property.loan_start_date) {
                property.loan_start_date = dayjs(property.loan_start_date).format('YYYY-MM-DD');
            }
            return property;
        });

        return res.status(200).json({
            success: true,
            data: caseProperties,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for create client credit
export const createClientCredit = async (req, res) => {
    const { case_id, completed_step, credits } = req.body;

    try {
        // Remove existing credits
        await removeClientCredits(case_id);

        if (Array.isArray(credits) && credits.length > 0) {
            await insertClientCredits(case_id, credits);
        }

        const creditAdded = await updateCompletedSteps(case_id, completed_step);

        if (creditAdded && creditAdded.affectedRows > 0) {
            return res.status(201).json({
                client_case_id: case_id,
                success: true,
                message: MSG.CREDIT_ADDED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.CREDIT_ADDITION_FAILED,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for get client credits
export const getClientCredits = async (req, res) => {
    const { case_id } = req.body;
    try {
        const caseCredit = await getClientCreditByCaseId(case_id);

        if (!caseCredit || caseCredit.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_CREDIT_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: caseCredit,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for create client loan
export const createClientLoan = async (req, res) => {
    const { case_id, completed_step, loans } = req.body;

    try {
        // Remove existing loans
        await removeClientLoans(case_id);

        if (Array.isArray(loans) && loans.length > 0) {
            await insertClientLoans(case_id, loans);
        }

        const loanAdded = await updateCompletedSteps(case_id, completed_step);

        if (loanAdded && loanAdded.affectedRows > 0) {
            return res.status(201).json({
                client_case_id: case_id,
                success: true,
                message: MSG.LOAN_ADDED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.LOAN_ADDITION_FAILED,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for get client loans
export const getClientLoans = async (req, res) => {
    const { case_id } = req.body;
    try {
        let caseLoans = await getClientLoanByCaseId(case_id);

        if (!caseLoans || caseLoans.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_LOAN_NOT_FOUND
            });
        }

        // Format start_date
        caseLoans = caseLoans.map(loan => {
            if (loan.start_date) {
                loan.start_date = dayjs(loan.start_date).format('YYYY-MM-DD');
            }
            return loan;
        });

        return res.status(200).json({
            success: true,
            data: caseLoans,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for create client investment
export const createClientInvestment = async (req, res) => {
    const { case_id, completed_step, investments } = req.body;

    try {
        // Remove existing investments
        await removeClientInvestments(case_id);

        if (Array.isArray(investments) && investments.length > 0) {
            await insertClientInvestments(case_id, investments);
        }

        const investmentAdded = await updateCompletedSteps(case_id, completed_step);

        if (investmentAdded && investmentAdded.affectedRows > 0) {
            return res.status(201).json({
                client_case_id: case_id,
                success: true,
                message: MSG.INVESTMENT_ADDED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.INVESTMENT_ADDITION_FAILED,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for get client investment
export const getClientInvestments = async (req, res) => {
    const { case_id } = req.body;
    try {
        const caseInvestments = await getClientInvestmentByCaseId(case_id);

        if (!caseInvestments || caseInvestments.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_INVESTMENT_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: caseInvestments,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for create client expense
export const createClientExpense = async (req, res) => {
    const { case_id, completed_step, expenses } = req.body;

    try {
        // Remove existing expenses
        await removeClientExpenses(case_id);

        if (Array.isArray(expenses) && expenses.length > 0) {
            await insertClientExpenses(case_id, expenses);
        }

        const expenseAdded = await updateCompletedSteps(case_id, completed_step);

        if (expenseAdded && expenseAdded.affectedRows > 0) {
            return res.status(201).json({
                client_case_id: case_id,
                success: true,
                message: MSG.EXPENSE_ADDED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.EXPENSE_ADDITION_FAILED,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for get client expense
export const getClientExpenses = async (req, res) => {
    const { case_id } = req.body;
    try {
        const caseExpenses = await getClientExpenseByCaseId(case_id);

        if (!caseExpenses || caseExpenses.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_EXPENSE_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: caseExpenses,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for create client total
export const createClientTotal = async (req, res) => {
    const { case_id, completed_step } = req.body;

    try {
        const totalAdded = await updateCompletedSteps(case_id, completed_step);

        if (totalAdded && totalAdded.affectedRows > 0) {
            return res.status(201).json({
                client_case_id: case_id,
                success: true,
                message: MSG.TOTAL_ADDED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.TOTAL_ADDED_FAILED,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for get client totals
export const getClientTotals = async (req, res) => {
    const { case_id } = req.body;
    try {
        // this data used for total income
        const casePeoples = await getClientPeopleByCaseId(case_id);
        let totalIncome = 0;

        for (const person of casePeoples) {
            const totalAmount = parseFloat(person.total_amount || 0.0);

            totalIncome += totalAmount;
        }

        // this data used for total investment
        const caseInvestments = await getClientInvestmentByCaseId(case_id);
        let totalInvestment = 0;

        for (const invest of caseInvestments) {
            const investment = parseFloat(invest.monthly_allotment || 0.0);

            totalInvestment += investment;
        }

        // this data used for total expenses
        const caseExpenses = await getClientExpenseByCaseId(case_id);
        let totalExpense = 0;

        for (const total of caseExpenses) {
            const food = parseFloat(total.food || 0.0);
            const clothing_personal_items = parseFloat(total.clothing_personal_items || 0.0);
            const entertainment = parseFloat(total.entertainment || 0.0);
            const travel = parseFloat(total.travel || 0.0);
            const fees_and_education = parseFloat(total.fees_and_education || 0.0);
            const term_life_insurance = parseFloat(total.term_life_insurance || 0.0);
            const di_ci_insurance = parseFloat(total.di_ci_insurance || 0.0);
            const health_gym_fees = parseFloat(total.health_gym_fees || 0.0);
            const kids_activities_sports = parseFloat(total.kids_activities_sports || 0.0);
            const day_care = parseFloat(total.day_care || 0.0);
            const child_support = parseFloat(total.child_support || 0.0);
            const vehicle_insurance = parseFloat(total.vehicle_insurance || 0.0);
            const vehicle_gas = parseFloat(total.vehicle_gas || 0.0);
            const vehicle_maintenance = parseFloat(total.vehicle_maintenance || 0.0);
            const vehicle_leases = parseFloat(total.vehicle_leases || 0.0);
            const tax_installment = parseFloat(total.tax_installment || 0.0);
            const cell_phones_and_subscriptions = parseFloat(total.cell_phones_and_subscriptions || 0.0);
            const gifts = parseFloat(total.gifts || 0.0);
            const additional_expenses = parseFloat(total.additional_expenses || 0.0);
            const others = parseFloat(total.others || 0.0);

            totalExpense += food + clothing_personal_items + entertainment + travel + fees_and_education + term_life_insurance + di_ci_insurance + health_gym_fees + kids_activities_sports + day_care + child_support + vehicle_insurance + vehicle_gas + vehicle_maintenance + vehicle_leases + tax_installment + cell_phones_and_subscriptions + gifts + additional_expenses + others;
        }

        // this data used for property expenses
        const casePropertyExpenses = await getClientPropertyByCaseId(case_id);
        let propertyExpense = 0;
        for (const property of casePropertyExpenses) {
            const monthly_payment = parseFloat(property.monthly_payment || 0.0);
            const monthly_mortgage_insurance_expense = parseFloat(property.monthly_mortgage_insurance_expense || 0.0);
            const monthly_mortgage_extra_expense = parseFloat(property.monthly_mortgage_extra_expense || 0.0);
            const monthly_property_tax_expense = parseFloat(property.monthly_property_tax_expense || 0.0);
            const monthly_property_insurance_expense = parseFloat(property.monthly_property_insurance_expense || 0.0);
            const monthly_utility_expense = parseFloat(property.monthly_utility_expense || 0.0);
            const community_condo_fees_expense = parseFloat(property.community_condo_fees_expense || 0.0);
            const heloc_monthly_payment = parseFloat(property.heloc_monthly_payment || 0.0);

            propertyExpense += monthly_payment + monthly_mortgage_insurance_expense + monthly_mortgage_extra_expense + monthly_property_tax_expense + monthly_property_insurance_expense + monthly_utility_expense + community_condo_fees_expense + heloc_monthly_payment;
        }

        // this data used for credit expenses
        const caseCreditExpenses = await getClientCreditByCaseId(case_id);
        let creditExpense = 0;
        for (const credit of caseCreditExpenses) {
            const monthly_payment = parseFloat(credit.monthly_payment || 0.0);

            creditExpense += monthly_payment;
        }

        // this data used for loan expenses
        const caseLoanExpenses = await getClientLoanByCaseId(case_id);
        let loanExpense = 0;
        for (const loan of caseLoanExpenses) {
            const monthly_emi = parseFloat(loan.monthly_emi || 0.0);

            loanExpense += monthly_emi;
        }

        const grandTotalExpense = totalExpense + propertyExpense + creditExpense + loanExpense + totalInvestment;
        const preliminarySurplus = totalIncome - grandTotalExpense;

        const totalData = {
            total_income: totalIncome,
            total_investment: totalInvestment,
            preliminary_surplus: preliminarySurplus,
            total_expense: grandTotalExpense,
        };


        await updateClientTotals(case_id, totalData);

        const caseTotals = await getClientTotalByCaseId(case_id);

        if (!caseTotals || caseTotals.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_TOTAL_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: caseTotals,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for create client reduction
// export const createClientReduction = async (req, res) => {
//     const {
//         case_id,
//         completed_step,
//         monthly_total_investment_allotment,
//         monthly_investment_reduction,
//         monthly_total_expense,
//         monthly_expense_reduction,
//         selectedInvestmentIds = [],
//         selectedExpenseNames = [],
//     } = req.body;

//     try {
//         await removeClientReductions(case_id);

//         const reduction = {
//             case_id,
//             monthly_total_investment_allotment,
//             monthly_investment_reduction,
//             monthly_total_expense,
//             monthly_expense_reduction
//         };

//         const insertResult = await insertClientReductions(reduction);

//         if (!insertResult || insertResult.affectedRows === 0) {
//             return res.status(500).json({
//                 success: false,
//                 message: MSG.REDUCTION_ADDITION_FAILED,
//             });
//         }

//         // Update is_checked in client_investments
//         for (const item of selectedInvestmentIds) {
//             if (item.id !== undefined && item.is_checked !== undefined) {
//                 await updateInvestmentCheckedStatus(item.id, item.is_checked);
//             }
//         }

//         const reductionUpdated = await updateCompletedSteps(case_id, completed_step);

//         if (reductionUpdated && reductionUpdated.affectedRows > 0) {
//             return res.status(201).json({
//                 client_case_id: case_id,
//                 success: true,
//                 message: MSG.REDUCTION_ADDED,
//             });
//         } else {
//             return res.status(500).json({
//                 success: false,
//                 message: MSG.REDUCTION_ADDITION_FAILED,
//             });
//         }

//     } catch (error) {
//         console.error('createClientReduction Error:', error);
//         return res.status(500).json({
//             success: false,
//             message: MSG.INTERNAL_SERVER_ERROR,
//             error: error.message,
//         });
//     }
// };

export const createClientReduction = async (req, res) => {
    const {
        case_id,
        completed_step,
        monthly_total_investment_allotment,
        monthly_investment_reduction,
        monthly_total_expense,
        monthly_expense_reduction,
        selectedInvestmentIds = [],
        selectedExpenses = []
    } = req.body;

    try {
        await removeClientReductions(case_id);

        const reduction = {
            case_id,
            monthly_total_investment_allotment,
            monthly_investment_reduction,
            monthly_total_expense,
            monthly_expense_reduction
        };

        const insertResult = await insertClientReductions(reduction);

        if (!insertResult || insertResult.affectedRows === 0) {
            return res.status(500).json({
                success: false,
                message: MSG.REDUCTION_ADDITION_FAILED,
            });
        }

        // Update selected investments
        for (const item of selectedInvestmentIds) {
            if (item.id !== undefined && item.is_checked !== undefined) {
                await updateInvestmentCheckedStatus(item.id, item.is_checked);
            }
        }

        // Update or insert selected expenses
        for (const exp of selectedExpenses) {
            if (exp.expense_name && exp.is_checked !== undefined) {
                await updateOrInsertExpenseStatus(case_id, exp.expense_name, exp.is_checked);
            }
        }

        const reductionUpdated = await updateCompletedSteps(case_id, completed_step);

        if (reductionUpdated && reductionUpdated.affectedRows > 0) {
            return res.status(201).json({
                client_case_id: case_id,
                success: true,
                message: MSG.REDUCTION_ADDED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.REDUCTION_ADDITION_FAILED,
            });
        }

    } catch (error) {
        console.error("createClientReduction Error:", error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for get client reduction
export const getClientReductions = async (req, res) => {
    const { case_id } = req.body;
    try {
        const caseReductions = await getClientReductionByCaseId(case_id);

        if (!caseReductions || caseReductions.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_REDUCTION_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: caseReductions,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for create client total
export const createClientFinalTotal = async (req, res) => {
    const { case_id, completed_step } = req.body;

    try {
        const totalAdded = await updateCompletedSteps(case_id, completed_step);

        if (totalAdded && totalAdded.affectedRows > 0) {
            return res.status(201).json({
                client_case_id: case_id,
                success: true,
                message: MSG.FINAL_TOTAL_ADDED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.FINAL_TOTAL_ADDITION_FAILED,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for get client totals
export const getClientFinalTotals = async (req, res) => {
    const { case_id } = req.body;
    try {
        // get totals
        const caseTotals = await getClientTotalByCaseId(case_id);

        if (!caseTotals) {
            return res.status(404).json({ success: false, message: MSG.CASE_TOTAL_NOT_FOUND });
        }

        const {
            total_income = 0,
            total_expense = 0
        } = caseTotals;

        // get reductions
        const caseReductions = await getClientReductionByCaseId(case_id);

        const reduction = caseReductions?.reductions;
        if (!reduction) {
            return res.status(404).json({ success: false, message: MSG.CASE_REDUCTION_NOT_FOUND });
        }

        // Parse reduction values safely
        // const monthly_total_investment_allotment = parseFloat(reduction.monthly_total_investment_allotment) || 0;
        const monthly_investment_reduction = parseFloat(reduction.monthly_investment_reduction) || 0;
        // const monthly_total_expense = parseFloat(reduction.monthly_total_expense) || 0;
        const monthly_expense_reduction = parseFloat(reduction.monthly_expense_reduction) || 0;

        // get heloc room value
        const caseProperty = await getClientPropertyByCaseId(case_id);
        const currentYear = new Date().getFullYear();

        const totalHelocPaymentForYear = caseProperty.reduce((sum, property) => {
            return sum + calculateYearlyHelocPrincipal(property, currentYear);
        }, 0);

        // Calculate final values
        const totalIncome = total_income;
        const totalReduction = total_expense - monthly_investment_reduction - monthly_expense_reduction;
        const finalSurplus = totalIncome - totalReduction;
        const helocRoom = totalHelocPaymentForYear;
        const annualBudgetAvailable = (finalSurplus * 12) + helocRoom;

        const finalTotalData = {
            case_id,
            final_total_income: totalIncome,
            total_expense_reduction: totalReduction,
            final_monthly_surplus_budget: finalSurplus,
            annual_budget_available: annualBudgetAvailable,
            heloc_room: helocRoom,
        };

        // Insert or Update final totals
        const existing = await getClientFinalTotalByCaseId(case_id);

        if (existing && Object.keys(existing).length > 0) {
            await updateClientFinalTotals(case_id, finalTotalData);
        } else {
            await insertClientFinalTotals(finalTotalData);
        }

        // Return result
        const caseFinalTotals = await getClientFinalTotalByCaseId(case_id);

        return res.status(200).json({
            success: true,
            data: caseFinalTotals,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for create client policy
export const createClientPeoplePolicy = async (req, res) => {
    const { case_id, completed_step, policies } = req.body;

    try {
        if (Array.isArray(policies) && policies.length > 0) {
            await upsertClientPeoplePolicies(case_id, policies);
        }


        const policyAdded = await updateCompletedSteps(case_id, completed_step);

        if (policyAdded && policyAdded.affectedRows > 0) {
            return res.status(201).json({
                client_case_id: case_id,
                success: true,
                message: MSG.POLICY_ADDED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: MSG.POLICY_ADDITION_FAILED,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

// API for get client policy
export const getClientPeoplePolicies = async (req, res) => {
    const { case_id } = req.body;
    try {
        const casePolicies = await getClientPeoplePolicyByCaseId(case_id);

        if (!casePolicies || casePolicies.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_POLICY_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: casePolicies,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for get all cases of the agents
export const getClientCaseOfAgent = async (req, res) => {
    const { agent_id, search = '', status = '' } = req.body;
    try {
        const agentClientIds = await getAgentClientIds(agent_id);

        if (!agentClientIds || agentClientIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.NO_CLIENTS_FOUND_FOR_AGENT
            });
        }
        const cases = await getCasesOfAgent(agentClientIds, search, status);

        if (!cases || cases.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: cases,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for get all cases of the all clients
export const getAllClientCases = async (req, res) => {
    const { search = '', status = '' } = req.body;
    try {
        const cases = await getAllCases(search, status);

        if (!cases || cases.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.CASE_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: cases,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

// API for upload buld case using CSV
export const uploadBulkCaseByCsv = async (req, res) => {
    const file = req.file;
    const client_id = req.body.client_id;
    const case_type_id = req.body.case_type_id;
    const created_by = req.body.agent_id;

    if (!file) return res.status(400).json({ error: "CSV file is required" });
    if (!client_id || !case_type_id || !created_by) {
        return res.status(400).json({ error: "Missing required payload fields: client_id, case_type_id, or created_by" });
    }

    const filePath = file.path;
    const rows = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => rows.push(data))
        .on("end", async () => {
            try {
                const groupedCases = {};

                for (const row of rows) {
                    const type = (row.Type || row.type || "").toString().trim().toLowerCase().replace(/\s+/g, "_");
                    const key = `${row.case_name}_${client_id}`;

                    if (!groupedCases[key]) {
                        groupedCases[key] = {
                            case: null,
                            peoples: [],
                            credits: [],
                            loans: [],
                            properties: [],
                            investments: [],
                            expenses: null,
                        };
                    }

                    switch (type) {
                        case "client_case":
                            groupedCases[key].case = {
                                case_name: row.case_name,
                                full_name: row.full_name,
                                completed_step: row.completed_step,
                                client_id: client_id,
                                case_type_id: case_type_id,
                                created_by: created_by
                            };
                            break;

                        case "peoples":
                            groupedCases[key].peoples.push({
                                first_name: row.first_name,
                                last_name: row.last_name,
                                email: row.email,
                                phone_number: row.phone_number,
                                date_of_birth: convertDate(row.date_of_birth),
                                monthly_net_income: row.monthly_net_income,
                                monthly_bonuses_dividends: row.monthly_bonuses_dividends,
                                monthly_other_incomes: row.monthly_other_incomes,
                                total_amount: row.total_amount,
                                increase_percent: row.increase_percent,
                                projected_amount: row.projected_amount,
                                people_type: row.people_type,
                                notes: row.people_notes
                            });
                            break;

                        case "credits":
                            groupedCases[key].credits.push({
                                credit_type: row.credit_type,
                                other_credit: row.other_credit,
                                credit_limit: parseFloat(row.credit_limit),
                                balance: parseFloat(row.credit_balance),
                                interest_rate: parseFloat(row.credit_interest_rate),
                                terms: parseInt(row.credit_tenure),
                                monthly_payment: parseFloat(row.credit_monthly_payment),
                                total_payable_amount: parseFloat(row.total_payable_amount)
                            });
                            break;

                        case "loans":
                            groupedCases[key].loans.push({
                                loan_name: row.loan_name,
                                financed_amount: row.loan_financed_amount,
                                start_date: convertDate(row.loan_start_date),
                                terms: row.loan_terms,
                                interest_rate: row.loan_interest_rate,
                                current_balance: row.loan_current_balance,
                                monthly_emi: row.loan_monthly_emi
                            });
                            break;

                        case "properties":
                            groupedCases[key].properties.push({
                                property_name: row.property_name,
                                property_address: row.property_address,
                                current_value: row.current_property_value,
                                equity: row.equity,
                                financed_amount: row.financed_amount,
                                loan_start_date: convertDate(row.property_loan_start_date),
                                loan_tenure: row.property_loan_tenure,
                                interest_rate: row.property_interest_rate,
                                current_loan_balance: row.property_current_loan_balance,
                                monthly_payment: row.property_monthly_payment,
                                heloc_interest_rate: row.heloc_interest_rate,
                                heloc_percent: row.heloc_percent,
                                heloc_monthly_payment: row.heloc_monthly_payment,
                                heloc_amount: row.heloc_amount,
                                heloc_current_debt_balance: row.heloc_current_debt_balance,
                                heloc_room_abvailable: row.heloc_room_abvailable,
                                monthly_mortgage_insurance_expense: row.monthly_mortgage_insurance_expense,
                                monthly_mortgage_extra_expense: row.monthly_mortgage_extra_expense,
                                monthly_property_tax_expense: row.monthly_property_tax_expense,
                                monthly_property_insurance_expense: row.monthly_property_insurance_expense,
                                monthly_utility_expense: row.monthly_utility_expense,
                                community_condo_fees_expense: row.community_condo_fees_expense,
                                notes: row.property_notes
                            });
                            break;

                        case "investments":
                            groupedCases[key].investments.push({
                                investment_name: row.investment_name,
                                balance_amount: row.investment_balance_amount,
                                monthly_allotment: row.investment_monthly_allotment,
                                increase_percent: row.investment_increase_percent,
                                projected_amount: row.investment_projected_amount
                            });
                            break;

                        case "expenses":
                            groupedCases[key].expenses = {
                                food: row.food,
                                clothing_personal_items: row.clothing_personal_items,
                                entertainment: row.entertainment,
                                travel: row.travel,
                                fees_and_education: row.fees_and_education,
                                term_life_insurance: row.term_life_insurance,
                                di_ci_insurance: row.di_ci_insurance,
                                health_gym_fees: row.health_gym_fees,
                                kids_activities_sports: row.kids_activities_sports,
                                day_care: row.day_care,
                                child_support: row.child_support,
                                vehicle_insurance: row.vehicle_insurance,
                                vehicle_gas: row.vehicle_gas,
                                vehicle_maintenance: row.vehicle_maintenance,
                                vehicle_leases: row.vehicle_leases,
                                tax_installment: row.tax_installment,
                                cell_phones_and_subscriptions: row.cell_phones_and_subscriptions,
                                gifts: row.gifts,
                                additional_expenses: row.additional_expenses,
                                others: row.others,
                            };
                            break;

                        default:
                            console.warn(`Unknown or missing type in CSV: "${row.type}"`);
                            break;
                    }
                }

                for (const groupKey in groupedCases) {
                    const {
                        case: caseData,
                        peoples,
                        credits,
                        loans,
                        properties,
                        investments,
                        expenses
                    } = groupedCases[groupKey];

                    if (!caseData) {
                        console.warn(`Skipping group ${groupKey} — no client_case row found.`);
                        continue;
                    }

                    await createCaseWithAllData(caseData, {
                        peoples,
                        credits,
                        loans,
                        properties,
                        investments,
                        expenses
                    });
                }

                fs.unlinkSync(filePath);
                res.json({ success: true, message: "CSV processed and data saved." });

            } catch (err) {
                console.error(err);
                res.status(500).json({ error: "Something went wrong during CSV processing" });
            }
        });
};

// API for upload excel or csv file for policy
export const uploadPolicyExcel = async (req, res) => {
    const file = req.file;
    const policy_id = req.body.policy_id;
    const case_id = req.body.case_id;

    if (!file || !policy_id || !case_id) {
        return res.status(400).json({ success: false, message: 'File, policy_id and case_id are required' });
    }

    const uploaded_file_name = file.originalname;

    try {
        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });

        const cleanNumber = (val) => {
            if (!val) return 0.0;
            const cleaned = String(val).replace(/,/g, '').trim();
            return parseFloat(cleaned) || 0.0;
        };

        const normalizeKey = (key) =>
            key.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

        const headerMap = {};
        const firstRow = rawRows[0];
        if (firstRow) {
            Object.keys(firstRow).forEach((originalKey) => {
                const normalized = normalizeKey(originalKey);
                headerMap[normalized] = originalKey;
            });
        }

        const getValue = (row, expectedKey) => {
            const normalizedKey = normalizeKey(expectedKey);
            const actualKey = headerMap[normalizedKey];
            return row[actualKey];
        };

        const policies = rawRows.map(row => {
            const yearAgeRaw = getValue(row, 'Year | Age') || '';
            const [yearRaw, ageRaw] = String(yearAgeRaw).split('|');

            return {
                policy_id,
                case_id,
                year: parseInt(yearRaw?.trim()) || null,
                age: parseInt(ageRaw?.trim()) || null,
                guaranteed_premium: cleanNumber(getValue(row, 'Guaranteed Required Annual Premium')),
                deposit: cleanNumber(getValue(row, 'Excelerator Deposit Option Annual Deposit')),
                cash_premiums: cleanNumber(getValue(row, 'Cash Premiums')),
                dividend: cleanNumber(getValue(row, 'Annual Dividend')),
                cash_increase: cleanNumber(getValue(row, 'Annual Increase in Total Cash Value')),
                total_cash: cleanNumber(getValue(row, 'Total Cash Value')),
                total_death: cleanNumber(getValue(row, 'Total Death Benefit')),
            };
        });

        await insertPolicyExcelData(policies);
        await updateClientPeoplePolicies(policy_id, uploaded_file_name);
        fs.unlinkSync(file.path);

        return res.status(200).json({ success: true, message: MSG.COMBINED_POLICY_DATA_INSERTED });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: MSG.COMBINED_POLICY_DATA_INSERTION_FAILED, error: err.message });
    }
};

export const getCombinedPolicyData = async (req, res) => {
    const { case_id } = req.body;
    try {
        const combinedData = await getCombinedPolicy(case_id);

        if (!combinedData || combinedData.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.COMBINED_POLICY_DATA_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: combinedData,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export const getPolicyDetails = async (req, res) => {
    const { case_id } = req.body;
    try {
        const poilicyDetails = await getPolicyWiseDetail(case_id);

        if (!poilicyDetails || poilicyDetails.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.POLICY_DATA_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: poilicyDetails,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export const getFinalReport = async (req, res) => {
    const { case_id } = req.body;
    try {
        const reportDetails = await getFinalReportDetail(case_id);

        if (!reportDetails || reportDetails.length === 0) {
            return res.status(404).json({
                success: false,
                message: MSG.REPORT_DATA_NOT_FOUND
            });
        }

        return res.status(200).json({
            success: true,
            data: reportDetails,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: MSG.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
}

export const copyCaseData = async (req, res) => {
    const { case_id } = req.body;
    const agentId = req.user.id;

    try {
        const { newCaseId, action } = await copyCase(case_id, agentId);
        res.status(200).json({
            success: true,
            message: action === 'copy_created'
                ? MSG.CASE_COPIED
                : MSG.CASE_SYNCED,
            action,
            new_case_id: newCaseId,
            has_copy: 1
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};