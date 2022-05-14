const Applet = imports.ui.applet;
const Util = imports.misc.util;
const HTTPRequest = require('./http').HTTPRequest;
const TickerMenuItem = require('./ticker-menu-item').TickerMenuItem;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Settings = imports.ui.settings;
const toCurrency = require('./helpers').toCurrency;
const Mainloop = imports.mainloop;
const {GLib} = imports.gi;

var _ = require('./init');
var UUID = _.UUID;
var log = _.log;

function debounce(func, wait, options = {priority: GLib.PRIORITY_DEFAULT}) {
    let sourceId;
    return function (...args) {
        const debouncedFunc = () => {
            sourceId = null;
            func.apply(this, args);
        };

        // It is a programmer error to attempt to remove a non-existent source
        if (sourceId) {
            GLib.Source.remove(sourceId);
        }

        sourceId = GLib.timeout_add(options.priority, wait, debouncedFunc);
    };
}

function debug(o) {
    log.debug(JSON.stringify(o));
}

class Ticker {
    static SORT_CHG_PCT = (a, b) => a.chgPct < b.chgPct;
    static SORT_PRICE = (a, b) => a.price < b.price;
    static SORT_SYMBOL = (a, b) => a.symbol > b.symbol;
    static SORT_MOVERS = (a, b) => Math.abs(a.chgPct) < Math.abs(b.chgPct);
}

function s(str) {
    return Gettext.dgettext(UUID, str);
}

class StockApplet extends Applet.TextApplet {

    // default sort order
    sort_order = Ticker.SORT_CHG_PCT;

    constructor(metadata, orientation, panelHeight, instance_id) {
        super(orientation, panelHeight, instance_id);

        // debounced methods
        this.update_quotes = debounce(this._update_quotes);

        this.settings = new Settings.AppletSettings(this, UUID, this.instance_id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "update-interval", "updateInterval", this._new_freq, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, "watchlist", "watchlist", this.on_watchlist_changed, null);
        this.settings.bindProperty(Settings.BindingDirection.OUT, "groups", "groups", this.on_group_changed, null);

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);

        this._init_context_menu();

        this.update_label(this.watchlist[0]);

        Mainloop.timeout_add_seconds(this.updateInterval, Lang.bind(this, this.update));
        setTimeout(() => { this.update() }, 0);
    }

    _init_context_menu() {
        let refreshItem = new PopupMenu.PopupMenuItem("Refresh")
        refreshItem.connect('activate', () => {this.update();});
        this._applet_context_menu.addMenuItem(refreshItem);

        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let sortMenu = new PopupMenu.PopupSubMenuMenuItem("Sort Order");
        [
            {label: "% Change", value: Ticker.SORT_CHG_PCT},
            {label: "Movers", value: Ticker.SORT_MOVERS},
            {label: "Price", value: Ticker.SORT_PRICE},
            {label: "Symbol", value: Ticker.SORT_SYMBOL}
        ].forEach(i => {
            let mi = new PopupMenu.PopupMenuItem(i.label);
            mi.connect('activate', () => this._set_ticker_sort_order(i.value));
            sortMenu.menu.addMenuItem(mi);
        });
        this._applet_context_menu.addMenuItem(sortMenu);
    }

    _set_ticker_sort_order(order) {
        debug(order);
        this.sort_order = order;
        this.update_menus();
    }

    update() {
        this._update_quotes();
        this.update_menus();
        return true;
    }

    update_menus() {
        this.menu.removeAll();

        let allByGroup = this.watchlist.sort(this.sort_order).reduce((map, item) => {
            if(!item.group) item.group = 'watchlist';
            if(map[item.group] === undefined) {
                map[item.group] = [];
            }
            map[item.group].push(item);
            return map;
        }, {});

        Object.keys(allByGroup).forEach(group => {
            let submenu = new PopupMenu.PopupMenuItem(group.toUpperCase(), {reactive: false})
            this.menu.addMenuItem(submenu);
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

    _update_quotes() {
        let symbols = this.watchlist.map(t => t.symbol);
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
        log.trace(`fetching: ${url}`);
        let quotes = HTTPRequest.GetJSON(url).quoteResponse.result;
        quotes.forEach(q => {
            let t = this.watchlist.find(t => t.symbol == q.symbol);
            if(!t) return;
            t.price = q.regularMarketPrice;
            t.chgPct = q.regularMarketChangePercent;
            t.displayName = t.displayName || q.symbol;
        });
    }
    
    update_label(t) {
        let price = toCurrency(t.price);
        let chgPct = (t.chgPct || 0).toFixed(2);
        let label = `${t.symbol} ${price} ${chgPct}%`.padEnd(12, " ");
        this.set_applet_label("🤑");
        this.set_applet_tooltip(label);
    }

    on_watchlist_changed(e, v) {
        log.info(`watchlist changed!`);
        log.info(JSON.stringify(e))
        this.update_quotes();
        // this.update_menus();
    }

    on_applet_removed_from_panel() { 
        log.debug("on_applet_removed_from_panel")
        this.settings.finalize();
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
    return new StockApplet( metadata, orientation, panel_height, instance_id);
}
