import { HELOC_EQUITY_FACTOR } from '../../constants.js';
import { round } from '../../utils.js';
import {
  calculateMonthlyPaymentExpense,
  calculateCurrentBalance
} from '../helpers/index.js';

//================================================================//
//data.properties[i].mortgage.calculated_monthly_payment_expense
//================================================================//
// Calculate the monthly payment expense for any loan object, with an optional offset of monthsOffset to enable future year calculations
export function calculateMonthlyMortgagePaymentExpense(
  mortgage,
  monthsOffset = 0
) {
  return calculateMonthlyPaymentExpense(mortgage, monthsOffset);
}

//================================================================//
//data.properties[i].mortgage.calculated_current_loan_balance
//================================================================//
// Calculate the current balance of any given loan object, with an optional offset
export function calculateCurrentMortgageBalance(mortgage, monthsOffset = 0) {
  return calculateCurrentBalance(mortgage, monthsOffset);
}

//================================================================//
// data.properties[i].calculated_current_equity
//================================================================//
export function calculateCurrentEquity(property) {
  return round(
    property.current_value - property.mortgage.calculated_current_loan_balance
  );
}

//================================================================//
//data.properties[i].heloc.calculated_room_available
//================================================================//
export function calculateRoomAvailable(property) {
  const totalRoomAvailable =
    (1 - property?.minimum_heloc_equity || HELOC_EQUITY_FACTOR) *
      property.current_value -
    property.mortgage.calculated_current_loan_balance;
  return totalRoomAvailable - property.heloc?.balance;
}
