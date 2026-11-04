/**
 * FX Margin Dashboard
 * Normalisation and rate utility functions.
 */

/**
 * Canonical standardized SGD bands (same labels as std_bands.py).
 */
export const STANDARDIZED_BAND_LABELS = [
    "SGD 0 – 14,000",
    "SGD 14,000 – 28,000",
    "SGD 28,000 – 70,000",
    "SGD 70,000 – 280,000",
    "SGD 280,000+"
];


/**
 * True when the label is one of the standardized comparison bands.
 */
export function isStandardizedBand(label) {

    return STANDARDIZED_BAND_LABELS.includes(
        String(label ?? "").trim()
    );
}


/**
 * Sort key from a standardized transaction-band label.
 *
 * Examples:
 * "SGD 0 – 14,000"
 * "SGD 14,000 – 28,000"
 * "SGD 280,000+"
 */
export function transactionBandSortKey(label) {
    const trimmed = String(label ?? "").trim();

    if (trimmed.includes("<")) {
        return 0;
    }

    const match = trimmed.match(/([\d,]+(?:\.\d+)?)/);

    if (!match) {
        return Number.MAX_SAFE_INTEGER;
    }

    return parseFloat(match[1].replace(/,/g, ""));
}


/**
 * Normalize a rate by its unit.
 */
export function normalizeRate(rate, unit) {
    if (rate == null || unit <= 0) {
        return null;
    }

    return rate / unit;
}


/**
 * Calculate margin percentage from mid rate.
 *
 * tt_od_sell:
 * Customer buys FCY → bank sells FCY.
 *
 * tt_buy:
 * Customer sells FCY → bank buys FCY.
 */
function quotedRate(rate) {
    if (rate == null || rate === 0) {
        return null;
    }

    return rate;
}


function marginPctOfMid(rate, mid, customerBuysFcy) {
    if (
        quotedRate(rate) == null ||
        mid == null ||
        mid === 0
    ) {
        return null;
    }

    return customerBuysFcy
        ? ((rate - mid) / mid) * 100
        : ((mid - rate) / mid) * 100;
}


/**
 * Return the requested margin value for a rate row.
 */
export function getRateValue(row, rateType) {
    switch (rateType) {

        case "tt_od_sell":
            if (quotedRate(row.tt_od_sell) == null) {
                return null;
            }

            return (
                row.sell_margin_pct ??
                marginPctOfMid(
                    row.tt_od_sell,
                    row.mid_rate,
                    true
                )
            );

        case "tt_buy":
            if (quotedRate(row.tt_buy) == null) {
                return null;
            }

            return (
                row.buy_margin_pct ??
                marginPctOfMid(
                    row.tt_buy,
                    row.mid_rate,
                    false
                )
            );

        default:
            return null;
    }
}


/**
 * Return the standardized transaction band.
 * Native bank tiers are not used for comparison.
 */
export function getTransactionBand(row) {

    const std =
        String(row.std_transaction_value ?? "").trim();

    return isStandardizedBand(std) ? std : "";
}


/**
 * Identify standardized rows.
 */
export function isStandardizedRow(row) {
    return row.record_type === "standardized";
}


/**
 * Lower margin is better for the customer.
 */
export function isLowerBetter() {
    return true;
}


/**
 * Human-readable rate-type label.
 */
export function rateTypeLabel(rateType) {

    switch (rateType) {

        case "tt_od_sell":
            return "Buy FCY margin % of mid (bank sell)";

        case "tt_buy":
            return "Sell FCY margin % of mid (bank buy)";

        default:
            return rateType;
    }
}


/**
 * Format a percentage rate.
 */
export function formatRate(value, digits = 2) {

    if (value == null) {
        return "—";
    }

    return `${value.toFixed(digits)}%`;
}


/**
 * Sort transaction bands in business order.
 */
export function sortTransactionBands(values) {

    return [...values].sort(
        (a, b) =>
            transactionBandSortKey(a) -
            transactionBandSortKey(b) ||
            a.localeCompare(b)
    );
}