const Cairo = imports.cairo;
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const toCurrency = require('./helpers').toCurrency;
const log = require("./logger").log;


class TickerMenuItem extends PopupMenu.PopupBaseMenuItem {
    constructor(ticker, opts = {}, props) {
        super(props);
        this.showPrice = opts.price;
        this.ticker = ticker;
        this._drawingArea = new St.DrawingArea({width: 200});
        this._drawingArea.height = 15;
        this.addActor(this._drawingArea, { span: -1, expand: true });
        this._signals.connect(this._drawingArea, 'repaint', Lang.bind(this, this._onRepaint));
    }

    _onRepaint(area) {
        let cr = area.get_context();

        let [w, h] = [50, 16];
        let pct = this.ticker.chgPct;

        let colors = {
            lightGreen: [.2, .8, .3],
            medGreen: [0.2, 0.6, 0.2],
            darkGreen: [0.3, 0.4, 0.3],

            lightRed: [1,0,0],
            medRed: [0.7,0.22,0.17],
            darkRed: [0.5,0.3,0.3],
            white: [1, 1, 1],
            black: [0,0,0],
            gray: [.3, .3, .3]
        }

        let gradientMap = [
            [6, 3, 0, -3, -6, Number.NEGATIVE_INFINITY],
            [colors.lightGreen, colors.medGreen, colors.darkGreen, colors.darkRed, colors.medRed, colors.lightRed]
        ];

        let idx = gradientMap[0].findIndex(v => {
            return pct >= v;
        });

        let color = idx == -1 ? colors.gray : gradientMap[1][idx];

        { // color ticker symbol rect
            // rect
            // cr.setSourceRGB(...color);
            // cr.setLineWidth(1);
            // cr.rectangle(0, 0, w, h);
            // cr.fill();

            // text
            cr.setSourceRGB(...colors.white); 
            cr.selectFontFace("monospace", Cairo.FontSlant.NORMAL, Cairo.FontWeight.NORMAL);
            cr.setFontSize(12);
            cr.moveTo(0, 12);
            cr.showText(this.ticker.displayName || this.ticker.symbol); 
        }

        // pct rect
        let pctOffsetX = 140;
        let pctBoxWidth = 60;
        cr.setSourceRGB(...color);
        // cr.setLineWidth(1);
        cr.rectangle(pctOffsetX, 0, pctBoxWidth, h);
        cr.fill();

        cr.setSourceRGB(...colors.white);

        // price
        if(this.showPrice !== false) {
            cr.moveTo(55, 12)
            cr.showText(toCurrency(this.ticker.price).padStart(10));
        }

        // pct
        cr.selectFontFace("monospace", Cairo.FontSlant.NORMAL, Cairo.FontWeight.BOLD);

        let textX = (pctBoxWidth - (this.ticker.chgPct.toFixed(2).length*9))/2;
        cr.moveTo(pctOffsetX + textX, 12);
        cr.showText(`${this.ticker.chgPct.toFixed(2)}%`); 

        cr.$dispose();
    }

    // _onRepaintOG(area) {
    //     let cr = area.get_context();
    //     let themeNode = area.get_theme_node();
    //     let [width, height] = area.get_surface_size();
    //     let margin = themeNode.get_length('-margin-horizontal');
    //     let gradientHeight = themeNode.get_length('-gradient-height');
    //     let startColor = themeNode.get_color('-gradient-start');
    //     let endColor = themeNode.get_color('-gradient-end');

    //     let gradientWidth = (width - margin * 2);
    //     let gradientOffset = (height - gradientHeight) / 2;
    //     let pattern = new Cairo.LinearGradient(margin, gradientOffset, width - margin, gradientOffset + gradientHeight);
    //     pattern.addColorStopRGBA(0, startColor.red / 255, startColor.green / 255, startColor.blue / 255, startColor.alpha / 255);
    //     pattern.addColorStopRGBA(0.5, endColor.red / 255, endColor.green / 255, endColor.blue / 255, endColor.alpha / 255);
    //     pattern.addColorStopRGBA(1, startColor.red / 255, startColor.green / 255, startColor.blue / 255, startColor.alpha / 255);
    //     cr.setSource(pattern);
    //     cr.rectangle(margin, gradientOffset, gradientWidth, gradientHeight);
    //     cr.fill();

    //     cr.$dispose();
    // }
}
