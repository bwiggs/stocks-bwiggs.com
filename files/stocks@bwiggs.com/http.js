
const Soup = imports.gi.Soup;

var HTTPRequest = class HTTPRequest {
  constructor(method, url) {
    this.method = method;
    this.url = url;
  }

  static GetJSON(url){
    let r = new HTTPRequest('GET', url);
    return r.json();
  }

  static Get(url) {
    let r = new HTTPRequest('GET', url);
    return r.body();
  }

  json() {
    return JSON.parse(this.body());
  }

  body() {
    let msg = this._request(this.method, this.url);
    let data = msg.response_body.data;

    // Catches EFBBBF (UTF-8 BOM) because the buffer-to-string
	  // conversion translates it to FEFF (UTF-16 BOM)
	  if (data.charCodeAt(0) === 0xFEFF) {
		  data = data.slice(1);
  	}

  	return data;
  }

  _request(method, url) {
    let msg = Soup.Message.new(method, url);

    let sessionSync = new Soup.SessionSync();
    // sessionSync.add_feature(Soup.Logger.new(3, 100));
    sessionSync.send_message(msg);

    return msg;
  }
};