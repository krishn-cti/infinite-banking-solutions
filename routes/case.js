import express from "express";
import { auth } from "../middleware/auth.js";
import { uploadSingleFile } from '../middleware/uploadFile.js';
import {
    createClientCase,
    createClientPeople,
    createClientCredit,
    getAllCaseTypes,
    getClientCases,
    getClientPeoples,
    getClientCredits,
    createClientLoan,
    getClientLoans,
    createClientInvestment,
    getClientInvestments,
    createClientExpense,
    getClientExpenses,
    getClientTotals,
    createClientProperty,
    getClientProperties,
    createClientPeoplePolicy,
    getClientPeoplePolicies,
    createClientTotal,
    getClientReductions,
    createClientReduction,
    createClientFinalTotal,
    getClientFinalTotals,
    getClientCaseDetail,
    uploadBulkCaseByCsv,
    getClientCaseOfAgent,
    removeClientPeople,
    uploadPolicyExcel,
    getCombinedPolicyData,
    getPolicyDetails,
    getAllClientCases,
    removeClientCase,
    getFinalReport,
    copyCaseData
} from "../controllers/caseController.js";
import { uploadCsv } from "../middleware/uploadCsv.js";

const router = express.Router();

router.get('/get-all-case-types', auth, getAllCaseTypes);
router.post('/create-client-case', auth, createClientCase);
router.post('/get-client-all-cases', auth, getClientCases);
router.post('/get-client-case', auth, getClientCaseDetail);
router.post('/get-all-cases-of-agent', auth, getClientCaseOfAgent);
router.post('/get-all-cases-of-clients', auth, getAllClientCases);
router.post('/delete-client-case', auth, removeClientCase);

// routes for peoples
router.post('/create-client-people', auth, createClientPeople);
router.post('/get-client-peoples', auth, getClientPeoples);
router.post('/delete-client-people', auth, removeClientPeople);

// routes for properties
router.post('/create-client-property', auth, createClientProperty);
router.post('/get-client-properties', auth, getClientProperties);

// routes for credits
router.post('/create-client-credit', auth, createClientCredit);
router.post('/get-client-credits', auth, getClientCredits);

// routes for loans
router.post('/create-client-loan', auth, createClientLoan);
router.post('/get-client-loans', auth, getClientLoans);

// routes for investments
router.post('/create-client-investment', auth, createClientInvestment);
router.post('/get-client-investments', auth, getClientInvestments);

// routes for expenses
router.post('/create-client-expense', auth, createClientExpense);
router.post('/get-client-expenses', auth, getClientExpenses);

// routes for totals
router.post('/create-client-total', auth, createClientTotal);
router.post('/get-client-totals', auth, getClientTotals);

// routes for reductions
router.post('/create-client-reduction', auth, createClientReduction);
router.post('/get-client-reductions', auth, getClientReductions);

// routes for totals
router.post('/create-client-final-total', auth, createClientFinalTotal);
router.post('/get-client-final-totals', auth, getClientFinalTotals);

// routes for policies
router.post('/create-client-people-policy', auth, createClientPeoplePolicy);
router.post('/get-client-people-policies', auth, getClientPeoplePolicies);

// routes for upload csv to create case
router.post('/upload-bulk-case-by-csv', auth, uploadCsv, uploadBulkCaseByCsv);
router.post('/upload-policy-excel', uploadSingleFile('file'), uploadPolicyExcel);
router.post('/get-combined-policy', getCombinedPolicyData);
router.post('/get-policy-details', getPolicyDetails);
router.post('/get-final-report', getFinalReport);

router.post('/copy-case-data', auth, copyCaseData);
export default router;