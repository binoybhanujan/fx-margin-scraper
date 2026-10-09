import { escapeHtml } from "./utils.js";

const BANK_COLORS = {
    hsbc: "#db0011",
    dbs: "#5b7c99",
    ocbc: "#8a8d8f",
    uob: "#2e2e2e"
};

const chartInstances = {};


function destroyChart(key) {

    if (chartInstances[key]) {
        chartInstances[key].destroy();
        chartInstances[key] = null;
    }
}


function showEmpty(container, message) {

    destroyChart(container.id);

    container.innerHTML = `
        <p class="empty-message">
            ${escapeHtml(message)}
        </p>
    `;
}


function createCanvas(container, key) {

    destroyChart(key);

    container.innerHTML = "";

    const canvas =
        document.createElement("canvas");

    container.appendChild(canvas);

    return canvas;
}


/* =========================================================
   1. COMPETITOR TREND
   ========================================================= */

export function renderCompetitorTrendChart(
    container,
    data,
    banks,
    caption
) {

    if (!data || data.length === 0) {

        showEmpty(
            container,
            "No historical data yet. Run the scraper on multiple days to see trends."
        );

        return;
    }


    const byDate = new Map();


    for (const point of data) {

        const row =
            byDate.get(point.date) ??
            { date: point.date };

        row[point.bank] =
            point.rate;

        byDate.set(
            point.date,
            row
        );
    }


    const series =
        [...byDate.values()]
            .sort(
                (a, b) =>
                    String(a.date)
                        .localeCompare(
                            String(b.date)
                        )
            );


    const peers =
        banks.filter(
            bank => bank !== "hsbc"
        );

    const ordered = [
        ...peers,
        ...banks.filter(
            bank => bank === "hsbc"
        )
    ];


    const datasets =
        ordered.map(bank => ({

            label:
                bank.toUpperCase(),

            data:
                series.map(
                    row => row[bank] ?? null
                ),

            borderColor:
                BANK_COLORS[bank] ??
                "#8a8d8f",

            backgroundColor:
                BANK_COLORS[bank] ??
                "#8a8d8f",

            borderWidth:
                bank === "hsbc"
                    ? 2.5
                    : 2,

                pointRadius: 2,
                pointHoverRadius: 5,

            tension: 0.25,

            spanGaps: false
        }));
    
    const existingChart =
        chartInstances.competitorTrend;
    
    if (existingChart) {
    
        const existingDatasets =
            new Map(
                existingChart.data.datasets.map(
                    dataset => [dataset.label, dataset]
                )
            );
    
        existingChart.data.labels =
            series.map(
                row => row.date
            );
    
        existingChart.data.datasets =
            datasets.map(dataset => {
    
                const existingDataset =
                    existingDatasets.get(dataset.label);
    
                if (existingDataset) {
    
                    Object.assign(
                        existingDataset,
                        dataset
                    );
    
                    return existingDataset;
                }
    
                return dataset;
            });
    
        existingChart.options.plugins.title.text =
            caption;
    
        existingChart.update();
    
        return;
    }

    const canvas =
        createCanvas(
            container,
            "competitorTrend"
        );


    chartInstances.competitorTrend =
        new Chart(canvas, {

            type: "line",

            data: {
                labels:
                    series.map(
                        row => row.date
                    ),

                datasets
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                plugins: {

                    legend: {
                        display: true,

                        labels: {
                            color: "#5c5c5c",
                            font: {
                                size: 12
                            }
                        }
                    },

                    tooltip: {

                        callbacks: {

                            label(context) {

                                const value =
                                    context.parsed.y;

                                return value == null
                                    ? `${context.dataset.label}: —`
                                    : `${context.dataset.label}: ${value.toFixed(2)}%`;
                            }
                        }
                    },

                    title: {
                        display: true,
                        text: caption,
                        align: "start",
                        color: "#666666",
                        font: {
                            size: 13,
                            weight: "normal"
                        },
                        padding: {
                            bottom: 12
                        }
                    }
                },

                scales: {

                    x: {
                        title: {
                            display: true,
                            text: "Date"
                        },

                        ticks: {
                            color: "#5c5c5c"
                        },

                        grid: {
                            color: "#d7d8d6"
                        }
                    },

                    y: {

                        title: {
                            display: true,
                            text: "Margin (% of mid)"
                        },

                        ticks: {

                            color: "#5c5c5c",

                            callback(value) {
                                return `${Number(value).toFixed(2)}%`;
                            }
                        },

                        grid: {
                            color: "#d7d8d6"
                        }
                    }
                }
            }
        });
}


/* =========================================================
   2. HSBC VS PEER MEDIAN
   ========================================================= */

export function renderPeerMedianChart(
    container,
    series,
    caption
) {

    if (!series || series.length === 0) {

        showEmpty(
            container,
            "No historical HSBC vs peer median yet."
        );

        return;
    }


    const existingChart =
        chartInstances.peerMedian;

    if (existingChart) {

        existingChart.data.labels =
            series.map(
                point => point.date
            );

        const existingPeerDataset =
            existingChart.data.datasets[0];

        const existingHsbcDataset =
            existingChart.data.datasets[1];

        existingPeerDataset.data =
            series.map(
                point => point.peerMedian
            );

        existingHsbcDataset.data =
            series.map(
                point => point.hsbc
            );

        existingChart.options.plugins.title.text =
            caption;

        existingChart.update();

        return;
    }

    const canvas =
        createCanvas(
            container,
            "peerMedian"
        );


    chartInstances.peerMedian =
        new Chart(canvas, {

            type: "line",

            data: {

                labels:
                    series.map(
                        point => point.date
                    ),

                datasets: [

                    {
                        label: "Peer median",

                        data:
                            series.map(
                                point =>
                                    point.peerMedian
                            ),

                        borderColor:
                            "#8a8d8f",

                        backgroundColor:
                            "#8a8d8f",

                        borderDash:
                            [4, 3],

                        borderWidth: 2,

                        pointRadius: 2,
                        pointHoverRadius: 5,

                        tension: 0.25,

                        spanGaps: false
                    },

                    {
                        label: "HSBC",

                        data:
                            series.map(
                                point =>
                                    point.hsbc
                            ),

                        borderColor:
                            "#db0011",

                        backgroundColor:
                            "#db0011",

                        borderWidth: 2.5,

                        pointRadius: 2,
                        pointHoverRadius: 5,

                        tension: 0.25,

                        spanGaps: false
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: {
                    duration: 750,
                    easing: "easeInOutCubic"
                },

                interaction: {
                    mode: "index",
                    intersect: false
                },

                plugins: {

                    legend: {
                        labels: {
                            color: "#5c5c5c",
                            font: {
                                size: 12
                            }
                        }
                    },

                    title: {
                        display: true,
                        text: caption,
                        align: "start",
                        color: "#666666",
                        font: {
                            size: 13,
                            weight: "normal"
                        }
                    },

                    tooltip: {

                        callbacks: {

                            label(context) {

                                const value =
                                    context.parsed.y;

                                return value == null
                                    ? `${context.dataset.label}: —`
                                    : `${context.dataset.label}: ${value.toFixed(2)}%`;
                            }
                        }
                    }
                },

                scales: {

                    x: {

                        title: {
                            display: true,
                            text: "Date"
                        },

                        ticks: {
                            color: "#5c5c5c"
                        },

                        grid: {
                            color: "#d7d8d6"
                        }
                    },

                    y: {

                        title: {
                            display: true,
                            text: "Margin (% of mid)"
                        },

                        ticks: {

                            color: "#5c5c5c",

                            callback(value) {
                                return `${Number(value).toFixed(2)}%`;
                            }
                        },

                        grid: {
                            color: "#d7d8d6"
                        }
                    }
                }
            }
        });
}


/* =========================================================
   3. HSBC RANK
   ========================================================= */

export function renderRankChart(
    container,
    series,
    caption
) {

    if (!series || series.length === 0) {

        showEmpty(
            container,
            "No historical HSBC rank yet."
        );

        return;
    }

    const existingChart =
        chartInstances.rank;

    if (existingChart) {

        existingChart.data.labels =
            series.map(
                point => point.date
            );

        existingChart.data.datasets[0].data =
            series.map(
                point => point.rank
            );

        existingChart.options.plugins.title.text =
            caption;

        existingChart.update();

        return;
    }

    const canvas =
        createCanvas(
            container,
            "rank"
        );


    chartInstances.rank =
        new Chart(canvas, {

            type: "line",

            data: {

                labels:
                    series.map(
                        point => point.date
                    ),

                datasets: [

                    {
                        label:
                            "HSBC rank (1 = cheapest)",

                        data:
                            series.map(
                                point =>
                                    point.rank
                            ),

                        borderColor:
                            "#db0011",

                        backgroundColor:
                            "#db0011",

                        borderWidth:
                            2.5,

                        pointRadius: 2,
                        pointHoverRadius: 5,

                        tension:
                            0.25,

                        spanGaps:
                            false
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: {
                    duration: 750,
                    easing: "easeInOutCubic"
                },

                interaction: {
                    mode: "index",
                    intersect: false
                },

                plugins: {

                    legend: {
                        labels: {
                            color: "#5c5c5c",
                            font: {
                                size: 12
                            }
                        }
                    },

                    title: {
                        display: true,
                        text: caption,
                        align: "start",
                        color: "#666666",
                        font: {
                            size: 13,
                            weight: "normal"
                        }
                    }
                },

                scales: {

                    x: {

                        title: {
                            display: true,
                            text: "Date"
                        },

                        ticks: {
                            color: "#5c5c5c"
                        },

                        grid: {
                            color: "#d7d8d6"
                        }
                    },

                    y: {

                        reverse: true,

                        beginAtZero: false,

                        title: {
                            display: true,
                            text: "HSBC rank"
                        },

                        ticks: {
                            color: "#5c5c5c",
                            precision: 0
                        },

                        grid: {
                            color: "#d7d8d6"
                        }
                    }
                }
            }
        });
}


/* =========================================================
   4. HEADROOM
   ========================================================= */

export function renderHeadroomBars(
    container,
    rows,
    caption
) {

    const data =
        (rows ?? [])
            .filter(
                row =>
                    row.headroom != null
            );


    if (data.length === 0) {

        showEmpty(
            container,
            "No HSBC headroom on this date and insight band."
        );

        return;
    }


    const canvas =
        createCanvas(
            container,
            "headroom"
        );


    chartInstances.headroom =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    data.map(
                        row =>
                            row.base_currency
                    ),

                datasets: [

                    {
                        label:
                            "Headroom vs peer median",

                        data:
                            data.map(
                                row =>
                                    row.headroom
                            ),

                        backgroundColor:
                            data.map(
                                row =>
                                    (row.headroom ?? 0) >= 0
                                        ? "#8a8d8f"
                                        : "#db0011"
                            ),

                        borderWidth: 0
                    }
                ]
            },

            options: {

                indexAxis: "y",

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        labels: {
                            color: "#5c5c5c",
                            font: {
                                size: 12
                            }
                        }
                    },

                    title: {
                        display: true,
                        text: caption,
                        align: "start",
                        color: "#666666",
                        font: {
                            size: 13,
                            weight: "normal"
                        }
                    },

                    tooltip: {

                        callbacks: {

                            label(context) {

                                const value =
                                    context.parsed.x;

                                return value == null
                                    ? "Headroom: —"
                                    : `Headroom: ${value.toFixed(2)} pp`;
                            }
                        }
                    }
                },

                scales: {

                    x: {

                        title: {
                            display: true,
                            text: "Headroom vs peer median (pp)"
                        },

                        ticks: {
                            color: "#5c5c5c"
                        },

                        grid: {
                            color: "#d7d8d6"
                        }
                    },

                    y: {

                        title: {
                            display: true,
                            text: "Currency"
                        },

                        ticks: {
                            color: "#5c5c5c"
                        },

                        grid: {
                            color: "#d7d8d6"
                        }
                    }
                }
            },

            plugins: [{
                id: "zeroLine",

                afterDraw(chart) {

                    const {
                        ctx,
                        scales
                    } = chart;

                    const x =
                        scales.x.getPixelForValue(0);

                    ctx.save();

                    ctx.beginPath();

                    ctx.moveTo(
                        x,
                        scales.y.top
                    );

                    ctx.lineTo(
                        x,
                        scales.y.bottom
                    );

                    ctx.lineWidth = 1;

                    ctx.strokeStyle = "#1d1d1b";

                    ctx.stroke();

                    ctx.restore();
                }
            }]
        });
}