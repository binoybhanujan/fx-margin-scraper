export function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


export function setOptions(
    select,
    values,
    {
        includeAll = false,
        allLabel = "All",
        selected = null
    } = {}
) {

    select.innerHTML = "";

    if (includeAll) {

        const option =
            document.createElement("option");

        option.value = "all";
        option.textContent = allLabel;

        select.appendChild(option);
    }


    for (const value of values) {

        const option =
            document.createElement("option");

        option.value = value;
        option.textContent = value;

        select.appendChild(option);
    }


    if (
        selected !== null &&
        [...select.options]
            .some(option => option.value === selected)
    ) {
        select.value = selected;
    }
}


export function show(element) {

    element.hidden = false;
}


export function hide(element) {

    element.hidden = true;
}


export function formatDate(date) {

    return date ?? "—";
}