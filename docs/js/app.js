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
    uniqueTransactionValues
} from "./comparison.js";

import {
    getTransactionBand,
    getRateValue
} from "./normalize.js";

import {
    setOptions
} from "./utils.js";


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

    transactionBands: []
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
        document.getElementById(
            "comparison-table-container"
        )
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

        renderDashboard();


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


function renderDashboard() {

    state.comparisonRows =
        buildComparisonRows(
            state.snapshotRows,
            state.rateType,
            state.baseCurrency,
            state.transactionValue
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

        renderDashboard();
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

        renderDashboard();
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