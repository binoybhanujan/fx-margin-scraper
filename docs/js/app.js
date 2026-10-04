import {
    renderCompetitorTrendChart,
    renderPeerMedianChart,
    renderRankChart,
    renderHeadroomBars
} from "./charts.js";

import {
    fetchIndex,
    fetchCsv,
    loadHistoricalRates,
    filterStandardizedRows
} from "./data-loader.js";

import {
    buildComparisonRows,
    uniqueBanks,
    uniqueBaseCurrencies,
    uniqueTransactionValues,
    renderComparisonTable
} from "./comparison.js";

import {
    getTransactionBand,
    getRateValue,
    rateTypeLabel
} from "./normalize.js";

import {
    escapeHtml,
    setOptions
} from "./utils.js";

import {
    buildHsbcInsights,
    buildHsbcTimeSeries,
    banksHsbcFirst,
    formatBank,
    formatMargin,
    formatPp,
    resolveInsightBand
} from "./insights.js";


const state = {

    snapshotRows: [],

    historyDates: [],

    selectedDate: "",

    loading: true,

    error: null,

    baseCurrency: "all",

    transactionValue: "all",

    rateType: "tt_od_sell",

    trendCurrency: "USD",

    trendPoints: [],

    peerSeries: [],

    comparisonRows: [],

    banks: [],

    currencies: [],

    transactionBands: [],

    insightBand: "",

    insights: null

};


const elements = {

    loading:
        document.getElementById("loading"),

    error:
        document.getElementById("error"),

    dashboard:
        document.getElementById("dashboard"),

    dateFilter:
        document.getElementById("date-filter"),

    rateTypeFilter:
        document.getElementById("rate-type-filter"),

    trendCurrencyFilter:
        document.getElementById("trend-currency-filter"),

    currencyFilter:
        document.getElementById("currency-filter"),

    transactionFilter:
        document.getElementById("transaction-filter"),

    comparisonTable:
        document.getElementById("comparison-table-container"),
    
    competitorTrendChart:
        document.getElementById("competitor-trend-chart-container"),

    insightBandLabel:
        document.getElementById(
            "insight-band-label"
        ),
    
    executiveSummaryText:
        document.getElementById(
            "executive-summary-text"
        ),
    
    kpiGrid:
        document.getElementById(
            "kpi-grid"
        ),
    
    largestHeadroom:
        document.getElementById(
            "largest-headroom"
        ),
    
    tightestPressure:
        document.getElementById(
            "tightest-pressure"
        ),
    
    marketCheapest:
        document.getElementById(
            "market-cheapest"
        ),
    
    marketDearest:
        document.getElementById(
            "market-dearest"
        ),
    
    hsbcCheapest:
        document.getElementById(
            "hsbc-cheapest"
        ),
    
    hsbcDearest:
        document.getElementById(
            "hsbc-dearest"
        ),

    peerMedianChart:
        document.getElementById("peer-median-chart-container"),

    rankChart:
        document.getElementById("rank-chart-container"),

    headroomChart:
        document.getElementById("headroom-chart-container")
};


async function initialize() {

    try {

        state.loading = true;

        elements.loading.hidden = false;


        const index =
            await fetchIndex();


        state.historyDates =
            [...(index.dates ?? [])]
                .sort(
                    (a, b) =>
                        b.localeCompare(a)
                );


        if (state.historyDates.length === 0) {

            throw new Error(
                "No historical data dates were found."
            );
        }


        state.selectedDate =
            state.historyDates[0];


        await loadSnapshot(
            state.selectedDate
        );


        setupFilters();

        await renderDashboard();


        elements.loading.hidden = true;
        elements.dashboard.hidden = false;


        state.loading = false;

    } catch (error) {

        console.error(
            "Dashboard initialization failed:",
            error
        );


        state.error =
            error instanceof Error
                ? error.message
                : "Failed to load dashboard.";


        elements.loading.hidden = true;

        elements.error.textContent =
            state.error;

        elements.error.hidden = false;
    }
}


async function loadSnapshot(date) {

    state.loading = true;


    const rows =
        await fetchCsv(
            `${date}.csv`
        );


    state.snapshotRows =
        filterStandardizedRows(rows);


    state.banks =
        uniqueBanks(
            state.snapshotRows
        );


    state.currencies =
        uniqueBaseCurrencies(
            state.snapshotRows,
            state.rateType
        );


    state.transactionBands =
        uniqueTransactionValues(
            state.snapshotRows
        );


    if (
        !state.currencies.includes(
            state.trendCurrency
        )
    ) {

        state.trendCurrency =
            state.currencies.includes("USD")
                ? "USD"
                : state.currencies[0] ?? "";
    }


    state.comparisonRows =
        buildComparisonRows(
            state.snapshotRows,
            state.rateType,
            state.baseCurrency,
            state.transactionValue
        );


    state.loading = false;
}

async function buildHistoricalChartData() {

    if (state.historyDates.length === 0) {

        state.trendPoints = trendPoints;

        state.peerSeries =
            selectedBand
                ? buildHsbcTimeSeries(
                    historical,
                    state.rateType,
                    state.trendCurrency,
                    selectedBand
                )
                : [];

        return trendPoints;
    }


    const historical =
        await loadHistoricalRates(
            state.historyDates
        );


    const bands =
        state.transactionBands.length > 0
            ? state.transactionBands
            : [];


    const selectedBand =
        state.transactionValue !== "all"
            ? state.transactionValue
            : bands[0] ?? "";


    const trendPoints = [];


    for (
        const [date, rows]
        of historical
    ) {

        const seen = new Set();


        for (
            const row
            of filterStandardizedRows(rows)
        ) {

            if (
                row.base_currency !==
                state.trendCurrency
            ) {
                continue;
            }


            const rowBand =
                getTransactionBand(row);


            if (
                selectedBand &&
                rowBand !== selectedBand
            ) {
                continue;
            }


            const key =
                `${date}|${row.bank}`;


            if (seen.has(key)) {
                continue;
            }


            const marginPct =
                getRateValue(
                    row,
                    state.rateType
                );


            if (marginPct == null) {
                continue;
            }


            seen.add(key);


            trendPoints.push({

                date,

                bank:
                    row.bank,

                rate:
                    marginPct
            });
        }
    }


    state.trendPoints =
        trendPoints;


    /*
     * Peer-series calculation will be connected
     * after insights.js is migrated.
     *
     * For now:
     */
    state.peerSeries = [];
    return trendPoints;
}


function setupFilters() {

    setOptions(
        elements.dateFilter,
        state.historyDates,
        {
            selected:
                state.selectedDate
        }
    );


    setOptions(
        elements.trendCurrencyFilter,
        state.currencies,
        {
            selected:
                state.trendCurrency
        }
    );


    setOptions(
        elements.currencyFilter,
        state.currencies,
        {
            includeAll: true,
            allLabel: "All currencies",
            selected:
                state.baseCurrency
        }
    );


    setOptions(
        elements.transactionFilter,
        state.transactionBands,
        {
            includeAll: true,
            allLabel: "All transaction bands",
            selected:
                state.transactionValue
        }
    );
}

function renderCompactTable(
    container,
    headers,
    rows
) {

    if (!rows || rows.length === 0) {

        container.innerHTML = `
            <p class="empty-message">
                No currencies match this view for the insight band.
            </p>
        `;

        return;
    }


    const headerHtml =
        headers
            .map(
                header =>
                    `<th>${escapeHtml(header)}</th>`
            )
            .join("");


    const bodyHtml =
        rows
            .map(
                row => `
                    <tr>
                        ${row
                            .map(
                                value =>
                                    `<td>${escapeHtml(value)}</td>`
                            )
                            .join("")}
                    </tr>
                `
            )
            .join("");


    container.innerHTML = `
        <div class="table-wrapper">

            <table class="compact-table">

                <thead>
                    <tr>
                        ${headerHtml}
                    </tr>
                </thead>

                <tbody>
                    ${bodyHtml}
                </tbody>

            </table>

        </div>
    `;
}

function renderExecutiveSummary() {

    const insights =
        state.insights;


    if (!insights) {

        elements.insightBandLabel.textContent =
            "";

        elements.executiveSummaryText.textContent =
            "";

        elements.kpiGrid.innerHTML =
            "";

        elements.largestHeadroom.innerHTML =
            "";

        elements.tightestPressure.innerHTML =
            "";

        elements.marketCheapest.innerHTML =
            "";

        elements.marketDearest.innerHTML =
            "";

        elements.hsbcCheapest.innerHTML =
            "";

        elements.hsbcDearest.innerHTML =
            "";

        return;
    }


    /*
     * Insight band
     */

    elements.insightBandLabel.textContent =
        `Insight band: ${insights.band}`;


    /*
     * Summary sentence
     */

    const medianRank =
        insights.kpis.medianRank == null
            ? "—"
            : insights.kpis.medianRank.toFixed(1);


    elements.executiveSummaryText.textContent =
        `HSBC quotes ${insights.kpis.quoted} currencies. ` +
        `Cheapest on ${insights.kpis.cheapestCount}, ` +
        `most expensive on ${insights.kpis.mostExpensiveCount}. ` +
        `Median rank ${medianRank}. ` +
        `Median gap vs cheapest peer ` +
        `${formatPp(insights.kpis.medianGapVsCheapest)}.`;


    /*
     * KPI tiles
     */

    const kpis = [

        [
            "HSBC quotes",
            String(insights.kpis.quoted)
        ],

        [
            "HSBC cheapest",
            String(insights.kpis.cheapestCount)
        ],

        [
            "HSBC most expensive",
            String(insights.kpis.mostExpensiveCount)
        ],

        [
            "Median HSBC rank",
            medianRank
        ],

        [
            "Median gap vs cheapest",
            formatPp(
                insights.kpis.medianGapVsCheapest
            )
        ]
    ];


    elements.kpiGrid.innerHTML =
        kpis.map(
            ([label, value]) => `
                <div class="kpi-card">

                    <p class="kpi-label">
                        ${escapeHtml(label)}
                    </p>

                    <p class="kpi-value">
                        ${escapeHtml(value)}
                    </p>

                </div>
            `
        ).join("");


    /*
     * Largest headroom
     */

    renderCompactTable(
        elements.largestHeadroom,

        [
            "Pair",
            "HSBC",
            "Peer median",
            "Headroom",
            "Cheapest peer"
        ],

        insights.widen
            .slice(0, 3)
            .map(row => [
                row.currency_pair,
                formatMargin(
                    row.hsbcMargin
                ),
                formatMargin(
                    row.peerMedian
                ),
                formatPp(
                    row.headroom
                ),
                `${formatBank(
                    row.cheapestPeerBank
                )} ${formatMargin(
                    row.cheapestPeerMargin
                )}`
            ])
    );


    /*
     * Tightest pressure
     */

    renderCompactTable(
        elements.tightestPressure,

        [
            "Pair",
            "HSBC",
            "Gap vs cheapest",
            "Cheapest bank"
        ],

        insights.pressure
            .slice(0, 3)
            .map(row => [
                row.currency_pair,
                formatMargin(
                    row.hsbcMargin
                ),
                formatPp(
                    row.gapVsCheapest
                ),
                formatBank(
                    row.cheapestBank
                )
            ])
    );


    /*
     * Market cheapest
     */

    renderCompactTable(
        elements.marketCheapest,

        [
            "Pair",
            "Market median",
            "Cheapest bank"
        ],

        insights.marketCheapest
            .slice(0, 3)
            .map(row => [
                row.currency_pair,
                formatMargin(
                    row.marketMedian
                ),
                formatBank(
                    row.cheapestBank
                )
            ])
    );


    /*
     * Market dearest
     */

    renderCompactTable(
        elements.marketDearest,

        [
            "Pair",
            "Market median",
            "Widest bank"
        ],

        insights.marketDearest
            .slice(0, 3)
            .map(row => [
                row.currency_pair,
                formatMargin(
                    row.marketMedian
                ),
                formatBank(
                    row.widestBank
                )
            ])
    );


    /*
     * HSBC cheapest
     */

    renderCompactTable(
        elements.hsbcCheapest,

        [
            "Pair",
            "HSBC margin",
            "Rank"
        ],

        insights.hsbcCheapest
            .slice(0, 3)
            .map(row => [
                row.currency_pair,
                formatMargin(
                    row.hsbcMargin
                ),
                String(row.rank)
            ])
    );


    /*
     * HSBC dearest
     */

    renderCompactTable(
        elements.hsbcDearest,

        [
            "Pair",
            "HSBC margin",
            "Rank"
        ],

        insights.hsbcDearest
            .slice(0, 3)
            .map(row => [
                row.currency_pair,
                formatMargin(
                    row.hsbcMargin
                ),
                String(row.rank)
            ])
    );
}

async function renderDashboard() {

    /*
     * ---------------------------------------------------------
     * 1. Bank comparison table
     * ---------------------------------------------------------
     */

    state.comparisonRows =
        buildComparisonRows(
            state.snapshotRows,
            state.rateType,
            state.baseCurrency,
            state.transactionValue
        );


    /*
     * ---------------------------------------------------------
     * 2. Resolve the insight band
     * ---------------------------------------------------------
     */

    state.insightBand =
        resolveInsightBand(
            state.transactionValue,
            state.transactionBands
        );


    /*
     * ---------------------------------------------------------
     * 3. Build HSBC insight source rows
     *
     * Important:
     * Insights use ALL currencies, regardless of the
     * Bank Comparison currency filter.
     * ---------------------------------------------------------
     */

    const insightSourceRows =
        state.insightBand
            ? buildComparisonRows(
                state.snapshotRows,
                state.rateType,
                "all",
                state.insightBand
            )
            : [];


    /*
     * ---------------------------------------------------------
     * 4. Calculate HSBC insights
     * ---------------------------------------------------------
     */

    state.insights =
        state.insightBand
            ? buildHsbcInsights(
                insightSourceRows,
                state.insightBand
            )
            : null;


    /*
     * ---------------------------------------------------------
     * 5. Load historical data and build trend series
     * ---------------------------------------------------------
     */

    const trendPoints =
        await buildHistoricalChartData();

    state.trendPoints =
        trendPoints;


    /*
     * ---------------------------------------------------------
     * 6. Executive summary
     * ---------------------------------------------------------
     */

    renderExecutiveSummary();


    /*
     * ---------------------------------------------------------
     * 7. Competitor trend
     * ---------------------------------------------------------
     */

    renderCompetitorTrendChart(
        elements.competitorTrendChart,
        trendPoints,
        state.banks,
        `${state.trendCurrency}/SGD — ${rateTypeLabel(state.rateType)}`
    );


    /*
     * ---------------------------------------------------------
     * 8. HSBC vs peer median
     * ---------------------------------------------------------
     */

    renderPeerMedianChart(
        elements.peerMedianChart,
        state.peerSeries,
        `${state.trendCurrency}/SGD — HSBC vs peer median (${rateTypeLabel(state.rateType)})`
    );


    /*
     * ---------------------------------------------------------
     * 9. HSBC rank
     * ---------------------------------------------------------
     */

    renderRankChart(
        elements.rankChart,
        state.peerSeries,
        `${state.trendCurrency}/SGD — HSBC rank over time`
    );


    /*
     * ---------------------------------------------------------
     * 10. Headroom
     * ---------------------------------------------------------
     */

    renderHeadroomBars(
        elements.headroomChart,
        state.insights?.headroomBars ?? [],
        `Headroom by currency — ${state.insightBand ?? ""}`
    );


    /*
     * ---------------------------------------------------------
     * 11. Bank comparison table
     * ---------------------------------------------------------
     */

    renderComparisonTable(
        elements.comparisonTable,
        state.comparisonRows,
        state.banks,
        false
    );


    console.log(
        "Dashboard state:",
        state
    );
}


elements.dateFilter.addEventListener(
    "change",
    async event => {

        state.selectedDate =
            event.target.value;

        await loadSnapshot(
            state.selectedDate
        );

        setupFilters();

        await renderDashboard();
    }
);


elements.rateTypeFilter.addEventListener(
    "change",
    async event => {

        state.rateType =
            event.target.value;

        await loadSnapshot(
            state.selectedDate
        );

        setupFilters();

        await renderDashboard();
    }
);


elements.currencyFilter.addEventListener(
    "change",
    event => {

        state.baseCurrency =
            event.target.value;

        renderDashboard();
    }
);


elements.transactionFilter.addEventListener(
    "change",
    event => {

        state.transactionValue =
            event.target.value;

        renderDashboard();
    }
);


elements.trendCurrencyFilter.addEventListener(
    "change",
    event => {

        state.trendCurrency =
            event.target.value;

        renderDashboard();
    }
);


initialize();