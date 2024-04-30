import type { URL } from 'node:url';
import type { Method, ResponseType, AxiosRequestConfig } from 'axios';

interface quickMatch {
  identifiers: {
    BEGUID: string;
    player: string;
    names: string[];
    steamID: string;
  };
  meta: {
    profile: object;
    bans: object;
    gameInfo: object;
  };
  playerFlags: {
    id: string;
    type: 'playerFlag';
    createdAt: string;
    updatedAt: string;
    icon: string;
    name: string;
    color: string;
    description: string;
  }[];
}

interface qBans {
  bans: {
    player: string;
    info: object;
    relationships: object;
  }[];
  meta: {
    active: number;
    expired: number;
    total: number;
  };
}

interface qMatch {
  identifiers: {
    BEGUID: string;
    player: string;
    names: string[];
    steamID: string;
  };
  meta: {
    profile: object;
    bans: object;
    gameInfo: object;
  };
  playerFlags: {
    id: string;
    type: 'playerFlag';
    createdAt: string;
    updatedAt: string;
    icon: string;
    name: string;
    color: string;
    description: string;
  }[];
}

interface bList {
  name?: string;
  listID: string | null;
  orgID: string | null;
  serverID: string | null;
  token: string | null;
  UUID: string;
}

interface BanInput {
  steamID?: string;
  eosID?: string;
  lastIP?: string;
  time?: Date;
  player?: {
    steamID?: string;
    eosID?: string;
    lastIP?: string;
  };
  BAN_ID?: string;
  /**
   * The reason for the ban. This will be used when kicking the player from the server. Do not include private information. **Length:** `1..255`
   */
  reason?: string;
  /**
   * A private note to associate with the ban. Used to provide more detail than the reason could allow.
   */
  note?: string;
  /**
   * True if the ban should automatically ban new identifiers after kicking a matching player. If the ban is shared it will only add identifiers from organizations that have permManage set to true.
   */
  autoAddEnabled?: boolean;
  /**
   * True if native bans should be issued for this ban, null to use the default from the ban list, or false to prevent native bans. The default is false if there is no associated ban list.
   */
  nativeEnabled?: boolean;
  /**
   * True if the ban should be applied to all servers in your organization. orgWide is only checked for servers owned by organization who issued the ban. If the ban is shared the subscription settings of the ban list will override orgWide.
   */
  orgWide?: boolean;
}

interface BanOutput {
  id?: string;
  banInfo?: object;
  UUID?: string;
  reason?: string | null;
  steamID?: string;
  raw?: object;
  /**
   * Use this for Discord messages
   */
  expires: string | null;
  formatted: {
    expires: string | Date | null;
    reason: string;
  };
  listData: bList;
}

/**
 * Returns a string representation of an object.
 */
declare function objToStr<O>(obj: O): string;

/**
 * Object is typeof `String`, `new URL()`, or `new URLSearchParams()`
 */
declare function isURL<O>(obj: O): boolean;

/**
 * Object is typeof `object` / JSON Object
 */
declare function isObj<O>(obj: O): boolean;

/**
 * Object is `null` or `undefined`
 */
declare function isNull<O>(obj: O): boolean;

/**
 * Object is Blank, any type of `String`, `Array`, `Set`, `Map`, or `Object`
 */
declare function isBlank<O>(obj: O): boolean;

/**
 * Object is Empty, any type of `String`, `Array`, `Set`, `Map`, `null`, `undefined`, or `Object`
 */
declare function isEmpty<O>(obj: O): boolean;

interface BattleMetricsOptions {
  BanLists: bList[];
}

interface BattleMetrics {}

class BattleMetrics {
  constructor(options: BattleMetricsOptions);

  setDefault<List extends bList>(opt: { [x: string]: null }): Map<string, List>;

  loadLists<List extends bList>(BanLists: List[] = [], force: boolean = false): Map<string, List>;

  /**
   * Get bans of a player by `PlayerID`
   * @param player PlayerID
   * @param format Whether response is formatted
   *
   * [BattleMetricsAPI reference](https://www.battlemetrics.com/developers/documentation#sparse-fieldsets)
   */
  async lookupBans(player: string, format: boolean = true): Promise<qBans>;

  /**
   * Quick match player by `Steam64ID`, if player has already been quick matched return that cached data instead.
   * @param steamID Steam64ID
   * @param format If false, return the response and do not cache it.
   * @param force If true response will overwrite players quick match cache.
   *
   * [BattleMetricsAPI reference](https://www.battlemetrics.com/developers/documentation#link-POST-player-/players/quick-match)
   */
  async quickMatch(
    steamID: string,
    format: boolean = true,
    force: boolean = false
  ): Promise<qMatch>;

  /**
   * Make a 14 character UUID, required to create BattleMetrics bans.
   *
   * [BattleMetricsAPI reference](https://www.battlemetrics.com/developers/documentation#ban-templates)
   */
  makeID(str: string): string;

  /**
   * @param forDiscord Returns "Perm" if expires is `null`
   */
  getExpires<E extends string | null>(
    expires: E = null,
    forDiscord: boolean = false
  ): E | 'Perm';

  /**
   * Add player to a Ban List, _SCROLL TO VIEW EXAMPLE BELOW!_
   * @param info Any type of object that contains a `steamID`
   * @param reason The reason for the ban. This will be used when kicking the player from the server. Do not include private information. **Length:** `1..255`
   * @param expires When the ban should expire. If null the player will be banned permanently.
   * @param template Ban reason template for BattleMetrics
   * @param banlist Cached ban list to use
   *
   * [BattleMetricsAPI Create Ban](https://www.battlemetrics.com/developers/documentation#link-POST-ban-/bans)
   *
   * [BattleMetricsAPI Get Ban Info](https://www.battlemetrics.com/developers/documentation#link-GET-ban-/bans/{(%23%2Fdefinitions%2Fban%2Fdefinitions%2Fidentity)})
   *
   * ```js
   * import BasePlugin from './base-plugin.js';
   * class MyPlugin extends BasePlugin {
   * constructor(server, options, connectors) {
   * super(server, options, connectors);
   * this.onTeamKill = this.onTeamKill.bind(this); // Do this when you need to call your function through `this.server`
   * this.bmClient = this.options.bmClient; // Simple alias
   * }
   * async mount() { this.server.on("TEAMKILL", this.onTeamKill); }
   * async onTeamKill(info) {
   * // Do nothing if the player kills themselves
   * if (!info.attacker) { return; }
   * const { attacker, victim, weapon } = info;
   * const data = attacker;
   * // Add a note to the ban
   * data.note = `${attacker.name} teamkilled ${victim.name} w/ ${weapon}`;
   * // null is permanent, "1d" is 1 day, "2d" is 2 days, etc.
   * const myBan = await this.bmClient.addToBanList(data, "Teamkilling", "1d", "{{reason}} {{timeLeft}}", "MyTeamKillBanList");
   * // We can even update the ban, you will need the ban id from created ban.
   * data.BAN_ID = myBan.id;
   * await this.bmClient.addToBanList(data, "Teamkilling and Disconnect", null, "{{reason}}", "MyTeamKillBanList");
   * }
   * };
   * export default MyPlugin;
   * ```
   */
  async addToBanList<I extends BanInput>(
    info: I = {},
    reason: string = '',
    expires: null | Date | string = null,
    template: string | '{{expires}} | {{reason}}' = '{{reason}} | {{timeLeft}}',
    banlist: string | 'default' = 'default'
  ): Promise<BanOutput>;

  /**
   * Fetch a Ban List
   */
  async getBanList(url: string | URL, banlist: string | 'default'): Promise<object | null>;

  /**
   * Make an HTTP request to the BattleMetrics servers
   * @param url Server URL that will be used for the request
   * @param method Request method to be used when making the request, defaults to `GET`
   * @param responseType Indicates the type of data that the server will respond with, defaults to `json`
   * @param extra Extra config options for making requests, defaults to `{}`
   *
   * [Axios reference](https://axios-http.com/docs/req_config)
   *
   * [BattleMetricsAPI reference](https://www.battlemetrics.com/developers/documentation)
   */
  async req(
    url: string | URL,
    method?: Method,
    responseType?: ResponseType,
    extra?: AxiosRequestConfig
  ): Promise<null | any>;

  setObj<A extends object, B extends object>(objA: A = {}, objB: B = {}): B;

  /**
   * Transforms banList Map to JSON format
   */
  toJSON<T extends Map<string, bList>>(data: T): null | T {}

  /**
   * Transforms banList Map to an Array
   */
  toArray<T extends Map<string, bList>>(data: T): null | T[][];

  // #region Console Logs
  dbg(...msg: any[]): void;

  err(...msg: string[]): void;

  log(...msg: string[]): void;

  /**
   * Type is not 100% accurate but it is the best I can do for now.
   */
  prettyPrint<Content extends string>(content: Content): `[BattleMetrics][${Content}][1]`;
  // #endregion
}

namespace BattleMetrics {
  export { BattleMetrics };
}

// export = BattleMetrics;
