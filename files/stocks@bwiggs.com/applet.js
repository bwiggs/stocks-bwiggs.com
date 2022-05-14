const Applet = imports.ui.applet;
const Util = imports.misc.util;
const HTTPRequest = require('./http').HTTPRequest;
const TickerMenuItem = require('./ticker-menu-item').TickerMenuItem;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Settings = imports.ui.settings;
const toCurrency = require('./helpers').toCurrency;
const Mainloop = imports.mainloop;

var _ = require('./init');
var UUID = _.UUID;
var log = _.log;

const tickers = [
    {symbol: "BBLN", group: "watchlist"},
    {symbol: "NET", group: "watchlist"},
    {symbol: "DDOG", group: "watchlist"},
    {symbol: "RPD", group: "watchlist"},
    {symbol: "NUMIF", group: "watchlist"},
    {symbol: "PLTR", group: "watchlist"},
    {symbol: "NIO", group: "watchlist"},
    {symbol: "CHPT", group: "watchlist"},
    {symbol: "HDRO", group: "watchlist"},
    {symbol: "PING", group: "watchlist"},
    {symbol: "CIBR", group: "watchlist"},
    {symbol: "VST", group: "watchlist"},
    {symbol: "MEME", group: "watchlist"},

    {symbol: "BTC-USD", name: "BTC", group: "crypto"},
    {symbol: "ETH-USD", name: "ETH", group: "crypto"},
    {symbol: "ADA-USD", name: "ADA", group: "crypto"},
    {symbol: "XRP-USD", name: "XRP", group: "crypto"},
    {symbol: "DOGE-USD", name: "DOGE", group: "crypto"},
    {symbol: "LTC-USD", name: "LTC", group: "crypto"},

    {symbol: "^NDX", name: "NAS100", group: "market"},
    {symbol: "^NYA", name: "NYSE", group: "market"},
    {symbol: "^GSPC", name: "SP500", group: "market"},
    {symbol: "^DJI", name: "DOW", group: "market"},
    {symbol: "^IXIC", name: "NASDAQ", group: "market"},
    {symbol: "^RUT", name: "RUSS", group: "market"},
    {symbol: "^VIX", name: "VIX", group: "market"},
    
    {symbol: "VHT", name:"Healthcare", group: "sector"},
    {symbol: "VAW", name: "Materials", group: "sector"},
    {symbol: "VNQ", name: "Realestate", group: "sector"},
    {symbol: "VDC", name: "Cons. Discretionary", group: "sector"},
    {symbol: "VCR", name: "Cons. Staples", group: "sector"},
    {symbol: "VDE", name: "Energy", group: "sector"},
    {symbol: "VIS", name: "Industrials", group: "sector"},
    {symbol: "VOX", name: "Communications", group: "sector"},
    {symbol: "VFH", name: "Financials", group: "sector"},
    {symbol: "VGT", name: "Technology", group: "sector"},
    {symbol: "VPU", name: "Utilities", group: "sector"}
];

class Ticker {
    static SORT_CHG_PCT = (a, b) => a.chgPct < b.chgPct;
    static SORT_PRICE = (a, b) => a.price < b.price;
    static SORT_SYMBOL = (a, b) => a.symbol > b.symbol;
    static SORT_MOVERS = (a, b) => Math.abs(a.chgPct) < Math.abs(b.chgPct);
}

const Stocks = {
    TICKER_ROTATE_INTERVAL_SEC: 2,
    QUOTE_FETCH_INTERVAL_SEC: 60,
};

function s(str) {
    return Gettext.dgettext(UUID, str);
}

class StockApplet extends Applet.TextApplet {
    constructor(metadata, orientation, panelHeight, instance_id) {
        super(orientation, panelHeight, instance_id);

        this.settings = new Settings.AppletSettings(this, UUID, this.instance_id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "update-interval", "updateInterval", this._new_freq, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, "watchlist", "watchlist", this.on_watchlist_changed, null);

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);

        this.update_quotes();
        this.update_menus();

        this.update_label(this.watchlist[0]);

        this.menu.toggle();
    }

    update_menus() {
        this.menu.removeAll();
        let allByGroup = this.watchlist.sort(Ticker.SORT_MOVERS).reduce((map, item) => {
            if(!item.group) item.group = 'watchlist';
            if(map[item.group] === undefined) {
                map[item.group] = [];
            }
            map[item.group].push(item);
            return map;
        }, {});

        Object.keys(allByGroup).forEach(group => {
            this.menu.addMenuItem(new PopupMenu.PopupMenuItem(group, {reactive: false}));
            allByGroup[group].forEach(t => {
                let item = new TickerMenuItem(t);
                item.connect('activate', Lang.bind(this, function() {
                    Util.spawnCommandLine("xdg-open https://finviz.com/quote.ashx?t=" + t.symbol);
                }));
                this.menu.addMenuItem(item);
            });
        });
    }

    rotate_labels() {
        this.currentTickerIdx++;
        if(this.currentTickerIdx == tickers.length) this.currentTickerIdx = 0;
        this.update_label(tickers[this.currentTickerIdx]);
    }

    update_quotes() {
        let symbols = this.watchlist.map(t => t.symbol);
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
        log.trace(`fetching: ${url}`);
        let quotes = HTTPRequest.GetJSON(url).quoteResponse.result;
        quotes.forEach(q => {
            let t = this.watchlist.find(t => t.symbol == q.symbol);
            t.price = q.regularMarketPrice;
            t.chgPct = q.regularMarketChangePercent;
        });

        this._updateLoopID = Mainloop.timeout_add_seconds(this.updateInterval, Lang.bind(this, this.update_quotes));
    }

    update_label(t) {
        let price = toCurrency(t.price);
        let chgPct = (t.chgPct || 0).toFixed(2);
        let label = `${t.symbol} ${price} ${chgPct}%`.padEnd(12, " ");
        log.debug(`update_label "${label}"`)
        this.set_applet_label(label);
        this.set_applet_tooltip(label);
    }

    on_watchlist_changed() {
        log.log("watchlist changed!")
    }

    on_applet_removed_from_panel() { 
        log.debug("on_applet_removed_from_panel")
        clearInterval(this.labelUpdateInterval);
        clearInterval(this.quoteFetchInterval);
        // stop the loop when the applet is removed
        if (this._updateLoopID) {
            Mainloop.source_remove(this._updateLoopID);
        }
    }

    on_applet_clicked() {
        this.menu.toggle();
    }
    
    on_applet_reloaded() { log.debug("on_applet_reloaded")}
    on_applet_added_to_panel() { log.debug("on_applet_added_to_panel")}
    on_applet_instances_changed() { log.debug("on_applet_instances_changed")}
}

function main(metadata, orientation, panel_height, instance_id) {
    log.debug("starting -------------------------------------")
    const applet = new StockApplet(
        metadata,
        orientation,
        panel_height,
        instance_id
    );

    return applet;
}
