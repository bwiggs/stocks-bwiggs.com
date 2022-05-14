const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
function toCurrency(v) {
    return currencyFormatter.format(v);
}