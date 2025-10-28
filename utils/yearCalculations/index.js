export function yearCalculationData(plan, data, case_type_id) {
    const output = { plan, data };
    var finalText = '';
    if (case_type_id === 1) {
        console.log(case_type_id, "case 1");
        const getPlanString = (year) => {
            console.log(year, "year")
            const data = output?.plan.find((p) => p.year === year);
            console.log("case type==>",case_type_id);
            if (data.specific_credit_balance_payments_this_year.length || data.specific_loan_balance_payments_this_year.length) {
                const formatAmount = (amount) =>
                    `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

                const processBalancePayments = (balance_payments) => {
                    let mainText = '';

                    balance_payments?.map((payment) => {
                        let amount = '';
                        let item = '';
                        let text = '';

                        Object.keys(payment).map((e) => {
                            if (e === 'fully_paid' && payment[e] === true) {
                                text = ` Completely pay off ${item} with a balance of ${amount}. `;
                            } else if (e === 'fully_paid' && payment[e] === false) {
                                text = ` Reduce your ${item} by ${amount}. `;
                            } else {
                                amount = formatAmount(payment[e]);
                                item = `${e}`;
                            }
                        });

                        mainText += text;
                    });

                    return mainText;
                };


                const creditActions = data.specific_credit_balance_payments_this_year || [];
                const loanActions = data.specific_loan_balance_payments_this_year || [];

                let creditPara = processBalancePayments(creditActions);
                let loanPara = processBalancePayments(loanActions);

                let finalText;

                if (!output?.plan[year - 1]?.starting_policy_loan_balance && year > 1) {
                    finalText = `${creditPara}${loanPara} Since your policy loan is paid off, the ${formatAmount(data.total_annualized_debt_payments_redirected_so_far / 12.0)} you were redirecting towards your policy loan will now be used to repay your HELOC.`;
                } else {
                    finalText = `${creditPara}${loanPara} Your redirected monthly payment towards the policy loan is now ${formatAmount(data.total_annualized_debt_payments_redirected_so_far / 12.0)}.`;
                } if (output?.plan[year - 1]?.starting_policy_loan_balance && output?.plan[year - 1]?.excess_heloc_funds_used_to_pay_back_policy_loan_this_year && year > 1) {
                    finalText = finalText + ` The left-over ${formatAmount(output?.plan[year - 1].excess_heloc_funds_used_to_pay_back_policy_loan_this_year)} from your HELOC draw now also goes towards your policy loan. Once the policy loan balance reaches zero, the ${formatAmount(data.total_annualized_debt_payments_redirected_so_far / 12.0)} you redirected towards your policy loan now just increases your monthly surplus budget to ${formatAmount(data.total_annualized_debt_payments_redirected_so_far / 12.0 + output?.data?.totals.calculated_monthly_final_surplus_budget)} and is paid towards the HELOC balance each month instead.`;
                }

                return finalText;
            }
        };

        return { getPlanString };
    } else if (case_type_id === 2) {
        console.log("case type==>",case_type_id);
        const getPlanString = (year) => {
            const data = output?.plan.find((p) => p.year === year);
            if (data.specific_credit_balance_payments_this_year.length || data.specific_loan_balance_payments_this_year.length) {
                const formatAmount = (amount) => `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ', ')}`;

                const processBalancePayments = (balance_payments) => {
                    let mainText = '';

                    balance_payments?.map((payment) => {
                        let amount = '';
                        let item = '';
                        let text = '';

                        Object.keys(payment).map((e) => {
                            if (e === 'fully_paid' && payment[e] === true) {
                                text = ` Completely pay off ${item} with a balance of ${amount}. `;
                            } else if (e === 'fully_paid' && payment[e] === false) {
                                text = ` Reduce your ${item} by ${amount}. `;
                            } else {
                                amount = formatAmount(payment[e]);
                                item = `${e}`;
                            }
                        });

                        mainText += text;
                    });

                    return mainText;
                };


                const creditActions = data.specific_credit_balance_payments_this_year || [];
                const loanActions = data.specific_loan_balance_payments_this_year || [];

                let creditPara = processBalancePayments(creditActions);
                let loanPara = processBalancePayments(loanActions);

                let finalText;

                finalText = `${creditPara}${loanPara} Your redirected monthly payment towards the policy loan is now ${formatAmount(data.total_annualized_debt_payments_redirected_so_far / 12.0)}.`;

                return finalText;
            }
        };

        return { getPlanString };
    } else {
        return finalText;
    }
}