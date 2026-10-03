/**
 * FX Margin Dashboard
 * Static browser data loader.
 */

import { getTransactionBand } from "./normalize.js";


/**
 * Dashboard data location.
 *
 * IMPORTANT:
 * This is relative to docs/index.html.
 *
 * GitHub Pages:
 *   ./data/consolidated
 */
const DATA_BASE_URL = "./data/consolidated";


/**
 * Convert an empty CSV value to null,
 * otherwise return a numeric value.
 */
function parseNumber(value) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


/**
 * Convert record type into the supported values.
 */
function parseRecordType(value) {

    return value === "standardized"
        ? "standardized"
        : "native";
}


/**
 * Convert one raw CSV row into the dashboard's
 * standard JavaScript data structure.
 */
function parseRow(raw) {

    const stdTransactionValue =
        raw.std_transaction_value?.trim();

    const stdAmountTier =
        raw.std_amount_tier?.trim();

    return {

        record_type:
            parseRecordType(raw.record_type),

        bank:
            raw.bank ?? "",

        base_currency:
            raw.base_currency ?? "",

        quote_currency:
            raw.quote_currency ?? "",

        currency_pair:
            raw.currency_pair ?? "",

        unit:
            Number(raw.unit) || 1,

        transaction_value:
            raw.transaction_value ?? "",

        amount_tier:
            raw.amount_tier ?? "",

        std_transaction_value:
            stdTransactionValue || null,

        std_amount_tier:
            stdAmountTier || null,

        group:
            raw.group ?? "",

        effective_date:
            raw.effective_date ?? "",

        last_updated:
            raw.last_updated ?? "",

        scraped_at:
            raw.scraped_at ?? "",

        tt_od_sell:
            parseNumber(raw.tt_od_sell),

        tt_buy:
            parseNumber(raw.tt_buy),

        mid_rate:
            parseNumber(raw.mid_rate),

        sell_margin_pct:
            parseNumber(raw.sell_margin_pct),

        buy_margin_pct:
            parseNumber(raw.buy_margin_pct)
    };
}


/**
 * Fetch and parse a consolidated CSV.
 */
export async function fetchCsv(filename) {

    const url = `${DATA_BASE_URL}/${filename}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to load ${url} (${response.status})`
        );
    }

    const text = await response.text();

    const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true
    });

    if (parsed.errors?.length) {

        console.warn(
            "CSV parsing warnings:",
            parsed.errors
        );
    }

    return parsed.data.map(parseRow);
}


/**
 * Load the consolidated data index.
 */
export async function fetchIndex() {

    const url = `${DATA_BASE_URL}/index.json`;

    try {

        const response = await fetch(url);

        if (!response.ok) {

            console.warn(
                `Could not load ${url} (${response.status})`
            );

            return {
                latest: "latest.csv",
                dates: []
            };
        }

        return await response.json();

    } catch (error) {

        console.warn(
            "Could not load data index:",
            error
        );

        return {
            latest: "latest.csv",
            dates: []
        };
    }
}


/**
 * Load historical CSVs.
 */
export async function loadHistoricalRates(dates) {

    const byDate = new Map();

    for (const date of dates) {

        try {

            const rows = await fetchCsv(
                `${date}.csv`
            );

            byDate.set(date, rows);

        } catch (error) {

            console.warn(
                `Skipping ${date}:`,
                error
            );
        }
    }

    return byDate;
}


/**
 * Filter only standardized rows.
 */
export function filterStandardizedRows(rows) {

    return rows.filter(
        row => row.record_type === "standardized"
    );
}