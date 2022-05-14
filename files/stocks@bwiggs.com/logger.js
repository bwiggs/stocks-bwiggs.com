const UUID = "stockquotes@bwiggs.com";

const DEBUG = 0;

var log = {
    _log(m, level) {
        if(!DEBUG && (level == "debug" || level == "trace")) return;

        const msg = `[${UUID}] [${level}] ${m}`;

        if (level === "ERROR") {
            global.logError(msg);
        } else if (level === "WARNING") {
            global.logWarning(msg);
        } else {
            global.log(msg);
        }
    },
    info(m) { this._log(m, "info"); },
    debug(m) { this._log(m, "debug"); },
    trace(m) { this._log(m, "trace"); },
    warn(m) { this._log(m, "warning"); },
    error(m) { this._log(m, "error"); }
};