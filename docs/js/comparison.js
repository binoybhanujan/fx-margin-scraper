import {
    getRateValue,
    getTransactionBand,
    isLowerBetter,
    isStandardizedRow,
    sortTransactionBands,
    transactionBandSortKey
} from "./normalize.js";


/**
 * Keep only standardized rows.
 */
export function filterStandardizedRows(rows) {

    return rows.filter(isStandardizedRow);
}


/**
 * Build cross-bank comparison rows.
 */
export function buildComparisonRows(
    rows,
    rateType,
    baseCurrency,
    transactionValue
) {

    const filtered = rows.filter(row => {

        if (!isStandardizedRow(row)) {
            return false;
        }

        if (
            baseCurrency !== "all" &&
            row.base_currency !== baseCurrency
        ) {
            return false;
        }

        const band = getTransactionBand(row);

        if (
            transactionValue !== "all" &&
            band !== transactionValue
        ) {
            return false;
        }

        return true;
    });


    const groups = new Map();


    for (const row of filtered) {

        const band = getTransactionBand(row);

        const key =
            `${row.currency_pair}|${band}`;

        const list =
            groups.get(key) ?? [];

        list.push(row);

        groups.set(key, list);
    }


    const comparison = [];


    for (const bankRows of groups.values()) {

        const sample = bankRows[0];

        const banks = {};


        for (const row of bankRows) {

            const marginPct =
                getRateValue(row, rateType);

            banks[row.bank] = {

                rawRate: marginPct,

                normalizedRate: marginPct,

                last_updated:
                    row.last_updated
            };
        }


        const candidates =
            Object.entries(banks)
                .filter(
                    ([, value]) =>
                        value.normalizedRate != null
                );


        if (candidates.length === 0) {
            continue;
        }


        const lower =
            isLowerBetter(rateType);


        const bestBank =
            candidates.reduce(
                (best, [bank, value]) => {

                    const bestValue =
                        banks[best].normalizedRate;

                    const currentValue =
                        value.normalizedRate;

                    if (
                        bestValue == null ||
                        currentValue == null
                    ) {
                        return best;
                    }

                    if (lower) {

                        return currentValue < bestValue
                            ? bank
                            : best;
                    }

                    return currentValue > bestValue
                        ? bank
                        : best;

                },
                candidates[0][0]
            );


        comparison.push({

            currency_pair:
                sample.currency_pair,

            base_currency:
                sample.base_currency,

            transaction_value:
                getTransactionBand(sample),

            banks,

            bestBank
        });
    }


    return comparison.sort((a, b) => {

        const currencyCmp =
            a.base_currency.localeCompare(
                b.base_currency
            );

        if (currencyCmp !== 0) {
            return currencyCmp;
        }


        const bandCmp =
            transactionBandSortKey(
                a.transaction_value
            ) -
            transactionBandSortKey(
                b.transaction_value
            );

        if (bandCmp !== 0) {
            return bandCmp;
        }


        return a.currency_pair.localeCompare(
            b.currency_pair
        );
    });
}


/**
 * Return available base currencies.
 */
export function uniqueBaseCurrencies(
    rows,
    rateType = null
) {

    const relevant = rateType
        ? rows.filter(
            row =>
                isStandardizedRow(row) &&
                getRateValue(row, rateType) != null
        )
        : rows;


    return [
        ...new Set(
            relevant.map(
                row => row.base_currency
            )
        )
    ].sort();
}


/**
 * Return available transaction bands.
 */
export function uniqueTransactionValues(rows) {

    const values =
        rows
            .filter(isStandardizedRow)
            .map(getTransactionBand)
            .filter(value => value.length > 0);


    return sortTransactionBands(
        [...new Set(values)]
    );
}


/**
 * Return available banks.
 */
export function uniqueBanks(rows) {

    return [
        ...new Set(
            rows.map(row => row.bank)
        )
    ].sort();
}

import { formatRate } from "./normalize.js";
import { escapeHtml } from "./utils.js";

export function renderComparisonTable(
    container,
    rows,
    banks,
    loading = false
) {

    if (loading) {

        container.innerHTML =
            `<p class="section-description">Loading rates…</p>`;

        return;
    }


    if (rows.length === 0) {

        container.innerHTML = `
            <p class="empty-message">
                No margins match the selected filters.
            </p>
        `;

        return;
    }


    const headerCells = banks.map(bank => {

        const hsbcClass =
            bank === "hsbc"
                ? "hsbc-column"
                : "";

        return `
            <th class="${hsbcClass}">
                ${escapeHtml(bank.toUpperCase())}

                <span class="table-header-subtitle">
                    Margin % of mid
                </span>
            </th>
        `;
    }).join("");


    const bodyRows = rows.map(row => {

        const bankCells =
            banks.map(bank => {

                const cell =
                    row.banks[bank];

                const isBest =
                    row.bestBank === bank &&
                    cell?.normalizedRate != null;

                const classes = [
                    bank === "hsbc"
                        ? "hsbc-column"
                        : "",

                    isBest
                        ? "best-value"
                        : ""
                ]
                    .filter(Boolean)
                    .join(" ");


                return `
                    <td class="${classes}">
                        ${formatRate(
                            cell?.normalizedRate ?? null
                        )}
                    </td>
                `;

            }).join("");


        return `
            <tr>

                <td>
                    <strong>
                        ${escapeHtml(row.currency_pair)}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(row.transaction_value)}
                </td>

                ${bankCells}

                <td class="best-value">
                    ${escapeHtml(
                        row.bestBank?.toUpperCase() ?? "—"
                    )}
                </td>

            </tr>
        `;

    }).join("");


    container.innerHTML = `

        <div class="table-wrapper">

            <table class="data-table">

                <thead>

                    <tr>

                        <th>
                            Pair
                        </th>

                        <th>
                            Transaction band
                        </th>

                        ${headerCells}

                        <th>
                            Best for customer
                        </th>

                    </tr>

                </thead>

                <tbody>
                    ${bodyRows}
                </tbody>

            </table>

        </div>
    `;
}