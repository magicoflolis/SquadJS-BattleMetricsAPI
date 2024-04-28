import axios from 'axios';
import chalk from 'chalk';


/**
 * @typedef { object } qBans
 * @property { { player: string; info: object; relationships: object; }[] } bans
 * @property { { active: number; expired: number; total: number; } } meta
 */

/**
 * @typedef { object } qMatch
 * @property { { BEGUID: string; player: string; names: string[]; steamID: string; } } identifiers
 * @property { { profile: object; bans: object; gameInfo: object; } } meta
 * @property { { id: string; type: 'playerFlag'; createdAt: string; updatedAt: string; icon: string; name: string; color: string; description: string; }[] } playerFlags
 */

/**
 * @typedef { object } bList
 * @property { string } [name="Default"]
 * @property { string | null } listID
 * @property { string | null } orgID
 * @property { string | null } serverID
 * @property { string | null } token
 * @property { string } UUID
 */

/**
 * If you wish to use `[[string]]` or replace it with your own format.
 *
 * ```js
 * const templateReg = /\[\[(.*?)\]\]/g;
 * ```
 */
const templateReg = /\{\{(.*?)\}\}/g;

// #region Utils
/**
 * Returns a string representation of an object.
 * @template O
 * @param {O} obj
 * @returns {string}
 */
const objToStr = (obj) => {
  return Object.prototype.toString.call(obj);
};
/**
 * Object is typeof `String`, `new URL()`, or `new URLSearchParams()`
 * @template O
 * @param { O } obj
 * @returns { boolean }
 */
const isURL = (obj) => {
  const s = objToStr(obj);
  return s.includes('String') || s.includes('URL');
};
/**
 * Object is typeof `{}`
 * @template O
 * @param { O } obj
 * @returns { boolean }
 */
const isObj = (obj) => {
  return objToStr(obj).includes('Object');
};
/**
 * Object is `null` or `undefined`
 * @template O
 * @param { O } obj - Any null or undefined
 * @returns { boolean } Returns boolean statement
 */
const isNull = (obj) => {
  return Object.is(obj, null) || Object.is(obj, undefined);
};

/**
 * Object is Blank
 * @template O
 * @param { O } obj - Any String, Array, Set, Map, or Object
 * @returns { boolean } Returns boolean statement
 */
const isBlank = (obj) => {
  return (
    (typeof obj === 'string' && Object.is(obj.trim(), '')) ||
    ((obj instanceof Set || obj instanceof Map) && Object.is(obj.size, 0)) ||
    (Array.isArray(obj) && Object.is(obj.length, 0)) ||
    (isObj(obj) && Object.is(Object.keys(obj).length, 0))
  );
};

/**
 * Object is Empty
 * @template O
 * @param { O } obj - Any String, Array, Set, Map, null, undefined, or Object
 * @returns { boolean } Returns boolean statement
 */
const isEmpty = (obj) => {
  return isNull(obj) || isBlank(obj);
};

/**
 * @template [O={}]
 * @param { O } obj
 * @param { string } locate
 * @returns { keyof O | null }
 */
const validator = (obj = {}, locate = '') => {
  try {
    obj = obj ?? {};
    if (typeof locate !== 'string') {
      throw new Error('"locate" must be a typeof "String"');
    }
    if (!isObj(obj)) {
      throw new Error('"obj" must be a typeof "Object" (JSON Object)');
    }
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Date) continue;
      if (key === locate) {
        return value;
      } else if (typeof value === 'object') {
        return validator(value, locate);
      }
    }
  } catch (ex) {
    console.error(ex);
  }
  return null;
};

// #endregion

/** @type { Map<string, bList> } */
const lists = new Map();
const listDef = {
  listID: null,
  orgID: null,
  serverID: null,
  token: null,
  UUID: ''
};
class BattleMetrics {
  /**
   * @param { import("./battlemetrics-api.d.ts").BattleMetricsOptions } options
   */
  constructor(options) {
    if (typeof options !== 'object') {
      throw new Error('"options" needs to be a type of Object');
    }

    // #region Binders
    this.dbg = this.dbg.bind(this);
    this.err = this.err.bind(this);
    this.log = this.log.bind(this);
    this.req = this.req.bind(this);
    this.makeID = this.makeID.bind(this);
    // #endregion

    /** @type { Map<string, qMatch> } */
    this.qmPlayers = new Map();
    this.BanLists = options.BanLists ?? [];
    this.listID = null;
    this.orgID = null;
    this.serverID = null;
    this.token = null;
    this.UUID = '';

    this.setDefault(options);
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["setDefault"] }
   */
  setDefault(opt) {
    for (const param of ['listID', 'orgID', 'serverID', 'token', 'UUID']) {
      this[param] = opt[param] ?? null;
      listDef[param] = opt[param] ?? null;
    }

    lists.set('default', {
      name: 'default',
      ...listDef
    });
    return this.loadLists(this.BanLists, true);
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["loadLists"] }
   */
  loadLists(BanLists = [], force = false) {
    try {
      if (!Array.isArray(BanLists)) {
        throw new Error('"BanLists" needs to be a type of Array');
      }
      for (const obj of BanLists) {
        try {
          if (isObj(obj)) {
            if (!obj.name || typeof obj.name !== 'string') {
              obj.name = obj.listID;
              this.err(`"name" needs to be a type of String, fallback to using listID "${obj.listID}"`);
            }
            if (!force && lists.has(obj.name)) {
              this.log(`"${obj.name}" already exists, skipping...`);
              continue;
            }
            const o = this.setObj(listDef, obj);
            lists.set(obj.name, o);
          } else if (typeof obj === 'string') {
            const listObj = {
              listID: obj
            };
            if (!force && lists.has(obj)) {
              this.log(`"${obj}" already exists, skipping...`);
              continue;
            }
            const o = this.setObj(listDef, listObj);
            lists.set(obj, o);
          } else {
            throw new Error('"obj" must be a type of String or Object');
          }
        } catch (ex) {
          this.err(ex);
        }
      }
    } catch (e) {
      this.err(e);
    }
    this.log(`Loaded ${lists.size} Ban Lists`);
    return lists;
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["lookupBans"] }
   */
  async lookupBans(player, format = true) {
    const resp = {
      bans: [],
      meta: {
        active: 0,
        expired: 0,
        total: 0
      }
    };
    try {
      if (typeof player !== 'string') {
        throw new Error('[lookupBans] Invalid player');
      }
      if (Object.is(player.trim(), '')) {
        throw new Error('[lookupBans] "player" is blank');
      }
      const grabBM = await this.req(
        `/bans?sort=-timestamp&filter[player]=${player}&filter[expired]=true`
      );
      if (format) {
        return {
          bans:
            grabBM.data
              .filter((item) => item.type === 'ban')
              .map((item) => {
                return {
                  player: item.meta.player,
                  info: item.attributes,
                  relationships: item.relationships
                };
              }) ?? [],
          meta: grabBM.meta
        };
      }
      return grabBM;
    } catch (ex) {
      this.err(ex);
    }
    return format ? resp : {};
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["quickMatch"] }
   */
  async quickMatch(steamID, format = true, force = false) {
    try {
      if (typeof steamID !== 'string') {
        throw new Error('[quickMatch] Invalid SteamID');
      }
      if (Object.is(steamID.trim(), '')) {
        throw new Error('[quickMatch] "steamID" is blank');
      }
      if (this.qmPlayers.has(steamID) && format && !force) {
        return this.qmPlayers.get(steamID);
      }
      const grabBM = await this.req(
        '/players/quick-match?page[size]=100&fields[identifier]=type,identifier,lastSeen,metadata&filter[public]=false&filter[playerFlags]=&include=identifier,flagPlayer,playerFlag,player',
        'post',
        'json',
        {
          data: [
            {
              attributes: {
                identifier: steamID,
                type: 'steamID'
              },
              type: 'identifier'
            }
          ]
        }
      );
      if (format) {
        const respObj = {
          identifiers: {
            BEGUID: isEmpty(grabBM.included)
              ? ''
              : grabBM.included
                  .filter((item) => item.type === 'identifier' && item.attributes.type === 'BEGUID')
                  .map((item) => item.attributes.identifier)
                  .join(' '),
            player: isEmpty(grabBM.included)
              ? ''
              : grabBM.included
                  .filter(
                    (item) => item.type === 'player' && item.attributes.positiveMatch === true
                  )
                  .map((item) => item.id)
                  .join(' '),
            names: isEmpty(grabBM.included)
              ? ''
              : grabBM.included
                  .filter((item) => item.type === 'identifier' && item.attributes.type === 'name')
                  .map((item) => item.attributes.identifier),
            steamID
          },
          metadata: isEmpty(grabBM.data)
            ? {}
            : grabBM.data
                .filter((item) => item.type === 'identifier' && item.attributes.metadata)
                .map((item) => item.attributes.metadata)[0],
          playerFlags: isEmpty(grabBM.included)
            ? []
            : grabBM.included
                .filter((item) => item.type === 'playerFlag' && item.id)
                .map((item) => {
                  return {
                    id: item.id,
                    type: item.type,
                    ...item.attributes
                  };
                })
        };
        this.qmPlayers.set(steamID, respObj);
        return respObj;
      }
      return grabBM;
    } catch (ex) {
      this.err(ex);
    }
    return null;
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["makeID"] }
   */
  makeID(str) {
    if (typeof str !== 'string') {
      this.err(`"${str}" must be a typeof String`);
      str = '';
    }
    if (str.length > 10) {
      this.err(`"${str}" must be less than 10 characters`);
      str = '';
    }
    const stringTemplate = ',';
    let d = new Date().getTime();
    let d2 =
      (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0;
    while (str.length < 14) {
      str += stringTemplate;
    }
    return str
      .replace(new RegExp(`[${stringTemplate}]`, 'g'), (c) => {
        let r = Math.random() * 16;
        if (d > 0) {
          r = (d + r) % 16 | 0;
          d = Math.floor(d / 16);
        } else {
          r = (d2 + r) % 16 | 0;
          d2 = Math.floor(d2 / 16);
        }
        return (c === stringTemplate ? r : (r & 0x7) | 0x8).toString(16);
      })
      .toUpperCase();
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["getExpires"] }
   */
  getExpires(expires = null, forDiscord = false) {
    if (typeof expires !== 'string') {
      if (forDiscord) {
        return 'Perm';
      }
      return null;
    }
    const dtNow = new Date();
    const num = expires.match(/\d+/);
    let dt = null;
    if (expires.match(/\d+d/i)) {
      dtNow.setDate(dtNow.getDate() + Number(num[0]));
      dt = dtNow.toISOString();
    } else if (expires.match(/\d+h/i)) {
      dtNow.setHours(dtNow.getHours() + Number(num[0]));
      dt = dtNow.toISOString();
    }
    return dt;
  }

  validReason(reason) {
    if (isEmpty(reason) || typeof reason !== 'string') {
      return 'No reason given';
    }
    const wordCount = reason.length;
    if (wordCount > 255) {
      this.err('"reason" exceeds 255 character limit', reason);
      let str = '';
      let i = 0;
      while (str.length < 255) {
        str += reason.at(i);
        i++;
      }
      reason = str;
    }
    return reason;
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["addToBanList"] }
   */
  async addToBanList(
    info = {},
    reason,
    expires = null,
    template = '{{reason}} | {{timeLeft}}',
    banlist = 'default'
  ) {
    reason = 'reason' in info ? info.reason : reason;
    expires = 'expires' in info ? info.expires : expires;
    template = 'template' in info ? info.template : template;
    banlist = 'banlist' in info ? info.banlist : banlist;

    const inList = lists.has(banlist);
    if (inList) {
      this.log('Using ban list:', banlist);
    } else {
      this.log(`[FALLBACK] Using "default" ban list, "${banlist}" not found!`);
    }

    const resp = {};
    const banListType = inList ? banlist : 'default';
    const listData = lists.get(banListType) ?? this;
    const formatExpires = isNull(expires) ? 'Perm' : expires;
    const formatReason = this.validReason(reason);

    try {
      const attributes = {
        reason: template.replace(templateReg, (_match, root) => {
          if (/reason/.test(root)) {
            return formatReason;
          }
          return _match;
        }),
        note: info.note ?? null,
        expires: this.getExpires(expires),
        identifiers: [],
        autoAddEnabled: info.autoAddEnabled ?? false,
        nativeEnabled: info.nativeEnabled ?? null,
        orgWide: info.orgWide ?? true
      };
      const relationships = {
        server: {
          data: {
            type: 'server',
            id: listData.serverID
          }
        },
        organization: {
          data: {
            type: 'organization',
            id: listData.orgID
          }
        },
        user: {
          data: {
            type: 'user',
            id: listData.orgID
          }
        },
        banList: {
          data: {
            type: 'banList',
            id: listData.listID
          }
        }
      };
      const uid = this.makeID(listData.UUID);

      const EOSID = validator(info, 'eosID');
      if (typeof EOSID === 'string') {
        attributes.identifiers.push({
          type: 'eosID',
          identifier: EOSID,
          manual: true
        });
      }
      const lastIP = validator(info, 'lastIP');
      if (typeof lastIP === 'string' && /^[A-Za-z0-9.:%]+$/.test(lastIP)) {
        attributes.identifiers.push({
          type: 'ip',
          identifier: lastIP,
          manual: true
        });
      }
      const steamID = validator(info, 'steamID');
      if (typeof steamID === 'string' && /^\d{17}$/.test(steamID)) {
        attributes.identifiers.push({
          type: 'steamID',
          identifier: steamID,
          manual: true
        });
        const playerInfo = await this.quickMatch(steamID);
        const { player } = playerInfo.identifiers;
        if (player) {
          Object.assign(relationships, {
            player: {
              data: {
                id: player,
                type: 'player'
              }
            }
          });
        }
      }
      if (!('BAN_ID' in info)) {
        attributes.uid = uid;
        attributes.timestamp = (info.time ?? new Date()).toISOString();
      }
      const grabBM = await this.req(
        'BAN_ID' in info ? `/bans/${info.BAN_ID}` : '/bans',
        'BAN_ID' in info ? 'patch' : 'post',
        'json',
        {
          headers: {
            'Content-Type': 'application/json'
          },
          data: {
            attributes,
            relationships,
            type: 'ban'
          }
        }
      );
      if (grabBM) {
        const respInfo = grabBM.data;
        Object.assign(resp, {
          id: respInfo.id || respInfo.attributes.id,
          banInfo: respInfo,
          UUID: uid || respInfo.attributes.uid,
          reason: 'reason' in respInfo.attributes ? respInfo.attributes.reason : null,
          steamID,
          raw: respInfo
        });
      }
    } catch (ex) {
      this.err(ex);
    }
    Object.assign(resp, {
      expires: this.getExpires(expires, true),
      formatted: {
        expires: formatExpires,
        reason: template.replace(templateReg, (_match, root) => {
          if (/expires|timeLeft/.test(root)) {
            return formatExpires;
          } else if (/reason/.test(root)) {
            return formatReason;
          }
          return _match;
        })
      },
      listData
    });
    return resp;
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["getBanList"] }
   */
  async getBanList(url, banlist) {
    try {
      banlist = banlist ?? 'default';
      const { listID } = lists.get(banlist);
      if (isEmpty(listID)) {
        throw new Error('"listID" is empty or invalid');
      }
      if (isEmpty(url)) {
        url = `/bans?page[size]=100&sort=-timestamp&include=server,user,player,organization&fields[server]=name&fields[player]=name&fields[user]=nickname&filter[expired]=false&filter[banList]=${listID}&fields[banExemption]=reason`;
      }
      const resp = await this.req(url);
      return resp;
    } catch (ex) {
      this.err(ex);
    }
    return null;
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["req"] }
   */
  async req(url, method, responseType, extra) {
    try {
      if (isEmpty(url)) {
        throw new Error('"url" field is empty');
      }
      if (!isURL(url)) {
        throw new Error('"url" field must be a type of String or URL');
      }
      if (isEmpty(method) || typeof method !== 'string') {
        method = 'GET';
      }
      if (isEmpty(responseType) || typeof responseType !== 'string') {
        responseType = 'json';
      }
      extra = extra ?? {};
      /**
       * @type { import('axios').AxiosRequestConfig }
       */
      const config = {
        // `url` is the server URL that will be used for the request
        url,
        // `method` is the request method to be used when making the request
        method,
        // `baseURL` will be prepended to `url` unless `url` is absolute.
        // It can be convenient to set `baseURL` for an instance of axios to pass relative URLs
        // to methods of that instance.
        baseURL: 'https://api.battlemetrics.com',
        // `headers` are custom headers to be sent
        headers: {
          Authorization: 'Bearer ' + this.token
        },
        // `responseType` indicates the type of data that the server will respond with
        // options are: 'arraybuffer', 'document', 'json', 'text', 'stream'
        responseType
      };
      if (extra.data) {
        Object.assign(config, {
          data: {
            data: extra.data
          }
        });
        delete extra.data;
      }
      const reqConfig = this.setObj(config, extra);
      Object.assign(config, reqConfig);
      const { data } = await axios(config);
      return data;
    } catch (ex) {
      if (ex.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        this.err('[HTTP request]', 'ex.response.data', JSON.stringify(ex.response.data));
        this.err('[HTTP request]', 'ex.response.status', ex.response.status);
        this.err('[HTTP request]', 'ex.response.headers', ex.response.headers);
      } else if (ex.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        this.err('[HTTP request]', ex.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        this.err('[HTTP request]', ex.message);
      }
      this.err('[HTTP request]', 'Config', ex.config);
    }
    return null;
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["setObj"] }
   */
  setObj(objA = {}, objB = {}) {
    objA = objA ?? {};
    objB = objB ?? {};
    for (const [key, value] of Object.entries(objA)) {
      if (!Object.hasOwn(objB, key)) {
        objB[key] = value;
      } else if (typeof value === 'object') {
        this.setObj(value, objB[key]);
      }
    }
    return objB;
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["toJSON"] }
   */
  toJSON(data) {
    if (isEmpty(data)) {
      return null;
    }
    const obj = {};
    for (const [k, v] of data) {
      obj[k] = v;
    }
    return obj;
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["toArray"] }
   */
  toArray(data) {
    if (isEmpty(data)) {
      return null;
    }
    const obj = [];
    for (const [k, v] of data) {
      obj.push([k, v]);
    }
    return obj;
  }

  // #region Console Logs
  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["dbg"] }
   */
  dbg(...msg) {
    console.debug(`${this.prettyPrint(chalk.yellowBright('Debug'))}`, ...msg);
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["err"] }
   */
  err(...msg) {
    const extras = [];
    let message = '';
    for (const ex of msg) {
      if (typeof ex === 'string') {
        message += `${ex}\n`;
      } else {
        extras.push(ex);
      }
    }
    if (isBlank(message) && isBlank(extras)) {
      return;
    }
    console.error(`${this.prettyPrint(chalk.redBright('Error'))} ${message}`, ...extras);
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["log"] }
   */
  log(...msg) {
    console.log(`${this.prettyPrint(chalk.blueBright('Log'))}`, ...msg);
  }

  /**
   * @type { import("./battlemetrics-api.d.ts").BattleMetrics["prettyPrint"] }
   */
  prettyPrint(content) {
    const n = chalk.magentaBright(this.constructor.name);
    return `[${new Date().toISOString()}][${n}]${content ? `[${content}]` : ''}[1]`;
  }
  // #endregion
}

export default BattleMetrics;
